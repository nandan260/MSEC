import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
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

export default function AcademicPerformanceView({ userRole }) {
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(6);
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

  const passed = data?.result_status === 'PASS' || !data?.result_status;

  return (
    <div className="page academics" data-qa="academics-screen">
      <div className="field">
        <label htmlFor="acad-sem">Semester</label>
        <select
          id="acad-sem"
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
        >
          {(data?.available_semesters || [selectedSemester]).map((s) => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {error && <ErrorCard error={error} onRetry={() => loadPerformance(selectedSemester)} />}

      <div className="stat-grid academics__stats">
        <div className="stat-tile academics__stat--lead">
          <strong>{data?.sgpa ?? '--'}</strong>
          <span>SGPA (Semester {selectedSemester})</span>
        </div>
        <div className="stat-tile academics__stat--lead">
          <strong>{data?.cgpa ?? '--'}</strong>
          <span>CGPA (all semesters)</span>
        </div>
        <div className="stat-tile">
          <strong>{data?.total_credits ?? 0}</strong>
          <span>Credits earned</span>
        </div>
        <div className="stat-tile">
          <strong>
            <span className={`pill pill--${passed ? 'good' : 'bad'}`}>{data?.result_status || 'PASS'}</span>
          </strong>
          <span>{data?.passed_subjects ?? 0} passed, {data?.failed_subjects ?? 0} backlogs</span>
        </div>
      </div>

      <h2 className="section-title">Subject marks (Semester {selectedSemester})</h2>
      {canEdit && <p className="academics__note">Faculty/Admin mode: marks can be edited.</p>}

      {loading && !data ? (
        <div className="empty-state">Loading marks...</div>
      ) : (
        <DataCards
          rows={data?.marks || []}
          keyOf={(m) => m.id}
          empty="No marks recorded for this semester"
          title={(m) => `${m.course_code}: ${m.course_title}`}
          value={(m) => <span className="pill pill--info">{m.grade}</span>}
          meta={[
            {
              label: 'Total',
              render: (m) => <span className="academics__total">{m.total_marks} / 100</span>,
            },
            { label: 'CIE', render: (m) => `${m.internal_marks + m.lab_marks} / 50 (IA ${m.internal_marks}/30, Lab ${m.lab_marks}/20)` },
            { label: 'SEE', render: (m) => `${m.external_marks} / 50` },
            { label: 'Credits', render: (m) => m.credits },
            {
              label: 'Result',
              render: (m) => <span className={`pill pill--${m.status === 'Pass' ? 'good' : 'bad'}`}>{m.status}</span>,
            },
            {
              label: canEdit ? 'Action' : '',
              render: (m) =>
                canEdit ? (
                  <button type="button" className="btn" onClick={() => openEditModal(m)}>
                    Edit Marks
                  </button>
                ) : null,
            },
          ]}
        />
      )}

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
