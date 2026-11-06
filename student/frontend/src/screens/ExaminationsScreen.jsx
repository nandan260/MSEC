import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import './examinations.css';

export default function ExaminationsView({ userRole }) {
  const [data, setData] = useState(null);
  const [revaluations, setRevaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Failure of a publish/apply action, with the action to retry.
  const [actionError, setActionError] = useState(null);
  const requestId = useRef(0);

  // Revaluation application form
  const [revalCourse, setRevalCourse] = useState('CS601');
  const [revalType, setRevalType] = useState('Re-evaluation');
  const [revalMsg, setRevalMsg] = useState('');

  const loadExams = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    return Promise.all([
      apiRequest('/examinations'),
      apiRequest('/examinations/revaluation')
    ]).then(([examRes, revalRes]) => {
      if (id !== requestId.current) return;
      setData(examRes);
      setRevaluations(revalRes.revaluations || []);
    }).catch((err) => {
      if (id === requestId.current) setError(err);
    }).finally(() => {
      if (id === requestId.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadExams();
    return () => {
      requestId.current += 1;
    };
  }, [loadExams]);

  const handleTogglePublish = async () => {
    setActionError(null);
    const current = data?.hall_ticket?.is_published;
    const nextStatus = current === 1 ? 0 : 1;
    try {
      const res = await apiRequest('/examinations/hall-ticket/publish', {
        method: 'POST',
        body: JSON.stringify({ is_published: nextStatus })
      });
      alert(res.message);
      loadExams();
    } catch (err) {
      setActionError({ error: err, retry: handleTogglePublish });
    }
  };

  const handleApplyReval = async (e) => {
    e?.preventDefault();
    setRevalMsg('');
    setActionError(null);
    try {
      const res = await apiRequest('/examinations/revaluation', {
        method: 'POST',
        body: JSON.stringify({
          course_code: revalCourse,
          application_type: revalType
        })
      });
      setRevalMsg(res.message);
      loadExams();
    } catch (err) {
      setActionError({ error: err, retry: handleApplyReval });
    }
  };

  const exams = data?.examinations || [];
  const hallTicket = data?.hall_ticket;
  const reg = data?.registration;
  const published = hallTicket?.is_published === 1;

  if (error && !data) {
    return (
      <div className="page exams" data-qa="examinations-screen">
        <ErrorCard error={error} onRetry={loadExams} />
      </div>
    );
  }

  return (
    <div className="page exams" data-qa="examinations-screen">
      {error && <ErrorCard error={error} onRetry={loadExams} />}
      {actionError && <ErrorCard error={actionError.error} onRetry={actionError.retry} />}

      {(userRole === 'admin' || published) && (
        <div className="exams__bar">
          {userRole === 'admin' && (
            <button type="button" className="btn btn-primary" onClick={handleTogglePublish}>
              {published ? 'Admin: Unpublish Hall Tickets' : 'Admin: Publish Hall Tickets'}
            </button>
          )}
          {published && (
            <button type="button" className="btn" onClick={() => window.print()}>
              Print Hall Ticket
            </button>
          )}
        </div>
      )}

      {/* Hall Ticket & Candidate Registration Card */}
      <div className="card exams__ticket">
        <div className="exams__ticket-head">
          <h2 className="section-title">Examination Hall Ticket Permit</h2>
          <span className={`pill pill--${published ? 'good' : 'bad'}`}>
            {published ? 'Official Admit Card Released' : 'Not Yet Published'}
          </span>
        </div>
        {published ? (
          <>
            <div>
              <p className="exams__board">COLLEGE EXAMINATIONS BOARD</p>
              <p className="exams__cycle">{hallTicket.exam_cycle}</p>
            </div>
            <span className="pill pill--good">SEALED PERMIT</span>
            <dl className="data-card-meta">
              <div><dt>Candidate Name</dt><dd>{reg?.candidate_name}</dd></div>
              <div><dt>University Seat No</dt><dd>{reg?.usn}</dd></div>
              <div><dt>Department</dt><dd>{reg?.department}</dd></div>
              <div><dt>Semester</dt><dd>Semester {reg?.semester}</dd></div>
              <div><dt>Examination Center</dt><dd>{reg?.exam_center}</dd></div>
              <div><dt>Allotment Status</dt><dd>{reg?.seat_status}</dd></div>
            </dl>
            <p className="exams__barcode">BARCODE: ||| | |||| || |||||| | |||||</p>
            <button type="button" className="btn" onClick={() => window.print()}>
              Download Admit Card PDF
            </button>
          </>
        ) : (
          <p className="exams__notice">
            Hall tickets are currently not published by the Administration Office. Contact Examination Cell if you have eligible attendance.
          </p>
        )}
      </div>

      {/* Apply for Revaluation */}
      <form className="card exams__form" onSubmit={handleApplyReval}>
        <h2 className="section-title">Revaluation & Script Photocopy Request</h2>
        {revalMsg && <div className="pill pill--good" role="status">{revalMsg}</div>}
        <div className="field">
          <label htmlFor="exam-reval-course">Select Course for Review</label>
          <select id="exam-reval-course" value={revalCourse} onChange={(e) => setRevalCourse(e.target.value)}>
            {exams.map((ex) => (
              <option key={ex.course_code} value={ex.course_code}>
                {ex.course_code}: {ex.course_title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="exam-reval-type">Application Type</label>
          <select id="exam-reval-type" value={revalType} onChange={(e) => setRevalType(e.target.value)}>
            <option value="Re-evaluation">Full Board Re-evaluation (₹750)</option>
            <option value="Photocopy">Answer Script Photocopy (₹350)</option>
            <option value="Both">Combo: Photocopy + Re-evaluation (₹1,000)</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Submit Revaluation Application</button>
      </form>

      {/* Examination Timetable */}
      <h2 className="section-title">Theory Examination Time Table</h2>
      {loading && !data ? (
        <div className="empty-state">Loading examination schedule...</div>
      ) : (
        <DataCards
          rows={exams}
          keyOf={(ex) => ex.id}
          empty="No examinations scheduled"
          title={(ex) => `${ex.course_code}: ${ex.course_title}`}
          value={(ex) => <span className="pill pill--info">{ex.exam_date}</span>}
          meta={[
            { label: 'Time', render: (ex) => `${ex.start_time} - ${ex.end_time}` },
            { label: 'Hall', render: (ex) => ex.exam_hall },
            { label: 'Seat', render: (ex) => ex.seat_number },
          ]}
        />
      )}

      {/* Submitted Revaluation Applications */}
      <h2 className="section-title">Revaluation Application Status Tracker</h2>
      <DataCards
        rows={revaluations}
        keyOf={(r) => r.id}
        empty="No revaluation applications yet"
        title={(r) => `${r.course_code}: ${r.application_type}`}
        value={(r) => <span className={`pill pill--${r.status === 'Verified' ? 'good' : 'warn'}`}>{r.status}</span>}
        meta={[
          { label: 'USN', render: (r) => r.usn },
          { label: 'Fee', render: (r) => <span className="pill pill--good">{r.fee_status}</span> },
          { label: 'Remarks', render: (r) => r.remarks || 'Verification in progress.' },
          { label: 'Filed', render: (r) => r.applied_date },
        ]}
      />
    </div>
  );
}
