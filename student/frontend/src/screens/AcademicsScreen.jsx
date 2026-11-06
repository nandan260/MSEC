import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import { Icon } from '../components/Shell/icons';
import SavedRecordNotice from '../components/SavedRecordNotice';
import ErrorCard from '../components/ErrorCard';
import './shared.css';
import './academics.css';

const gradeFor = (total) => {
  if (total >= 90) return 'O';
  if (total >= 80) return 'A+';
  if (total >= 70) return 'A';
  if (total >= 60) return 'B+';
  if (total >= 55) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'P';
  return 'F';
};

export default function AcademicPerformanceView({ userRole, initialSemester }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || 6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMark, setEditingMark] = useState(null);
  const [formInternal, setFormInternal] = useState(0);
  const [formLab, setFormLab] = useState(0);
  const [formExternal, setFormExternal] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const dialogRef = useRef(null);
  const canEdit = userRole === 'faculty' || userRole === 'admin';

  const loadPerformance = useCallback((sem) => {
    setLoading(true);
    setError(null);
    return apiRequest(`/academics/performance?semester=${sem}`)
      .then((res) => {
        setData(res);
        setSelectedSemester(res.selected_semester);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let live = true;
    apiRequest('/gpa/history').then((res) => {
      if (live) setHistory([...(res?.history || [])].sort((a, b) => a.semester - b.semester));
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    loadPerformance(selectedSemester);
  }, [selectedSemester, loadPerformance]);

  useEffect(() => {
    if (!editingMark) return undefined;
    dialogRef.current?.querySelector('input,select')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setEditingMark(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingMark]);

  const openEditModal = (mark) => {
    setEditingMark(mark);
    setFormInternal(mark.internal_marks);
    setFormLab(mark.lab_marks);
    setFormExternal(mark.external_marks);
    setEditError('');
    setEditSuccess('');
  };

  const handleUpdateMarks = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    try {
      const res = await apiRequest(`/academics/marks/${editingMark.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          internal_marks: parseInt(formInternal, 10),
          lab_marks: parseInt(formLab, 10),
          external_marks: parseInt(formExternal, 10),
        }),
      });
      setEditSuccess(res.message);
      setTimeout(() => {
        setEditingMark(null);
        loadPerformance(selectedSemester);
      }, 800);
    } catch (err) {
      setEditError(err.message);
    }
  };

  const previewTotal = parseInt(formInternal || 0, 10) + parseInt(formLab || 0, 10) + parseInt(formExternal || 0, 10);
  const previewGrade = gradeFor(previewTotal);

  if (error && !data) {
    return (
      <div className="page academics" data-qa="academics-screen">
        <ErrorCard error={error} onRetry={() => loadPerformance(selectedSemester)} />
      </div>
    );
  }

  const last = history.at(-1);
  const previous = history.at(-2);
  const delta = last && previous && Number.isFinite(last.cumulative_cgpa) && Number.isFinite(previous.cumulative_cgpa)
    ? last.cumulative_cgpa - previous.cumulative_cgpa : null;

  return (
    <div className="page academics" data-qa="academics-screen">
      <SavedRecordNotice endpoint={`/academics/performance?semester=${selectedSemester}`} />
      {error && <ErrorCard error={error} onRetry={() => loadPerformance(selectedSemester)} />}
      <section className="academics__overview" aria-label="Academic overview">
        <div className="academics__overview-top">
          <div><span>CGPA</span><strong>{data?.cgpa ?? '—'}</strong></div>
          {delta !== null && <span className={`academics__delta ink-${delta < 0 ? 'bad' : 'good'}`}><Icon name="trend" size={14} />{delta >= 0 ? '+' : ''}{delta.toFixed(2)}</span>}
        </div>
        {!!history.length && <div className="academics__chart" aria-label="SGPA by semester">
          {history.map((s) => <div key={s.semester} className="academics__bar-column">
            <span>{s.sgpa}</span><div className={`academics__bar${s.semester === selectedSemester ? ' is-selected' : ''}`} style={{ height: `${Math.max(4, Math.min(10, Number(s.sgpa) || 0) * 10)}px` }} /><span>S{s.semester}</span>
          </div>)}
        </div>}
        {!history.length && <p className="academics__note">Semester history will appear here when available.</p>}
      </section>
      <section className="academics__subjects">
        <div className="academics__semester-head">
          <label className="visually-hidden" htmlFor="acad-sem">Semester</label>
          <select id="acad-sem" aria-label="Semester" value={selectedSemester} onChange={(e) => setSelectedSemester(Number(e.target.value))}>
            {(data?.available_semesters || [selectedSemester]).map((s) => <option value={s} key={s}>Semester {s}</option>)}
          </select>
          <span>SGPA <strong>{data?.sgpa ?? '—'}</strong></span>
        </div>
        {canEdit && <p className="academics__note">Faculty/Admin mode: marks can be edited.</p>}
        {loading && !data ? <div className="empty-state">Loading marks...</div> : <div className="reference-list">
          {(data?.marks || []).map((m) => <div className="grade-entry" key={m.id}>
            <details>
              <summary className="grade-entry__row">
                <span className={`grade-entry__grade${m.status === 'Fail' ? ' grade-entry__grade--fail' : ''}`}>{m.grade}</span>
                <span className="reference-list__text"><strong>{m.course_title}</strong><span>{m.course_code} · {m.credits} credits</span></span>
                <strong className="grade-entry__marks">{m.total_marks}</strong>
              </summary>
              <div className="grade-entry__details">
                <span>{m.total_marks} / 100</span>
                <span>CIE {m.internal_marks + m.lab_marks} / 50 (IA {m.internal_marks}/30, Lab {m.lab_marks}/20)</span>
                <span>SEE <span>{m.external_marks} / 50</span></span>
                <span className={`pill pill--${m.status === 'Pass' ? 'good' : 'bad'}`}>{m.status}</span>
              </div>
            </details>
            {canEdit && <button type="button" className="btn" onClick={() => openEditModal(m)}>Edit Marks</button>}
          </div>)}
          {!data?.marks?.length && <p className="empty-state">No marks recorded for this semester</p>}
        </div>}
      </section>

      {editingMark && (
        <div className="sheet-scrim" role="dialog" aria-modal="true" aria-label={`Update marks ${editingMark.course_code}`}>
          <form ref={dialogRef} className="card sheet" onSubmit={handleUpdateMarks}>
            <h2 className="section-title">Update Marks: {editingMark.course_code}</h2>
            <p className="academics__note">
              {editingMark.course_title} (Credits: {editingMark.credits})
            </p>
            {editError && <div className="pill pill--bad" role="alert">{editError}</div>}
            {editSuccess && <div className="pill pill--good">{editSuccess}</div>}
            <div className="field">
              <label htmlFor="acad-ia">Internal (IA1 + IA2), max 30</label>
              <input id="acad-ia" type="number" min="0" max="30" required value={formInternal} onChange={(e) => setFormInternal(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="acad-lab">Lab / Practical, max 20</label>
              <input id="acad-lab" type="number" min="0" max="20" required value={formLab} onChange={(e) => setFormLab(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="acad-see">Semester End Exam (SEE), max 50</label>
              <input id="acad-see" type="number" min="0" max="50" required value={formExternal} onChange={(e) => setFormExternal(e.target.value)} />
            </div>
            <div className="stat-tile">
              <strong>{previewTotal} / 100</strong>
              <span>
                Projected grade {previewGrade} ({previewTotal >= 40 && formExternal >= 18 ? 'Pass' : 'Fail'})
              </span>
            </div>
            <div className="sheet-actions">
              <button type="submit" className="btn btn-primary">Save Updated Marks</button>
              <button type="button" className="btn" onClick={() => setEditingMark(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
