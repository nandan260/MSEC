import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import './gpa.css';

const GRADE_SCALE = [
  { grade: 'O', points: 10.0, label: 'O - Outstanding (10)' },
  { grade: 'A+', points: 9.0, label: 'A+ - Excellent (9)' },
  { grade: 'A', points: 8.0, label: 'A - Very Good (8)' },
  { grade: 'B+', points: 7.0, label: 'B+ - Good (7)' },
  { grade: 'B', points: 6.0, label: 'B - Above Average (6)' },
  { grade: 'C', points: 5.0, label: 'C - Average (5)' },
  { grade: 'P', points: 4.0, label: 'P - Pass (4)' },
  { grade: 'F', points: 0.0, label: 'F - Fail (0)' }
];

const SCALE_ROWS = [
  { grade: 'O', points: '10.0', band: '90 - 100', desc: 'Outstanding' },
  { grade: 'A+', points: '9.0', band: '80 - 89', desc: 'Excellent' },
  { grade: 'A', points: '8.0', band: '70 - 79', desc: 'Very Good' },
  { grade: 'B+', points: '7.0', band: '60 - 69', desc: 'Good' },
  { grade: 'B', points: '6.0', band: '55 - 59', desc: 'Above Average' },
  { grade: 'C', points: '5.0', band: '50 - 54', desc: 'Average' },
  { grade: 'P', points: '4.0', band: '40 - 49', desc: 'Pass' },
  { grade: 'F', points: '0.0', band: '< 40', desc: 'Fail' },
];

const TABS = [
  { id: 'sgpa', label: 'SGPA' },
  { id: 'cgpa', label: 'CGPA' },
  { id: 'history', label: 'History' },
];

export default function GpaCalculatorView() {
  const [activeTab, setActiveTab] = useState('sgpa'); // 'sgpa' | 'cgpa' | 'history'
  const [selectedSemester, setSelectedSemester] = useState(6);
  const [courses, setCourses] = useState([
    { name: 'Distributed Systems', credits: 4, grade: 'O', grade_point: 10 },
    { name: 'Machine Learning', credits: 4, grade: 'O', grade_point: 10 },
    { name: 'Compiler Design', credits: 4, grade: 'A+', grade_point: 9 },
    { name: 'Cloud Architecture & DevOps', credits: 3, grade: 'A+', grade_point: 9 },
    { name: 'Information & Cyber Security', credits: 3, grade: 'O', grade_point: 10 },
    { name: 'Capstone Project Phase-I', credits: 4, grade: 'O', grade_point: 10 }
  ]);
  const [sgpaResult, setSgpaResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [overallCgpa, setOverallCgpa] = useState(0.0);
  const [totalCreditsEarned, setTotalCreditsEarned] = useState(0.0);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  // CGPA Tab State
  const [cgpaRows, setCgpaRows] = useState([
    { semester: 1, credits: 20, sgpa: 9.50 },
    { semester: 2, credits: 20, sgpa: 9.15 },
    { semester: 3, credits: 22, sgpa: 9.00 },
    { semester: 4, credits: 22, sgpa: 9.32 },
    { semester: 5, credits: 22, sgpa: 9.50 },
    { semester: 6, credits: 22, sgpa: 9.68 }
  ]);
  const [cgpaResult, setCgpaResult] = useState(null);
  const [targetGoal, setTargetGoal] = useState(9.40);
  const [remainingCredits, setRemainingCredits] = useState(40);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    setHistoryError(null);
    try {
      const res = await apiRequest('/gpa/history');
      setHistory(res.history || []);
      setOverallCgpa(res.overall_cgpa || 0.0);
      setTotalCreditsEarned(res.total_credits_earned || 0.0);
      if (res.history && res.history.length > 0) {
        setCgpaRows(res.history.map(h => ({
          semester: h.semester,
          credits: h.total_credits,
          sgpa: h.sgpa
        })));
      }
    } catch (err) {
      setHistoryError(err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addCourseRow = () => {
    setCourses([...courses, { name: '', credits: 3, grade: 'A', grade_point: 8 }]);
  };

  const updateCourse = (index, field, value) => {
    const updated = [...courses];
    updated[index] = { ...updated[index] };
    if (field === 'grade') {
      const found = GRADE_SCALE.find(g => g.grade === value);
      updated[index].grade = value;
      if (found) updated[index].grade_point = found.points;
    } else if (field === 'grade_point') {
      const num = parseFloat(value);
      updated[index].grade_point = isNaN(num) ? 0 : num;
    } else if (field === 'credits') {
      const num = parseFloat(value);
      updated[index].credits = isNaN(num) ? '' : num;
    } else {
      updated[index][field] = value;
    }
    setCourses(updated);
  };

  const removeCourseRow = (index) => {
    if (courses.length <= 1) {
      setError('At least one course must remain in the semester calculation.');
      return;
    }
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleComputeSgpa = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setMessage('');

    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      if (!c.credits || c.credits <= 0) {
        setError(`Please enter valid positive credits for course #${i + 1}.`);
        return;
      }
      if (c.grade_point === undefined || c.grade_point < 0 || c.grade_point > 10) {
        setError(`Grade point for course #${i + 1} must be between 0 and 10.`);
        return;
      }
    }

    try {
      setLoading(true);
      const res = await apiRequest('/gpa/calculate-sgpa', {
        method: 'POST',
        body: JSON.stringify({ courses })
      });
      setSgpaResult(res);
    } catch (err) {
      setError(err.message || 'Failed to calculate SGPA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const res = await apiRequest('/gpa/save-semester', {
        method: 'POST',
        body: JSON.stringify({
          semester: parseInt(selectedSemester, 10),
          courses
        })
      });
      setMessage(res.message);
      await fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to save semester record.');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSemesterIntoForm = (sem) => {
    const record = history.find(h => h.semester === sem);
    if (record && record.subjects && record.subjects.length > 0) {
      setCourses(record.subjects.map(s => ({
        name: s.subject_name,
        credits: s.credits,
        grade: s.letter_grade || 'A',
        grade_point: s.grade_point
      })));
      setSelectedSemester(sem);
      setActiveTab('sgpa');
      setMessage(`Loaded saved Semester ${sem} records into form.`);
    } else {
      setError(`No saved subjects found for Semester ${sem}.`);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Delete this semester record from academic history?')) return;
    try {
      await apiRequest(`/gpa/history/${id}`, { method: 'DELETE' });
      await fetchHistory();
      setMessage('Semester record removed from academic history.');
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
    }
  };

  // CGPA Tab Methods
  const addCgpaRow = () => {
    const nextSem = cgpaRows.length + 1;
    setCgpaRows([...cgpaRows, { semester: nextSem, credits: 20, sgpa: 9.0 }]);
  };

  const updateCgpaRow = (index, field, value) => {
    const updated = [...cgpaRows];
    updated[index] = { ...updated[index] };
    updated[index][field] = parseFloat(value) || 0;
    setCgpaRows(updated);
  };

  const removeCgpaRow = (index) => {
    if (cgpaRows.length <= 1) return;
    setCgpaRows(cgpaRows.filter((_, i) => i !== index));
  };

  const handleComputeCgpa = async () => {
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/gpa/calculate-cgpa', {
        method: 'POST',
        body: JSON.stringify({ semesters: cgpaRows })
      });
      setCgpaResult(res);
    } catch (err) {
      setError(err.message || 'Failed to calculate CGPA.');
    } finally {
      setLoading(false);
    }
  };

  const totalFormCredits = courses.reduce((acc, c) => acc + (parseFloat(c.credits) || 0), 0);
  const totalFormCreditPoints = courses.reduce((acc, c) => acc + ((parseFloat(c.credits) || 0) * (parseFloat(c.grade_point) || 0)), 0);
  const liveSgpa = totalFormCredits > 0 ? (totalFormCreditPoints / totalFormCredits).toFixed(2) : '0.00';

  const currentTotalCredits = cgpaRows.reduce((acc, r) => acc + (r.credits || 0), 0);
  const currentTotalPoints = cgpaRows.reduce((acc, r) => acc + ((r.credits || 0) * (r.sgpa || 0)), 0);
  const targetTotalCredits = currentTotalCredits + parseFloat(remainingCredits || 0);
  const neededTotalPoints = (parseFloat(targetGoal || 0) * targetTotalCredits) - currentTotalPoints;
  const neededSgpa = remainingCredits > 0 ? (neededTotalPoints / remainingCredits).toFixed(2) : 'N/A';

  const gradeScale = (
    <details className="card gpa__scale">
      <summary>Institutional Grading Scale</summary>
      <DataCards
        rows={SCALE_ROWS}
        keyOf={(r) => r.grade}
        title={(r) => `${r.grade} - ${r.desc}`}
        value={(r) => <span className="pill pill--info">{r.points} pts</span>}
        meta={[{ label: 'Marks band', render: (r) => r.band }]}
      />
    </details>
  );

  return (
    <div className="page gpa" data-qa="gpa-screen">
      {message && <div className="pill pill--good gpa__msg" role="status">{message}</div>}
      {error && activeTab !== 'sgpa' && <div className="pill pill--bad gpa__msg" role="alert">{error}</div>}
      {historyError && <ErrorCard error={historyError} onRetry={fetchHistory} />}

      {/* Top Metrics Row */}
      <div className="stat-grid gpa__stats">
        <div className="stat-tile gpa__stat--lead">
          <strong>{overallCgpa}</strong>
          <span>Cumulative CGPA</span>
        </div>
        <div className="stat-tile">
          <strong>{totalCreditsEarned}</strong>
          <span>Credits earned (of 160)</span>
        </div>
        <div className="stat-tile">
          <strong>{history.length}</strong>
          <span>Semesters recorded</span>
        </div>
        <div className="stat-tile">
          <strong><span className="pill pill--good">Distinction</span></strong>
          <span>CGPA &gt;= 8.5 threshold met</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="gpa__tabs" role="group" aria-label="Calculator sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`gpa__tab${activeTab === t.id ? ' gpa__tab--on' : ''}`}
            aria-pressed={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            {t.id === 'history' ? `${t.label} (${history.length})` : t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SGPA CALCULATOR */}
      {activeTab === 'sgpa' && (
        <>
          <div className="card gpa__result">
            <p className="gpa__label">Semester {selectedSemester} Calculated SGPA</p>
            <p className="gpa__big">
              {sgpaResult ? sgpaResult.sgpa : liveSgpa} <small>/ 10.00</small>
            </p>
            <p className="gpa__note">
              Total Credits: <strong>{sgpaResult ? sgpaResult.total_credits : totalFormCredits}</strong> | Total Credit Points: <strong>{sgpaResult ? sgpaResult.total_credit_points : totalFormCreditPoints.toFixed(1)}</strong>
            </p>
            <p className="gpa__formula">
              {sgpaResult ? sgpaResult.formula : `SGPA = ${totalFormCreditPoints.toFixed(1)} / ${totalFormCredits} = ${liveSgpa}`}
            </p>
          </div>

          <h2 className="section-title">Subject-Wise Credit & Grade Inputs</h2>
          <div className="card gpa__row">
            <div className="field">
              <label htmlFor="gpa-sem">Semester</label>
              <select id="gpa-sem" value={selectedSemester} onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn" onClick={() => loadSavedSemesterIntoForm(selectedSemester)}>
              Load Saved Data
            </button>
          </div>

          {courses.map((c, i) => (
            <div className="card gpa__row" key={i}>
              <div className="field">
                <label htmlFor={`gpa-name-${i}`}>Subject {i + 1}</label>
                <input
                  id={`gpa-name-${i}`}
                  type="text"
                  placeholder={`e.g. Subject ${i + 1}`}
                  value={c.name}
                  onChange={(e) => updateCourse(i, 'name', e.target.value)}
                />
              </div>
              <div className="gpa__pair gpa__pair--stack">
                <div className="field">
                  <label htmlFor={`gpa-credits-${i}`}>Credits</label>
                  <input
                    id={`gpa-credits-${i}`}
                    type="number"
                    min="1"
                    max="8"
                    step="0.5"
                    value={c.credits}
                    onChange={(e) => updateCourse(i, 'credits', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`gpa-grade-${i}`}>Grade</label>
                  <select id={`gpa-grade-${i}`} value={c.grade} onChange={(e) => updateCourse(i, 'grade', e.target.value)}>
                    {GRADE_SCALE.map(g => (
                      <option key={g.grade} value={g.grade}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="gpa__foot">
                <span className="gpa__points">
                  {((parseFloat(c.credits) || 0) * (parseFloat(c.grade_point) || 0)).toFixed(1)} <small>points</small>
                </span>
                <button type="button" className="btn" onClick={() => removeCourseRow(i)} aria-label={`Remove subject ${i + 1}`}>
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn" onClick={addCourseRow}>+ Add Subject</button>
          {gradeScale}

          <div className="sticky-actions gpa__sticky">
            {error && <div className="pill pill--bad gpa__msg" role="alert">{error}</div>}
            <button type="button" className="btn btn-primary" onClick={handleComputeSgpa} disabled={loading}>
              {loading ? 'Computing...' : 'Calculate SGPA'}
            </button>
            <button type="button" className="btn" onClick={handleSaveToHistory} disabled={loading}>
              Save to History
            </button>
          </div>
        </>
      )}

      {/* TAB 2: CUMULATIVE CGPA CALCULATOR */}
      {activeTab === 'cgpa' && (
        <>
          <div className="card gpa__result">
            <p className="gpa__label">Cumulative Grade Point Average (CGPA)</p>
            <p className="gpa__big">
              {cgpaResult ? cgpaResult.cgpa : (currentTotalCredits > 0 ? (currentTotalPoints / currentTotalCredits).toFixed(2) : '0.00')} <small>/ 10.00</small>
            </p>
            <p className="gpa__note">
              Total Credits Across Semesters: <strong>{currentTotalCredits}</strong> | Sum of Grade Points: <strong>{currentTotalPoints.toFixed(2)}</strong>
            </p>
            <p className="gpa__formula">
              {cgpaResult ? cgpaResult.formula : `CGPA = ${currentTotalPoints.toFixed(2)} / ${currentTotalCredits} = ${(currentTotalPoints / currentTotalCredits).toFixed(2)}`}
            </p>
          </div>

          <h2 className="section-title">Semester-Wise Credits & SGPA Inputs</h2>
          {cgpaRows.map((r, i) => (
            <div className="card gpa__row" key={i}>
              <h3 className="section-title">Semester {r.semester}</h3>
              <div className="gpa__pair">
                <div className="field">
                  <label htmlFor={`gpa-cr-${i}`}>Total Credits</label>
                  <input
                    id={`gpa-cr-${i}`}
                    type="number"
                    min="1"
                    max="35"
                    value={r.credits}
                    onChange={(e) => updateCgpaRow(i, 'credits', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`gpa-sg-${i}`}>Semester SGPA</label>
                  <input
                    id={`gpa-sg-${i}`}
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={r.sgpa}
                    onChange={(e) => updateCgpaRow(i, 'sgpa', e.target.value)}
                  />
                </div>
              </div>
              <div className="gpa__foot">
                <span className="gpa__points">
                  {((r.credits || 0) * (r.sgpa || 0)).toFixed(2)} <small>credit points</small>
                </span>
                <button type="button" className="btn" onClick={() => removeCgpaRow(i)} aria-label={`Remove semester ${r.semester}`}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={addCgpaRow}>+ Add Semester</button>

          {/* Target CGPA Estimator */}
          <div className="card gpa__row">
            <h2 className="section-title">Target Graduation CGPA Estimator</h2>
            <div className="gpa__pair">
              <div className="field">
                <label htmlFor="gpa-goal">Desired Graduation CGPA</label>
                <input
                  id="gpa-goal"
                  type="number"
                  step="0.05"
                  min="6"
                  max="10"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="gpa-remaining">Remaining Future Credits</label>
                <input
                  id="gpa-remaining"
                  type="number"
                  min="1"
                  max="60"
                  value={remainingCredits}
                  onChange={(e) => setRemainingCredits(e.target.value)}
                />
              </div>
            </div>
            <p className="gpa__need">
              Required SGPA in remaining semesters to graduate with <strong>{targetGoal}</strong> CGPA:
            </p>
            <p className="gpa__big">{neededSgpa} <small>/ 10.00</small></p>
          </div>

          <p className="gpa__note">CGPA = Sum of (Semester Credit x Semester Grade Points) / Total Credits Across Semesters</p>

          <div className="sticky-actions">
            <button type="button" className="btn btn-primary" onClick={handleComputeCgpa} disabled={loading}>
              {loading ? 'Computing CGPA...' : 'Compute Cumulative CGPA'}
            </button>
          </div>
        </>
      )}

      {/* TAB 3: ACADEMIC HISTORY */}
      {activeTab === 'history' && (
        <>
          <h2 className="section-title">Official Academic History Ledger</h2>
          <DataCards
            rows={history}
            keyOf={(h) => h.id}
            empty="No academic history records found. Compute and save a semester above."
            title={(h) => `Semester ${h.semester}`}
            value={(h) => <span className="pill pill--good">SGPA {h.sgpa}</span>}
            meta={[
              { label: 'Cumulative CGPA', render: (h) => <strong className="gpa__points">{h.cumulative_cgpa}</strong> },
              { label: 'Credits', render: (h) => h.total_credits },
              { label: 'Credit points', render: (h) => h.total_credit_points },
              { label: 'Courses', render: (h) => `${h.subjects ? h.subjects.length : 0} Subjects` },
              {
                label: 'Actions',
                render: (h) => (
                  <div className="gpa__actions">
                    <button type="button" className="btn" onClick={() => setHistoryModal(h)}>View Breakdown</button>
                    <button type="button" className="btn" onClick={() => loadSavedSemesterIntoForm(h.semester)}>Load into Calculator</button>
                    <button type="button" className="btn gpa__delete" onClick={() => handleDeleteHistory(h.id)}>Delete</button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {/* Modal: View Previous Semester Breakdown */}
      {historyModal && (
        <Sheet title={`Semester ${historyModal.semester} Academic Breakdown`} onClose={() => setHistoryModal(null)}>
          <div className="stat-grid gpa__stats">
            <div className="stat-tile gpa__stat--lead"><strong>{historyModal.sgpa}</strong><span>Semester SGPA</span></div>
            <div className="stat-tile"><strong>{historyModal.total_credits}</strong><span>Total credits</span></div>
            <div className="stat-tile"><strong>{historyModal.total_credit_points}</strong><span>Credit points</span></div>
          </div>
          <DataCards
            rows={historyModal.subjects || []}
            title={(s) => s.subject_name}
            value={(s) => <span className="pill">{s.letter_grade || s.grade || 'A'}</span>}
            meta={[
              { label: 'Credits', render: (s) => s.credits },
              { label: 'Grade point', render: (s) => s.grade_point },
              { label: 'Credit points', render: (s) => ((s.credits || 0) * (s.grade_point || 0)).toFixed(1) },
            ]}
          />
          <div className="sticky-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                loadSavedSemesterIntoForm(historyModal.semester);
                setHistoryModal(null);
              }}
            >
              Load into Calculator
            </button>
            <button type="button" className="btn" onClick={() => setHistoryModal(null)}>Close</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
