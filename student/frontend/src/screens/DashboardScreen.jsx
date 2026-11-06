import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import AttendanceRing from '../components/AttendanceRing';
import SavedRecordNotice from '../components/SavedRecordNotice';
import { Icon } from '../components/Shell/icons';
import { useOnline } from '../useOnline';
import ErrorCard from '../components/ErrorCard';
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
  const online = useOnline();
  const [submitError, setSubmitError] = useState('');
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
      setSubmitError('');
      setSubmittingId(id);
      await apiRequest(`/assignments/${id}/submit`, { method: 'POST' });
      fetchSummary();
    } catch (err) {
      setSubmitError(err.message);
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
  const eligible = student.overall_attendance >= 75;

  return (
    <div className="page dashboard" data-qa="dashboard-screen">
      <SavedRecordNotice endpoint="/dashboard/summary" />
      <section className="dashboard__hero" aria-label={`Student summary for ${student.name}`}>
        <div className="dashboard__hero-top">
          <AttendanceRing value={student.overall_attendance} />
          <div className="dashboard__attendance-label"><span>Attendance</span>
            <span className={`pill pill--${eligible ? 'good' : 'bad'}`}><i />{eligible ? 'Eligible for exams' : 'Attendance shortage'}</span>
          </div>
        </div>
        <div className="dashboard__gpa">
          <div><span>SGPA</span><strong>{student.current_sgpa}</strong></div>
          <div><span>CGPA</span><strong>{student.cgpa}</strong></div>
        </div>
      </section>

      <section>
        <SectionHeader title="Exams" actionLabel="See all" onAction={go('examinations')} />
        <div className="dashboard__exams scroll-x">
          {(upcoming_examinations || []).map((exam) => {
            const date = new Date(`${exam.exam_date}T12:00:00`);
            const valid = !Number.isNaN(date.getTime());
            return <button type="button" key={exam.id} className="exam-preview" onClick={go('examinations')}>
              <div className="exam-preview__top">
                <div className="exam-preview__date"><span>{valid ? date.toLocaleDateString('en', { month: 'short' }) : 'TBA'}</span><strong>{valid ? date.getDate() : '—'}</strong></div>
                <div className="exam-preview__course"><span>{exam.course_code}</span><strong>{exam.course_title}</strong></div>
              </div>
              <div className="exam-preview__meta"><span><Icon name="clock" size={14} />{exam.start_time || 'Time TBA'}</span><span><Icon name="pin" size={14} />{exam.exam_hall || 'Hall TBA'}</span></div>
            </button>;
          })}
          {!upcoming_examinations?.length && <p className="empty-state">No upcoming examinations scheduled.</p>}
        </div>
      </section>

      <section>
        <SectionHeader title="Due soon" actionLabel="See all" onAction={go('assignments')} />
        {submitError && <p className="notice notice--bad" role="alert">{submitError}</p>}
        <div className="reference-list">
          {(pending_assignments || []).map((a) => <div className="assignment-preview" key={a.id}>
            <span className="assignment-preview__dot" />
            <div className="reference-list__text"><strong>{a.title}</strong><span>{a.course_code} · {a.deadline_date}</span></div>
            <button type="button" className="dashboard__submit" disabled={!online || submittingId === a.id} onClick={() => handleAssignmentSubmit(a.id)}>{submittingId === a.id ? 'Sending…' : 'Submit'}</button>
          </div>)}
          {!pending_assignments?.length && <p className="empty-state">All assignments have been submitted.</p>}
        </div>
      </section>

      <section>
        <SectionHeader title="Notices" />
        <div className="reference-list">
          {(recent_announcements || []).map((n) => <button key={n.id} type="button" className="notice-preview" onClick={go('notifications')}>
            <span className={`reference-icon${n.priority === 'High' ? ' reference-icon--accent' : ''}`}><Icon name="megaphone" size={20} /></span>
            <span className="reference-list__text"><strong>{n.title}</strong><span>{n.department} · {n.published_date}</span></span>
            <Icon name="chevron" size={16} />
          </button>)}
          {!recent_announcements?.length && <p className="empty-state">No current notices available.</p>}
        </div>
      </section>
    </div>
  );
}
