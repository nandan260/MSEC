import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
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
  const eligible = overall >= 75;

  return (
    <div className="page attendance" data-qa="attendance-screen">
      <div className="attendance__hero">
        <p className="attendance__hero-label">Overall attendance</p>
        <p className="attendance__hero-value">{overall}%</p>
        <span className={`pill pill--${eligible ? 'good' : 'bad'}`}>
          {eligible ? 'Eligible for Exams' : 'Below 75% - Not Eligible'}
        </span>
        <p className="attendance__hero-note">Minimum 75% required for exam eligibility</p>
      </div>

      <div className="stat-grid attendance__stats">
        <div className="stat-tile">
          <strong>{summary?.total_conducted || 0}</strong>
          <span>Conducted hrs</span>
        </div>
        <div className="stat-tile">
          <strong>{summary?.total_attended || 0}</strong>
          <span>Attended hrs</span>
        </div>
        <div className="stat-tile">
          <strong>{summary?.total_absent || 0}</strong>
          <span>Absent hrs</span>
        </div>
        <div className="stat-tile">
          <strong>{summary?.total_od || 0}</strong>
          <span>On-Duty hrs</span>
        </div>
      </div>

      <h2 className="section-title">Subject-wise attendance</h2>
      <DataCards
        rows={list}
        keyOf={(r) => r.id}
        empty="No attendance records yet"
        title={(r) => `${r.course_code}: ${r.course_title}`}
        value={(r) => <span className={`pill pill--${attendanceTone(r.percentage)}`}>{r.percentage}%</span>}
        meta={[
          { label: 'Attended', render: (r) => `${r.attended_hours} / ${r.total_hours} hrs` },
          { label: 'Absent', render: (r) => `${r.absent_hours} hrs` },
          { label: 'On-Duty', render: (r) => `${r.od_hours} hrs` },
          { label: 'Faculty', render: (r) => r.faculty_name },
          {
            label: 'Safe bunks',
            render: (r) => (r.percentage >= 75 ? `${r.safe_bunks} classes` : `Need ${r.needed_to_reach_75} consecutive`),
          },
          { label: 'Status', render: (r) => r.status },
        ]}
      />

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
