import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import './attendance.css';

export default function AttendanceCalculatorView() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [totalHours, setTotalHours] = useState(48);
  const [attendedHours, setAttendedHours] = useState(42);
  const [odHours, setOdHours] = useState(2);
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCalculation = async (total, attended, od, target, courseName) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/attendance/calculate', {
        method: 'POST',
        body: JSON.stringify({
          total_hours: parseInt(total, 10),
          attended_hours: parseInt(attended, 10),
          od_hours: parseInt(od, 10),
          target_percentage: parseFloat(target),
          course_name: courseName || 'Selected Subject',
        }),
      });
      setSimulation(res);
    } catch (err) {
      setError(err.message);
      setSimulation(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await apiRequest('/attendance');
      const att = res.attendance || [];
      setCourses(att);
      if (att.length > 0) {
        const first = att[0];
        setSelectedCourse(first.course_code);
        setTotalHours(first.total_hours);
        setAttendedHours(first.attended_hours);
        setOdHours(first.od_hours || 0);
        runCalculation(first.total_hours, first.attended_hours, first.od_hours || 0, 75, first.course_title);
      }
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCourseChange = (e) => {
    const code = e.target.value;
    setSelectedCourse(code);
    const found = courses.find((c) => c.course_code === code);
    if (found) {
      setTotalHours(found.total_hours);
      setAttendedHours(found.attended_hours);
      setOdHours(found.od_hours || 0);
      runCalculation(found.total_hours, found.attended_hours, found.od_hours || 0, targetPercentage, found.course_title);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const found = courses.find((c) => c.course_code === selectedCourse);
    runCalculation(totalHours, attendedHours, odHours, targetPercentage, found?.course_title || 'Subject');
  };

  if (loadError) {
    return (
      <div className="page attendance" data-qa="attendance_calc-screen">
        <ErrorCard error={loadError} onRetry={loadCourses} />
      </div>
    );
  }

  const eligible = simulation?.status === 'Eligible';
  const rows = simulation
    ? [
        { k: 'attended', label: 'Effective attended (regular + OD)', v: `${simulation.classes_attended} / ${simulation.total_conducted} hrs` },
        { k: 'current', label: 'Current attendance rate', v: `${simulation.current_percentage}%` },
        { k: 'target', label: 'Required target threshold', v: `${simulation.target_percentage}%` },
        { k: 'attend', label: 'Projected if you attend next class', v: `${simulation.projected_if_attend_one}%` },
        { k: 'miss', label: 'Projected if you miss next class', v: `${simulation.projected_if_miss_one}%` },
      ]
    : [];

  return (
    <div className="page attendance" data-qa="attendance_calc-screen">
      <form id="attendance-calc-form" className="card attendance__form" onSubmit={handleFormSubmit}>
        <h2 className="section-title">Simulation parameters</h2>
        {error && <div className="pill pill--bad" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="calc-course">Load from registered subject (optional)</label>
          <select id="calc-course" value={selectedCourse} onChange={handleCourseChange}>
            <option value="">-- Manual Custom Entry --</option>
            {courses.map((c) => (
              <option key={c.course_code} value={c.course_code}>
                {c.course_code}: {c.course_title} (Current: {c.percentage}%)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="calc-total">Total classes conducted</label>
          <input id="calc-total" type="number" inputMode="numeric" min="0" required value={totalHours} onChange={(e) => setTotalHours(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="calc-attended">Classes attended</label>
          <input id="calc-attended" type="number" inputMode="numeric" min="0" required value={attendedHours} onChange={(e) => setAttendedHours(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="calc-od">On-Duty (OD) approved classes</label>
          <input id="calc-od" type="number" inputMode="numeric" min="0" value={odHours} onChange={(e) => setOdHours(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="calc-target">Required compliance percentage (%)</label>
          <input id="calc-target" type="number" inputMode="decimal" min="1" max="100" step="0.5" required value={targetPercentage} onChange={(e) => setTargetPercentage(e.target.value)} />
        </div>
      </form>

      {simulation ? (
        <div className="card attendance__result" aria-live="polite">
          <span className={`pill pill--${eligible ? 'good' : 'bad'}`}>{simulation.current_percentage}% current</span>
          <p className="attendance-calc__headline">
            {eligible
              ? `${simulation.max_bunks} safe bunks remaining`
              : `Must attend next ${simulation.needed_classes} consecutive classes`}
          </p>
          <p className="attendance__result-msg">{simulation.message}</p>
          <DataCards rows={rows} keyOf={(r) => r.k} title={(r) => r.label} value={(r) => r.v} />
        </div>
      ) : (
        <div className="empty-state">Enter class numbers above to simulate projections.</div>
      )}

      <div className="sticky-actions">
        <button type="submit" form="attendance-calc-form" className="btn btn-primary" disabled={loading}>
          {loading ? 'Calculating...' : 'Run Attendance Simulation'}
        </button>
      </div>
    </div>
  );
}
