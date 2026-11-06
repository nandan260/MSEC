import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import { attendanceTone } from './shared';
import './dashboard.css';


function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="dashboard__section-head">
      <h2 className="section-title">{title}</h2>
      {onAction && (
        <button type="button" className="btn btn-ghost dashboard__link" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function DashboardHome({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest('/dashboard/summary');
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleAssignmentSubmit = async (id) => {
    try {
      setSubmittingId(id);
      await apiRequest(`/assignments/${id}/submit`, { method: 'POST' });
      fetchSummary();
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  const go = (id) => () => onNavigate?.(id);

  if (error) {
    return (
      <div className="page dashboard" data-qa="dashboard-screen">
        <ErrorCard error={error} onRetry={fetchSummary} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="page dashboard" data-qa="dashboard-screen">
        <div className="empty-state">Loading dashboard...</div>
      </div>
    );
  }

  const { student, upcoming_examinations, pending_assignments, recent_announcements } = data;
  const tone = attendanceTone(student.overall_attendance);
  const eligible = student.overall_attendance >= 75;

  return (
    <div className="page dashboard" data-qa="dashboard-screen">
      <section className="dashboard__hero" aria-label="Student summary">
        <p className="dashboard__greeting">Welcome back,</p>
        <h1 className="dashboard__name">{student.name}</h1>
        <p className="dashboard__meta">
          {student.usn} · {student.department} · Semester {student.semester}
        </p>
        <span className={`pill ${eligible ? 'pill--good' : 'pill--bad'}`}>
          {eligible ? 'Eligible for Exams' : 'Shortage Warning'}
        </span>
      </section>

      <div className="stat-grid dashboard__stats">
        <div className="stat-tile">
          <span>Attendance</span>
          <strong>{student.overall_attendance}%</strong>
          <span className={`pill pill--${tone} dashboard__tile-pill`}>
            {eligible ? 'Eligible' : 'Shortage'}
          </span>
        </div>
        <div className="stat-tile">
          <span>SGPA</span>
          <strong>{student.current_sgpa}</strong>
          <span>Current sem</span>
        </div>
        <div className="stat-tile">
          <span>CGPA</span>
          <strong>{student.cgpa}</strong>
          <span>Cumulative</span>
        </div>
      </div>

      <section>
        <SectionHeader title="Upcoming Examinations" actionLabel="View all" onAction={go('examinations')} />
        <DataCards
          rows={upcoming_examinations}
          keyOf={(r) => r.id}
          title={(r) => `${r.course_code} · ${r.course_title}`}
          value={(r) => r.exam_date}
          meta={[
            { label: 'Time', render: (r) => [r.start_time, r.end_time].filter(Boolean).join(' - ') },
            { label: 'Hall & Seat', render: (r) => (r.exam_hall ? `${r.exam_hall} (${r.seat_number})` : '') },
          ]}
          empty="No upcoming examinations scheduled."
        />
      </section>

      <section>
        <SectionHeader title="Pending Assignments" actionLabel="View all" onAction={go('assignments')} />
        <DataCards
          rows={pending_assignments}
          keyOf={(r) => r.id}
          title={(r) => `${r.course_code}: ${r.title}`}
          value={(r) => `${r.max_marks} pts`}
          meta={[
            { label: 'Due', render: (r) => r.deadline_date },
            {
              label: 'Action',
              render: (r) => (
                <button
                  type="button"
                  className="btn btn-primary dashboard__submit"
                  disabled={submittingId === r.id}
                  onClick={() => handleAssignmentSubmit(r.id)}
                >
                  Submit
                </button>
              ),
            },
          ]}
          empty="All assignments have been submitted."
        />
      </section>

      <section>
        <SectionHeader title="Announcements" actionLabel="Archive" onAction={go('notifications')} />
        <DataCards
          rows={recent_announcements}
          keyOf={(r) => r.id}
          title={(r) => r.title}
          value={(r) => (
            <span className={`pill ${r.priority === 'High' ? 'pill--bad' : ''}`}>{r.priority}</span>
          )}
          meta={[
            { label: 'Notice', render: (r) => r.content },
            { label: 'From', render: (r) => r.department },
            { label: 'Date', render: (r) => r.published_date },
          ]}
          empty="No current notices available."
        />
      </section>
    </div>
  );
}
