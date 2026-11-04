import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api';

export default function DashboardHome({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/dashboard/summary');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleAssignmentSubmit = async (id) => {
    try {
      await apiRequest(`/assignments/${id}/submit`, { method: 'POST' });
      fetchSummary();
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading dashboard data from server...</div>;
  }

  if (error) {
    return <div className="alert-box alert-danger">Error: {error}</div>;
  }

  const { student, upcoming_examinations, pending_assignments, recent_announcements } = data;

  return (
    <div className="dashboard-content">
      {/* Student Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">{student.name}</div>
          <div className="banner-sub">
            USN: {student.usn} | Department: {student.department} | Semester: {student.semester}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="status-pill status-success">Active Enrolled Student</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Overall Attendance</div>
          <div className="stat-value">{student.overall_attendance}%</div>
          <div className="stat-footer">
            {student.overall_attendance >= 75 ? (
              <span className="status-pill status-success">Eligible for Exams</span>
            ) : (
              <span className="status-pill status-danger">Shortage Warning</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Current SGPA</div>
          <div className="stat-value">{student.current_sgpa}</div>
          <div className="stat-footer">
            Cumulative CGPA: <strong>{student.cgpa}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Upcoming Exams</div>
          <div className="stat-value">{upcoming_examinations?.length || 0}</div>
          <div className="stat-footer">End-Semester Schedule</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Deadlines</div>
          <div className="stat-value">{pending_assignments?.length || 0}</div>
          <div className="stat-footer">Active Lab & Course Work</div>
        </div>
      </div>

      {/* Split Section: Exams and Assignments */}
      <div className="dashboard-sections-grid">
        {/* Upcoming Examinations Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Upcoming Examinations</h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('examinations', 'Examinations')}
            >
              View All
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Hall & Seat</th>
                </tr>
              </thead>
              <tbody>
                {upcoming_examinations?.length > 0 ? (
                  upcoming_examinations.map((exam) => (
                    <tr key={exam.id}>
                      <td>
                        <strong>{exam.course_code}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{exam.course_title}</div>
                      </td>
                      <td>{exam.exam_date}</td>
                      <td>{exam.time_slot}</td>
                      <td>{exam.exam_hall} ({exam.seat_number})</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>
                      No upcoming examinations scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Pending Assignments</h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('assignments', 'Assignments')}
            >
              View All
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course & Title</th>
                  <th>Due Date</th>
                  <th>Marks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending_assignments?.length > 0 ? (
                  pending_assignments.map((assig) => (
                    <tr key={assig.id}>
                      <td>
                        <strong>{assig.course_code}</strong>: {assig.title}
                      </td>
                      <td>{assig.due_date}</td>
                      <td>{assig.max_marks} pts</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleAssignmentSubmit(assig.id)}
                        >
                          Submit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>
                      All assignments have been submitted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="panel-card">
        <div className="panel-card-header">
          <h3 className="panel-card-title">Recent Announcements</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('notifications', 'Notifications')}
          >
            Announcement Archive
          </button>
        </div>
        <div className="panel-card-body">
          <ul className="item-list">
            {recent_announcements?.length > 0 ? (
              recent_announcements.map((item) => (
                <li key={item.id} className="list-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="list-item-title">{item.title}</span>
                    <span className={`status-pill ${item.priority === 'High' ? 'status-danger' : 'status-neutral'}`}>
                      {item.priority} Priority
                    </span>
                  </div>
                  <div className="list-item-desc">{item.content}</div>
                  <div className="list-item-meta">
                    Published by: {item.department} | Date: {item.published_date}
                  </div>
                </li>
              ))
            ) : (
              <li className="list-item">No current notices available.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
