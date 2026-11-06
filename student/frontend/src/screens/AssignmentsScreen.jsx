import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiUrl } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import './assignments.css';

const statusTone = (s) => (s === 'Submitted' ? 'good' : s === 'Late' ? 'bad' : 'warn');

export default function AssignmentsView({ userRole }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [uploadModalAssignment, setUploadModalAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');

  const [evaluateModalSubmission, setEvaluateModalSubmission] = useState(null);
  const [evalMarks, setEvalMarks] = useState(24);
  const [evalFeedback, setEvalFeedback] = useState('Clean implementation with complete tests.');

  const [createModal, setCreateModal] = useState(false);
  const [newCourse, setNewCourse] = useState('CS601');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('2026-11-20 23:59');
  const [newMarks, setNewMarks] = useState(25);

  // Error from the open dialog's submit, shown inside that dialog with a retry.
  const [dialogError, setDialogError] = useState(null);
  const requestId = useRef(0);

  const loadAssignments = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const url = selectedSubject === 'ALL' ? '/assignments' : `/assignments?subject=${selectedSubject}`;
    return apiRequest(url)
      .then((res) => {
        if (id === requestId.current) setAssignments(res.assignments || []);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [selectedSubject]);

  useEffect(() => {
    loadAssignments();
    return () => {
      requestId.current += 1;
    };
  }, [loadAssignments]);

  const closeDialogs = () => {
    setUploadModalAssignment(null);
    setEvaluateModalSubmission(null);
    setCreateModal(false);
    setDialogError(null);
  };

  const handleFileUpload = async (e) => {
    e?.preventDefault();
    setUploadMsg('');
    setDialogError(null);
    const formData = new FormData();
    if (selectedFile) formData.append('file', selectedFile);
    formData.append('student_name', 'Alex Kumar');

    try {
      const res = await fetch(apiUrl(`/api/assignments/${uploadModalAssignment.id}/upload`), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadMsg(data.message);
      setTimeout(() => {
        setUploadModalAssignment(null);
        setSelectedFile(null);
        loadAssignments();
      }, 900);
    } catch (err) {
      setDialogError(err);
    }
  };

  const handleCreateAssignment = async (e) => {
    e?.preventDefault();
    setDialogError(null);
    try {
      await apiRequest('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          course_code: newCourse,
          course_title: 'Course Term Work',
          title: newTitle,
          description: newDesc,
          deadline_date: newDeadline,
          max_marks: parseInt(newMarks, 10),
          created_by: 'Faculty Member'
        })
      });
    } catch (err) {
      setDialogError(err);
      return;
    }
    setCreateModal(false);
    setNewTitle('');
    setNewDesc('');
    loadAssignments();
  };

  const handleSaveEvaluation = async (e) => {
    e?.preventDefault();
    setDialogError(null);
    try {
      await apiRequest(`/assignments/${evaluateModalSubmission.id}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({
          scored_marks: parseInt(evalMarks, 10),
          feedback: evalFeedback,
          evaluated_by: 'Course Faculty'
        })
      });
    } catch (err) {
      setDialogError(err);
      return;
    }
    setEvaluateModalSubmission(null);
    loadAssignments();
  };

  const canCreate = userRole === 'faculty' || userRole === 'admin';

  return (
    <div className="page assignments" data-qa="assignments-screen">
      <div className="field">
        <label htmlFor="asg-subject">Subject</label>
        <select id="asg-subject" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
          <option value="ALL">All Subjects</option>
          <option value="CS601">CS601</option>
          <option value="CS602">CS602</option>
          <option value="CS603">CS603</option>
          <option value="CS604">CS604</option>
        </select>
      </div>

      {canCreate && (
        <button type="button" className="btn btn-primary" onClick={() => { setDialogError(null); setCreateModal(true); }}>
          + Create Assignment
        </button>
      )}

      {error && <ErrorCard error={error} onRetry={loadAssignments} />}

      <h2 className="section-title">Continuous Internal Evaluation Assignments</h2>

      {loading ? (
        <div className="empty-state">Loading assignments...</div>
      ) : error ? null : (
        <DataCards
          rows={assignments}
          keyOf={(a) => a.id}
          empty="No assignments found"
          title={(a) => `${a.course_code}: ${a.title}`}
          value={(a) => <span className={`pill pill--${statusTone(a.submission_status)}`}>{a.submission_status}</span>}
          meta={[
            { label: 'Details', render: (a) => a.description },
            { label: 'Deadline', render: (a) => a.deadline_date },
            { label: 'Max marks', render: (a) => `${a.max_marks} pts` },
            {
              label: 'Score',
              render: (a) =>
                a.scored_marks !== null ? (
                  <span>
                    <strong className="assignments__score">{a.scored_marks} / {a.max_marks}</strong>
                    <span className="assignments__feedback">"{a.feedback}"</span>
                  </span>
                ) : (
                  <span className="assignments__pending">Pending Evaluation</span>
                ),
            },
            {
              label: 'Action',
              render: (a) =>
                userRole === 'student' ? (
                  a.submission_status === 'Pending' || a.submission_status === 'Late' ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => { setUploadModalAssignment(a); setUploadMsg(''); setDialogError(null); }}
                    >
                      Upload File
                    </button>
                  ) : (
                    <span className="assignments__done">✓ Submitted</span>
                  )
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setEvaluateModalSubmission(a);
                      setEvalMarks(a.scored_marks || a.max_marks);
                      setEvalFeedback(a.feedback || 'Well prepared submission.');
                      setDialogError(null);
                    }}
                  >
                    Grade & Feedback
                  </button>
                ),
            },
          ]}
        />
      )}

      {/* Student Upload Modal */}
      {uploadModalAssignment && (
        <Sheet title="Upload Submission File" onClose={closeDialogs} onSubmit={handleFileUpload}>
          <p className="assignments__note">
            Assignment: <strong>{uploadModalAssignment.title}</strong> ({uploadModalAssignment.course_code})
          </p>
          {uploadMsg && <div className="pill pill--good" role="status">{uploadMsg}</div>}
          {dialogError && <ErrorCard error={dialogError} onRetry={handleFileUpload} />}
          <div className="field">
            <label htmlFor="asg-file">Select Document / Code Archive (PDF, ZIP, DOCX)</label>
            <input id="asg-file" type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary">Submit Deliverable</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {/* Faculty Create Assignment Modal */}
      {createModal && (
        <Sheet title="Create Course Assignment" onClose={closeDialogs} onSubmit={handleCreateAssignment}>
          {dialogError && <ErrorCard error={dialogError} onRetry={handleCreateAssignment} />}
          <div className="field">
            <label htmlFor="asg-course">Course Code</label>
            <select id="asg-course" value={newCourse} onChange={(e) => setNewCourse(e.target.value)}>
              <option value="CS601">CS601: Distributed Systems</option>
              <option value="CS602">CS602: Machine Learning</option>
              <option value="CS603">CS603: Compiler Design</option>
              <option value="CS604">CS604: Cloud Architecture</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="asg-title">Assignment Title</label>
            <input id="asg-title" type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="asg-desc">Description & Instructions</label>
            <textarea id="asg-desc" rows="3" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <div className="assignments__pair">
            <div className="field">
              <label htmlFor="asg-deadline">Submission Deadline</label>
              <input id="asg-deadline" type="text" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="asg-marks">Max Marks</label>
              <input id="asg-marks" type="number" min="5" max="100" value={newMarks} onChange={(e) => setNewMarks(e.target.value)} />
            </div>
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary">Publish Assignment</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {/* Faculty Evaluation Modal */}
      {evaluateModalSubmission && (
        <Sheet title={`Grade Submission: ${evaluateModalSubmission.course_code}`} onClose={closeDialogs} onSubmit={handleSaveEvaluation}>
          <p className="assignments__note">
            Assignment: <strong>{evaluateModalSubmission.title}</strong>
          </p>
          {dialogError && <ErrorCard error={dialogError} onRetry={handleSaveEvaluation} />}
          <div className="field">
            <label htmlFor="asg-eval-marks">Awarded Marks (Max: {evaluateModalSubmission.max_marks})</label>
            <input
              id="asg-eval-marks" type="number" min="0" max={evaluateModalSubmission.max_marks} required
              value={evalMarks} onChange={(e) => setEvalMarks(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="asg-eval-fb">Faculty Feedback & Comments</label>
            <textarea id="asg-eval-fb" rows="3" required value={evalFeedback} onChange={(e) => setEvalFeedback(e.target.value)} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary">Save Evaluation</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
