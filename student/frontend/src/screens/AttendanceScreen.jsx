import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import AttendanceRing from '../components/AttendanceRing';
import SavedRecordNotice from '../components/SavedRecordNotice';
import { Icon } from '../components/Shell/icons';
import ErrorCard from '../components/ErrorCard';
import { attendanceTone } from './shared';
import './attendance.css';

export default function AttendanceView({ userRole }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markCourse, setMarkCourse] = useState('CS601');
  const [markAction, setMarkAction] = useState('present');
  const [markDate, setMarkDate] = useState('Today');
  const [markMessage, setMarkMessage] = useState('');
  const [markLoading, setMarkLoading] = useState(false);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest('/attendance');
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setMarkMessage('');
    setMarkLoading(true);
    try {
      const res = await apiRequest('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ course_code: markCourse, action: markAction, date: markDate }),
      });
      setMarkMessage(res.message);
      loadAttendance();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setMarkLoading(false);
    }
  };

  if (error) {
    return (
      <div className="page attendance" data-qa="attendance-screen">
        <ErrorCard error={error} onRetry={loadAttendance} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="page attendance" data-qa="attendance-screen">
        <div className="empty-state">Loading attendance records...</div>
      </div>
    );
  }

  const summary = data?.overall_summary;
  const list = data?.attendance || [];
  const overall = summary?.overall_percentage || 0;

  return (
    <div className="page attendance" data-qa="attendance-screen">
      <SavedRecordNotice endpoint="/attendance" />
      <div className="attendance__hero">
        <AttendanceRing value={overall} large label="Overall" />
        <div className="attendance__totals">
          <div><strong>{summary?.total_attended || 0}</strong><span>Attended</span></div>
          <div><strong>{summary?.total_conducted || 0}</strong><span>Held</span></div>
          <div title="Sum of safe skips across subjects; check each subject before missing a class"><strong className="ink-good">+{list.reduce((sum, r) => sum + Math.max(0, Number(r.safe_bunks) || 0), 0)}</strong><span>Can skip</span></div>
        </div>
      </div>
      {list.some((r) => r.percentage < 75) && <div className="attendance__warning" role="status">
        <Icon name="alert" size={20} /><span><strong>{list.filter((r) => r.percentage < 75).map((r) => r.course_title).join(', ')}</strong> {list.filter((r) => r.percentage < 75).length === 1 ? 'is' : 'are'} below 75%</span>
      </div>}
      <section className="attendance__subjects">
        <h2 className="section-title">By subject</h2>
        <div className="reference-list">
          {list.map((r) => <details className="subject-attendance" key={r.id}>
            <summary>
              <div className="subject-attendance__row">
                <div className="reference-list__text"><strong>{r.course_title}</strong><span>{r.course_code} · {r.attended_hours}/{r.total_hours}{r.od_hours ? ` (+${r.od_hours} OD)` : ''}</span></div>
                <span className={`subject-attendance__percent ink-${attendanceTone(r.percentage)}`}>{r.percentage}%</span>
              </div>
              <div className="subject-attendance__track" role="meter" aria-label={`${r.course_title} attendance`} aria-valuenow={r.percentage} aria-valuemin={0} aria-valuemax={100}><span className={`fill-${attendanceTone(r.percentage)}`} style={{ width: `${Math.max(0, Math.min(100, r.percentage))}%` }} /></div>
            </summary>
            <div className="subject-attendance__details"><span>{r.faculty_name}</span><span>{r.absent_hours} absent · {r.od_hours} on duty</span><span>{r.percentage >= 75 ? `${r.safe_bunks} safe skips` : `Need ${r.needed_to_reach_75} consecutive classes`}</span></div>
          </details>)}
          {!list.length && <p className="empty-state">No attendance records yet</p>}
        </div>
      </section>

      {(userRole === 'faculty' || userRole === 'admin') && (
        <form className="card attendance__mark" onSubmit={handleMarkAttendance}>
          <h2 className="section-title">Faculty Portal: Mark Class Session Attendance</h2>
          {markMessage && <div className="pill pill--good">{markMessage}</div>}
          <div className="field">
            <label htmlFor="att-course">Course</label>
            <select id="att-course" value={markCourse} onChange={(e) => setMarkCourse(e.target.value)}>
              {list.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code}: {c.course_title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="att-date">Date</label>
            <input id="att-date" type="text" value={markDate} onChange={(e) => setMarkDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="att-status">Status</label>
            <select id="att-status" value={markAction} onChange={(e) => setMarkAction(e.target.value)}>
              <option value="present">Present (+1 Attended)</option>
              <option value="absent">Absent (+1 Absent)</option>
              <option value="od">On-Duty (+1 OD)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={markLoading}>
            {markLoading ? 'Logging...' : 'Log Session Attendance'}
          </button>
        </form>
      )}
    </div>
  );
}
