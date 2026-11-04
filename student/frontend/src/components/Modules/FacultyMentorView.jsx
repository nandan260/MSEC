import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';

export default function FacultyMentorView({ userRole = 'student', currentUser = null }) {
  const [activeSubTab, setActiveSubTab] = useState('assigned_mentor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Mentor Profile & Assigned Data
  const [mentorData, setMentorData] = useState(null);
  const [menteesList, setMenteesList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(1);

  // 2. Direct Messages Data
  const [messages, setMessages] = useState([]);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // 3. Discussion Portal Data
  const [discussions, setDiscussions] = useState([]);
  const [discCategory, setDiscCategory] = useState('All');
  const [discSearch, setDiscSearch] = useState('');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState('Academic');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [replyTexts, setReplyTexts] = useState({});

  // 4. Online Meetings Data
  const [meetings, setMeetings] = useState([]);
  const [showRequestMeetingModal, setShowRequestMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState('2026-11-10');
  const [meetingSlot, setMeetingSlot] = useState('02:30 PM - 03:00 PM');
  const [meetingType, setMeetingType] = useState('Academic Guidance');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingLinkInput, setMeetingLinkInput] = useState('');
  const [selectedMeetingForAction, setSelectedMeetingForAction] = useState(null);
  const [actionStatus, setActionStatus] = useState('Approved');
  const [actionNotes, setActionNotes] = useState('');

  // 5. Digital Mentor Book Data
  const [mentorBook, setMentorBook] = useState(null);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('2026-11-03');
  const [newSessionType, setNewSessionType] = useState('Academic Progress Review');
  const [newSessionSem, setNewSessionSem] = useState(6);
  const [newSessionTopics, setNewSessionTopics] = useState('');
  const [newSessionConcerns, setNewSessionConcerns] = useState('');
  const [newSessionSuggestions, setNewSessionSuggestions] = useState('');
  const [newSessionActions, setNewSessionActions] = useState('');
  const [newSessionNextDate, setNewSessionNextDate] = useState('2026-11-20');

  // Mentor Remarks Modal / Form
  const [showEditRemarksModal, setShowEditRemarksModal] = useState(false);
  const [remarksObs, setRemarksObs] = useState('');
  const [remarksStrengths, setRemarksStrengths] = useState('');
  const [remarksWeaknesses, setRemarksWeaknesses] = useState('');
  const [remarksImprovement, setRemarksImprovement] = useState('');
  const [remarksRecs, setRemarksRecs] = useState('');
  const [remarksFollowup, setRemarksFollowup] = useState('');

  // Student Development Form
  const [showDevModal, setShowDevModal] = useState(false);
  const [devSkills, setDevSkills] = useState('');
  const [devProjects, setDevProjects] = useState('');
  const [devCerts, setDevCerts] = useState('');
  const [devInternships, setDevInternships] = useState('');
  const [devAchievements, setDevAchievements] = useState('');
  const [devExtracurricular, setDevExtracurricular] = useState('');

  // Student Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackUsefulness, setFeedbackUsefulness] = useState('Highly Beneficial');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSuggestions, setFeedbackSuggestions] = useState('');

  // 6. Admin Management Data
  const [adminOverview, setAdminOverview] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState(1);
  const [assignMentorId, setAssignMentorId] = useState(1);
  const [assignGroupName, setAssignGroupName] = useState('CSE Batch 2021-2025 Mentor Group A');

  // Load Initial Data
  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch assigned mentor details
      const mentorRes = await apiRequest(`/mentor/my-mentor?student_id=${selectedStudentId}&role=${userRole}`);
      setMentorData(mentorRes);

      // If faculty, mentorData may have mentees
      if (mentorRes.mentees) {
        setMenteesList(mentorRes.mentees);
      } else if (mentorRes.peers) {
        setMenteesList(mentorRes.peers);
      }

      const mentorId = mentorRes.mentor_id || mentorRes.id || 1;

      // 2. Fetch direct messages
      const msgRes = await apiRequest(`/mentor/messages?student_id=${selectedStudentId}&mentor_id=${mentorId}`);
      setMessages(msgRes || []);

      // 3. Fetch discussions
      const discRes = await apiRequest(`/mentor/discussions?mentor_id=${mentorId}`);
      setDiscussions(discRes || []);

      // 4. Fetch meetings
      const meetRes = await apiRequest(`/mentor/meetings?student_id=${selectedStudentId}&mentor_id=${mentorId}&role=${userRole}`);
      setMeetings(meetRes || []);

      // 5. Fetch digital mentor book
      const bookRes = await apiRequest(`/mentor/mentor-book?student_id=${selectedStudentId}`);
      setMentorBook(bookRes);

      // 6. If Admin, fetch admin overview
      if (userRole === 'admin') {
        const adminRes = await apiRequest('/mentor/admin/overview');
        setAdminOverview(adminRes);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load faculty mentor data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [userRole, selectedStudentId]);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // HANDLER: Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;

    setSendingMsg(true);
    try {
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      const senderRole = userRole === 'faculty' ? 'faculty' : 'student';
      const senderName = userRole === 'faculty'
        ? (mentorData?.name || 'Dr. K. V. Sharma')
        : (mentorData?.student_name || currentUser?.name || 'Alex Kumar');

      await apiRequest('/mentor/messages', {
        method: 'POST',
        body: JSON.stringify({
          mentor_id: mentorId,
          student_id: selectedStudentId,
          sender_role: senderRole,
          sender_name: senderName,
          subject: msgSubject || 'Mentoring Inquiry',
          message: msgText
        })
      });

      setMsgText('');
      setMsgSubject('');
      showToast('Message delivered to mentor conversation.');

      // Refresh messages
      const msgRes = await apiRequest(`/mentor/messages?student_id=${selectedStudentId}&mentor_id=${mentorId}`);
      setMessages(msgRes || []);
    } catch (err) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setSendingMsg(false);
    }
  };

  // HANDLER: Create Discussion Topic
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicContent.trim()) return;

    try {
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      const groupName = mentorData?.group_name || 'CSE Batch 2021-2025 Mentor Group A';
      const creatorRole = userRole === 'faculty' ? 'faculty' : 'student';
      const creatorName = userRole === 'faculty'
        ? (mentorData?.name || 'Dr. K. V. Sharma')
        : (mentorData?.student_name || currentUser?.name || 'Alex Kumar');
      const creatorId = userRole === 'faculty' ? mentorId : selectedStudentId;

      await apiRequest('/mentor/discussions', {
        method: 'POST',
        body: JSON.stringify({
          mentor_id: mentorId,
          group_name: groupName,
          creator_id: creatorId,
          creator_name: creatorName,
          creator_role: creatorRole,
          category: newTopicCategory,
          title: newTopicTitle,
          content: newTopicContent,
          is_pinned: creatorRole === 'faculty' ? 1 : 0
        })
      });

      setShowNewTopicModal(false);
      setNewTopicTitle('');
      setNewTopicContent('');
      showToast('Discussion topic published to the mentor group.');

      const discRes = await apiRequest(`/mentor/discussions?mentor_id=${mentorId}`);
      setDiscussions(discRes || []);
    } catch (err) {
      alert(`Error publishing topic: ${err.message}`);
    }
  };

  // HANDLER: Post Discussion Reply
  const handlePostReply = async (topicId) => {
    const text = replyTexts[topicId];
    if (!text || !text.trim()) return;

    try {
      const authorRole = userRole === 'faculty' ? 'faculty' : 'student';
      const authorName = userRole === 'faculty'
        ? (mentorData?.name || 'Dr. K. V. Sharma')
        : (mentorData?.student_name || currentUser?.name || 'Alex Kumar');
      const authorId = userRole === 'faculty' ? (mentorData?.mentor_id || 1) : selectedStudentId;

      await apiRequest(`/mentor/discussions/${topicId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          reply_text: text,
          author_name: authorName,
          author_role: authorRole,
          author_id: authorId
        })
      });

      setReplyTexts({ ...replyTexts, [topicId]: '' });
      showToast('Reply added to discussion thread.');

      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      const discRes = await apiRequest(`/mentor/discussions?mentor_id=${mentorId}`);
      setDiscussions(discRes || []);
    } catch (err) {
      alert(`Error posting reply: ${err.message}`);
    }
  };

  // HANDLER: Toggle Pin
  const handleTogglePin = async (topicId) => {
    try {
      await apiRequest(`/mentor/discussions/${topicId}/pin`, { method: 'PUT' });
      showToast('Discussion pin status updated.');
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      const discRes = await apiRequest(`/mentor/discussions?mentor_id=${mentorId}`);
      setDiscussions(discRes || []);
    } catch (err) {
      alert(`Pin toggle failed: ${err.message}`);
    }
  };

  // HANDLER: Delete Topic (Moderation)
  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this discussion topic?')) return;
    try {
      await apiRequest(`/mentor/discussions/${topicId}`, { method: 'DELETE' });
      showToast('Discussion topic removed.');
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      const discRes = await apiRequest(`/mentor/discussions?mentor_id=${mentorId}`);
      setDiscussions(discRes || []);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // HANDLER: Request Meeting
  const handleRequestMeeting = async (e) => {
    e.preventDefault();
    if (!meetingAgenda.trim()) return;

    try {
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      await apiRequest('/mentor/meetings/request', {
        method: 'POST',
        body: JSON.stringify({
          mentor_id: mentorId,
          student_id: selectedStudentId,
          student_name: mentorData?.student_name || currentUser?.name || 'Alex Kumar',
          usn: mentorData?.usn || '1MS21CS084',
          requested_date: meetingDate,
          requested_slot: meetingSlot,
          meeting_type: meetingType,
          agenda: meetingAgenda,
          meeting_platform: 'Google Meet'
        })
      });

      setShowRequestMeetingModal(false);
      setMeetingAgenda('');
      showToast('Meeting request submitted to faculty mentor.');

      const meetRes = await apiRequest(`/mentor/meetings?student_id=${selectedStudentId}&mentor_id=${mentorId}&role=${userRole}`);
      setMeetings(meetRes || []);
    } catch (err) {
      alert(`Failed to request meeting: ${err.message}`);
    }
  };

  // HANDLER: Update Meeting Status (Faculty Action)
  const handleMeetingStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedMeetingForAction) return;

    try {
      await apiRequest(`/mentor/meetings/${selectedMeetingForAction.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: actionStatus,
          meeting_link: meetingLinkInput || 'https://meet.google.com/vzk-ymjw-qda',
          mentor_notes: actionNotes
        })
      });

      setSelectedMeetingForAction(null);
      setMeetingLinkInput('');
      setActionNotes('');
      showToast(`Meeting #${selectedMeetingForAction.id} marked as ${actionStatus}.`);

      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      const meetRes = await apiRequest(`/mentor/meetings?student_id=${selectedStudentId}&mentor_id=${mentorId}&role=${userRole}`);
      setMeetings(meetRes || []);
    } catch (err) {
      alert(`Failed to update meeting status: ${err.message}`);
    }
  };

  // HANDLER: Add Mentoring Session to Mentor Book
  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!newSessionTopics.trim() || !newSessionSuggestions.trim()) return;

    try {
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      await apiRequest('/mentor/mentor-book/session', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudentId,
          usn: mentorBook?.student_info?.usn || '1MS21CS084',
          student_name: mentorBook?.student_info?.name || 'Alex Kumar',
          mentor_id: mentorId,
          session_date: newSessionDate,
          session_type: newSessionType,
          semester: parseInt(newSessionSem, 10),
          topics_discussed: newSessionTopics,
          student_concerns: newSessionConcerns,
          mentor_suggestions: newSessionSuggestions,
          action_items: newSessionActions,
          next_meeting_date: newSessionNextDate,
          recorded_by: mentorData?.name || 'Dr. K. V. Sharma (Faculty Mentor)'
        })
      });

      setShowAddSessionModal(false);
      setNewSessionTopics('');
      setNewSessionConcerns('');
      setNewSessionSuggestions('');
      setNewSessionActions('');
      showToast('Mentoring session entry recorded in Digital Mentor Book.');

      const bookRes = await apiRequest(`/mentor/mentor-book?student_id=${selectedStudentId}`);
      setMentorBook(bookRes);
    } catch (err) {
      alert(`Failed to record session: ${err.message}`);
    }
  };

  // HANDLER: Update Official Mentor Remarks
  const handleUpdateRemarks = async (e) => {
    e.preventDefault();
    if (!remarksObs.trim() || !remarksRecs.trim()) return;

    try {
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      await apiRequest('/mentor/mentor-book/remarks', {
        method: 'PUT',
        body: JSON.stringify({
          student_id: selectedStudentId,
          usn: mentorBook?.student_info?.usn || '1MS21CS084',
          semester: 6,
          mentor_id: mentorId,
          academic_observations: remarksObs,
          strengths: remarksStrengths,
          weaknesses: remarksWeaknesses,
          areas_requiring_improvement: remarksImprovement,
          mentor_recommendations: remarksRecs,
          follow_up_notes: remarksFollowup,
          updated_by: mentorData?.name || 'Dr. K. V. Sharma (Chief Academic Mentor)'
        })
      });

      setShowEditRemarksModal(false);
      showToast('Official mentor remarks updated successfully.');

      const bookRes = await apiRequest(`/mentor/mentor-book?student_id=${selectedStudentId}`);
      setMentorBook(bookRes);
    } catch (err) {
      alert(`Failed to update remarks: ${err.message}`);
    }
  };

  // HANDLER: Update Student Development Portfolio
  const handleUpdateDevelopment = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/mentor/mentor-book/development', {
        method: 'PUT',
        body: JSON.stringify({
          student_id: selectedStudentId,
          usn: mentorBook?.student_info?.usn || '1MS21CS084',
          technical_skills: devSkills,
          projects: devProjects,
          certifications: devCerts,
          internship_details: devInternships,
          achievements: devAchievements,
          extracurricular_activities: devExtracurricular,
          updated_by: mentorBook?.student_info?.name || 'Alex Kumar'
        })
      });

      setShowDevModal(false);
      showToast('Student development portfolio saved.');

      const bookRes = await apiRequest(`/mentor/mentor-book?student_id=${selectedStudentId}`);
      setMentorBook(bookRes);
    } catch (err) {
      alert(`Failed to update development portfolio: ${err.message}`);
    }
  };

  // HANDLER: Submit Student Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    try {
      const mentorId = mentorData?.mentor_id || mentorData?.id || 1;
      await apiRequest('/mentor/mentor-book/feedback', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudentId,
          usn: mentorBook?.student_info?.usn || '1MS21CS084',
          student_name: mentorBook?.student_info?.name || 'Alex Kumar',
          mentor_id: mentorId,
          session_title: 'Semester 6 Mentoring Review',
          rating: parseInt(feedbackRating, 10),
          usefulness: feedbackUsefulness,
          feedback_text: feedbackText,
          suggestions: feedbackSuggestions
        })
      });

      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackSuggestions('');
      showToast('Session feedback recorded in Digital Mentor Book.');

      const bookRes = await apiRequest(`/mentor/mentor-book?student_id=${selectedStudentId}`);
      setMentorBook(bookRes);
    } catch (err) {
      alert(`Failed to submit feedback: ${err.message}`);
    }
  };

  // HANDLER: Admin Assign Mentor
  const handleAdminAssignMentor = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/mentor/admin/assign', {
        method: 'POST',
        body: JSON.stringify({
          student_id: parseInt(assignStudentId, 10),
          mentor_id: parseInt(assignMentorId, 10),
          group_name: assignGroupName
        })
      });

      setShowAssignModal(false);
      showToast('Faculty mentor assigned successfully.');

      const adminRes = await apiRequest('/mentor/admin/overview');
      setAdminOverview(adminRes);
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#475569' }}>
        Loading Faculty Mentor records from database...
      </div>
    );
  }

  // Mentor profile data shortcuts
  const mentor = mentorData || {};
  const isFaculty = userRole === 'faculty';
  const isAdmin = userRole === 'admin';

  // Filtered discussions
  const filteredDiscussions = discussions.filter((t) => {
    const matchesCat = discCategory === 'All' || t.category === discCategory;
    const matchesSearch = !discSearch ||
      t.title.toLowerCase().includes(discSearch.toLowerCase()) ||
      t.content.toLowerCase().includes(discSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div>
      {/* Banner Card */}
      <div className="banner-card">
        <div>
          <div className="banner-title">Faculty Mentorship & Student Guidance</div>
          <div className="banner-sub">
            Continuous academic mentoring, 1-on-1 consultations, peer group discussions, and Digital Mentor Book records.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {(isFaculty || isAdmin) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Viewing Mentee:</label>
              <select
                className="form-select"
                style={{ width: '180px' }}
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(parseInt(e.target.value, 10))}
              >
                <option value={1}>Alex Kumar (1MS21CS084)</option>
                <option value={101}>Rohan Sharma (1MS21CS092)</option>
                <option value={102}>Pooja Hegde (1MS21CS065)</option>
                <option value={103}>Priya Nair (1MS21CS071)</option>
              </select>
            </div>
          )}
          <span className="status-pill status-neutral">
            Role: {userRole.toUpperCase()}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="auth-tabs" style={{ marginBottom: '16px', background: '#ffffff', borderRadius: '4px', padding: '4px' }}>
        <button
          type="button"
          className={`auth-tab ${activeSubTab === 'assigned_mentor' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('assigned_mentor')}
        >
          Assigned Faculty Mentor
        </button>
        <button
          type="button"
          className={`auth-tab ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          Mentor Profile
        </button>
        <button
          type="button"
          className={`auth-tab ${activeSubTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('messages')}
        >
          Mentor Contact & Messages ({messages.length})
        </button>
        <button
          type="button"
          className={`auth-tab ${activeSubTab === 'discussions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('discussions')}
        >
          Student Discussion Portal ({discussions.length})
        </button>
        <button
          type="button"
          className={`auth-tab ${activeSubTab === 'meetings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('meetings')}
        >
          Online Meetings ({meetings.length})
        </button>
        <button
          type="button"
          className={`auth-tab ${activeSubTab === 'mentor_book' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('mentor_book')}
        >
          Digital Mentor Book
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`auth-tab ${activeSubTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('admin')}
          >
            Admin Management
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. ASSIGNED FACULTY MENTOR OVERVIEW */}
      {/* ======================================================== */}
      {activeSubTab === 'assigned_mentor' && (
        <div>
          {/* Key Mentor Highlights Card */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Assigned Faculty Mentor Information</h3>
              <span className="status-pill status-success">
                {mentor.assignment_status || 'Active Assignment'}
              </span>
            </div>
            <div className="panel-card-body" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Profile Box */}
              <div style={{
                width: '120px',
                height: '140px',
                border: '2px solid #1e3a8a',
                borderRadius: '4px',
                background: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textAlign: 'center',
                padding: '8px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: '700',
                  marginBottom: '6px'
                }}>
                  {(mentor.mentor_name || mentor.name || 'KV').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>
                  {mentor.faculty_id || 'EMP-CS104'}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Faculty Mentor</span>
              </div>

              {/* Detailed Columns */}
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a' }}>
                  {mentor.mentor_name || mentor.name}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                  {mentor.mentor_designation || mentor.designation}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Department: <strong>{mentor.mentor_dept || mentor.department}</strong>
                </div>

                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
                      Faculty Specialization
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>
                      {mentor.mentor_specialization || mentor.specialization}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
                      Subjects Handled
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>
                      {mentor.subjects_handled}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
                      Office Room Location
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                      {mentor.office_room}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
                      Consultation Hours
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d' }}>
                      {mentor.consultation_hours}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setActiveSubTab('messages')}
                  >
                    Send Direct Message
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setActiveSubTab('meetings');
                      setShowRequestMeetingModal(true);
                    }}
                  >
                    Request Online Meeting
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setActiveSubTab('mentor_book')}
                  >
                    Open Digital Mentor Book
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setActiveSubTab('profile')}
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Consultation Schedule & Mentor Group Peers */}
          <div className="dashboard-sections-grid">
            {/* Consultation Slots Table */}
            <div className="panel-card">
              <div className="panel-card-header">
                <h3 className="panel-card-title">Available Consultation Timings</h3>
                <span className="status-pill status-neutral">Walk-in & Online</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time Slot</th>
                      <th>Location / Mode</th>
                      <th>Max Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mentor.slots?.length > 0 ? (
                      mentor.slots.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.day_name}</strong></td>
                          <td>{s.start_time} - {s.end_time}</td>
                          <td>{s.location_mode}</td>
                          <td>{s.max_slots} Mentees / hr</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>
                          Consultation hours: {mentor.consultation_hours}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mentor Group Peers */}
            <div className="panel-card">
              <div className="panel-card-header">
                <h3 className="panel-card-title">
                  Mentor Group Mentees ({mentor.group_name || 'Group A'})
                </h3>
                <span className="status-pill status-neutral">
                  {menteesList.length} Students
                </span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>USN</th>
                      <th>Student Name</th>
                      <th>Sem & Sec</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menteesList.map((p) => (
                      <tr key={p.student_id || p.usn} style={{ background: p.usn === '1MS21CS084' ? '#f0f9ff' : 'transparent' }}>
                        <td>
                          <strong>{p.usn}</strong>
                          {p.usn === '1MS21CS084' && (
                            <span style={{ marginLeft: '6px', fontSize: '10px', background: '#1e3a8a', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>
                              You
                            </span>
                          )}
                        </td>
                        <td>{p.student_name}</td>
                        <td>Sem {p.semester || 6} ({p.section || 'B'})</td>
                        <td>{p.overall_attendance || 88.4}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DETAILED MENTOR PROFILE */}
      {/* ======================================================== */}
      {activeSubTab === 'profile' && (
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Faculty Mentor Official Academic Profile</h3>
            <span className="status-pill status-success">Verified Faculty Member</span>
          </div>
          <div className="panel-card-body">
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{
                width: '130px',
                height: '150px',
                border: '2px solid #1e3a8a',
                borderRadius: '4px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  fontWeight: '700'
                }}>
                  {(mentor.mentor_name || mentor.name || 'KV').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', marginTop: '6px' }}>
                  {mentor.faculty_id || 'EMP-CS104'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Department of CSE</div>
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e3a8a' }}>
                  {mentor.mentor_name || mentor.name}
                </h2>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '2px' }}>
                  {mentor.mentor_designation || mentor.designation}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Qualification: <strong>{mentor.mentor_qualification || mentor.qualification}</strong>
                </div>

                <div style={{ marginTop: '12px', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                  {mentor.bio || 'Chief Academic Mentor with 18+ years of undergraduate engineering guidance.'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                Official Contact & Consultation Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <div className="stat-label">Official Email Address</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a8a', marginTop: '4px' }}>
                    <a href={`mailto:${mentor.mentor_email || mentor.email}`} style={{ color: '#1e3a8a', textDecoration: 'none' }}>
                      {mentor.mentor_email || mentor.email}
                    </a>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => {
                        navigator.clipboard?.writeText(mentor.mentor_email || mentor.email);
                        showToast('Email address copied to clipboard.');
                      }}
                    >
                      Copy Email
                    </button>
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '12px' }}>
                  <div className="stat-label">Official Contact Number</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a8a', marginTop: '4px' }}>
                    <a href={`tel:${mentor.mentor_phone || mentor.phone}`} style={{ color: '#1e3a8a', textDecoration: 'none' }}>
                      {mentor.mentor_phone || mentor.phone}
                    </a>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => {
                        navigator.clipboard?.writeText(mentor.mentor_phone || mentor.phone);
                        showToast('Contact number copied to clipboard.');
                      }}
                    >
                      Copy Phone
                    </button>
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '12px' }}>
                  <div className="stat-label">Office Room Location</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginTop: '4px' }}>
                    {mentor.office_room}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Academic Block 3, CS Department
                  </div>
                </div>

                <div className="stat-card" style={{ padding: '12px' }}>
                  <div className="stat-label">Consultation Hours</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', marginTop: '4px' }}>
                    {mentor.consultation_hours}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Prior appointment recommended
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                Academic Specialization & Courses Taught
              </h4>
              <p style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                <strong>Specialization:</strong> {mentor.mentor_specialization || mentor.specialization}
              </p>
              <p style={{ fontSize: '13px', color: '#334155' }}>
                <strong>Subjects Handled:</strong> {mentor.subjects_handled}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MENTOR CONTACT & DIRECT MESSAGES */}
      {/* ======================================================== */}
      {activeSubTab === 'messages' && (
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3 className="panel-card-title">Direct Messaging with Faculty Mentor</h3>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Conversation between {isFaculty ? 'Student (Alex Kumar)' : 'Faculty Mentor (' + (mentor.mentor_name || mentor.name) + ')'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`mailto:${mentor.mentor_email || mentor.email}`}
                className="btn-secondary"
                style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '12px' }}
              >
                Send Email
              </a>
              <a
                href={`tel:${mentor.mentor_phone || mentor.phone}`}
                className="btn-secondary"
                style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '12px' }}
              >
                Call Office
              </a>
            </div>
          </div>

          <div className="panel-card-body">
            {/* Conversation Stream */}
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              height: '340px',
              overflowY: 'auto',
              padding: '16px',
              background: '#f8fafc',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.length > 0 ? (
                messages.map((m) => {
                  const isCurrentRole = (isFaculty && m.sender_role === 'faculty') || (!isFaculty && m.sender_role === 'student');
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isCurrentRole ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        background: isCurrentRole ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${isCurrentRole ? '#bfdbfe' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '10px 14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: isCurrentRole ? '#1e3a8a' : '#0f172a' }}>
                          {m.sender_name}
                        </span>
                        <span className={`status-pill ${m.sender_role === 'faculty' ? 'status-success' : 'status-neutral'}`} style={{ fontSize: '10px' }}>
                          {m.sender_role === 'faculty' ? 'Faculty Mentor' : 'Student'}
                        </span>
                      </div>
                      {m.subject && (
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          Subject: {m.subject}
                        </div>
                      )}
                      <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {m.message}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', marginTop: '6px' }}>
                        {m.created_at}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto' }}>
                  No messages yet. Start your conversation with your mentor below.
                </div>
              )}
            </div>

            {/* Compose Message Form */}
            <form onSubmit={handleSendMessage} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Subject (e.g. Capstone Consultation / Exam Preparation)"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={`Write your message to ${isFaculty ? 'Alex Kumar' : (mentor.mentor_name || mentor.name)}...`}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Messages are saved securely to your official mentoring record.
                </span>
                <button type="submit" className="btn-primary" disabled={sendingMsg}>
                  {sendingMsg ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. STUDENT DISCUSSION PORTAL */}
      {/* ======================================================== */}
      {activeSubTab === 'discussions' && (
        <div>
          {/* Header & Controls */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <div>
                <h3 className="panel-card-title">
                  Mentor Group Discussion Forum: {mentor.group_name || 'Group A'}
                </h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Collaborative knowledge exchange, doubt clarification, and study groups with peers and faculty mentor.
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowNewTopicModal(true)}
              >
                + New Discussion Topic
              </button>
            </div>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Academic', 'Doubt', 'Study Material', 'Career', 'Announcement'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn-secondary ${discCategory === cat ? 'active' : ''}`}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: discCategory === cat ? '#1e3a8a' : '#f1f5f9',
                      color: discCategory === cat ? '#ffffff' : '#1e293b'
                    }}
                    onClick={() => setDiscCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search topics or content..."
                  value={discSearch}
                  onChange={(e) => setDiscSearch(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
              </div>
            </div>
          </div>

          {/* New Topic Modal */}
          {showNewTopicModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '520px', background: '#ffffff' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Create New Discussion Topic</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowNewTopicModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleCreateTopic} className="panel-card-body">
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Topic Category:
                    </label>
                    <select
                      className="form-select"
                      value={newTopicCategory}
                      onChange={(e) => setNewTopicCategory(e.target.value)}
                    >
                      <option value="Academic">Academic</option>
                      <option value="Doubt">Doubt Clarification</option>
                      <option value="Study Material">Study Material & Notes</option>
                      <option value="Career">Career & Placement Prep</option>
                      {isFaculty && <option value="Announcement">Faculty Announcement</option>}
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Topic Title:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Compiler Design: Parsing Table Discrepancies"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Discussion Content / Doubt Details:
                    </label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="Provide clear details, problem formulation, or study resources..."
                      value={newTopicContent}
                      onChange={(e) => setNewTopicContent(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowNewTopicModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Publish Topic
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Topics Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredDiscussions.length > 0 ? (
              filteredDiscussions.map((topic) => (
                <div
                  key={topic.id}
                  className="panel-card"
                  style={{
                    borderLeft: topic.is_pinned ? '4px solid #1e3a8a' : '1px solid #d1d5db',
                    background: topic.is_pinned ? '#f8fafc' : '#ffffff'
                  }}
                >
                  <div className="panel-card-header" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {topic.is_pinned === 1 && (
                          <span className="status-pill status-danger" style={{ fontSize: '10px', fontWeight: '700' }}>
                            PINNED ANNOUNCEMENT
                          </span>
                        )}
                        <span className="status-pill status-neutral" style={{ fontSize: '11px' }}>
                          {topic.category}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Posted on {topic.created_at}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                        {topic.title}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                        Author: <strong>{topic.creator_name}</strong> ({topic.creator_role === 'faculty' ? 'Faculty Mentor' : 'Student'})
                      </div>
                    </div>

                    {(isFaculty || isAdmin) && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                          onClick={() => handleTogglePin(topic.id)}
                        >
                          {topic.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '2px 8px', color: '#b91c1c' }}
                          onClick={() => handleDeleteTopic(topic.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="panel-card-body">
                    <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                      {topic.content}
                    </div>

                    {/* Replies Stream */}
                    <div style={{ background: '#f1f5f9', borderRadius: '4px', padding: '12px', marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                        Responses & Comments ({topic.replies?.length || 0}):
                      </div>

                      {topic.replies?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                          {topic.replies.map((rep) => (
                            <div
                              key={rep.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                padding: '8px 12px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: rep.author_role === 'faculty' ? '#1e3a8a' : '#0f172a' }}>
                                  {rep.author_name}
                                  {rep.author_role === 'faculty' && (
                                    <span style={{ marginLeft: '6px', fontSize: '9px', background: '#15803d', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>
                                      Mentor
                                    </span>
                                  )}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  {rep.created_at}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                                {rep.reply_text}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginBottom: '10px' }}>
                          No comments posted yet. Be the first to reply.
                        </div>
                      )}

                      {/* Add Reply Input */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Write a response or answer to this topic..."
                          value={replyTexts[topic.id] || ''}
                          onChange={(e) => setReplyTexts({ ...replyTexts, [topic.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handlePostReply(topic.id);
                            }
                          }}
                          style={{ fontSize: '12px' }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                          onClick={() => handlePostReply(topic.id)}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="panel-card" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No discussion topics found matching the selected filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ONLINE MEETINGS WITH MENTOR */}
      {/* ======================================================== */}
      {activeSubTab === 'meetings' && (
        <div>
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <div>
                <h3 className="panel-card-title">Online Meetings & 1-on-1 Consultation Slots</h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Schedule official mentoring discussions, review academic performance, and join verified Google Meet video conferences.
                </div>
              </div>
              {!isFaculty && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowRequestMeetingModal(true)}
                >
                  + Request Online Meeting
                </button>
              )}
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Student / Mentee</th>
                    <th>Meeting Type</th>
                    <th>Agenda & Discussion Notes</th>
                    <th>Status</th>
                    <th>Meeting Link</th>
                    {isFaculty && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {meetings.length > 0 ? (
                    meetings.map((m) => {
                      let statusClass = 'status-neutral';
                      if (m.status === 'Approved') statusClass = 'status-success';
                      else if (m.status === 'Rejected') statusClass = 'status-danger';
                      else if (m.status === 'Completed') statusClass = 'status-neutral';
                      else if (m.status === 'Requested') statusClass = 'status-danger';

                      return (
                        <tr key={m.id}>
                          <td>
                            <strong>{m.requested_date}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{m.requested_slot}</div>
                          </td>
                          <td>
                            <strong>{m.student_name}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{m.usn}</div>
                          </td>
                          <td>{m.meeting_type}</td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>{m.agenda}</div>
                            {m.mentor_notes && (
                              <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                                Mentor Note: {m.mentor_notes}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${statusClass}`}>
                              {m.status}
                            </span>
                          </td>
                          <td>
                            {m.status === 'Approved' || m.status === 'Completed' ? (
                              m.meeting_link ? (
                                <a
                                  href={m.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-primary"
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    textDecoration: 'none'
                                  }}
                                >
                                  Join Google Meet
                                </a>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Pending URL</span>
                              )
                            ) : (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {m.status === 'Requested' ? 'Pending Approval' : 'No link'}
                              </span>
                            )}
                          </td>
                          {isFaculty && (
                            <td>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => {
                                  setSelectedMeetingForAction(m);
                                  setActionStatus(m.status === 'Requested' ? 'Approved' : m.status);
                                  setMeetingLinkInput(m.meeting_link || 'https://meet.google.com/vzk-ymjw-qda');
                                  setActionNotes(m.mentor_notes || '');
                                }}
                              >
                                Manage Slot
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={isFaculty ? 7 : 6} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                        No meeting sessions scheduled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Request Online Meeting Modal */}
          {showRequestMeetingModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '480px', background: '#ffffff' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Request 1-on-1 Online Consultation</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowRequestMeetingModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleRequestMeeting} className="panel-card-body">
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Faculty Mentor:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={`${mentor.mentor_name || mentor.name} (${mentor.faculty_id || 'EMP-CS104'})`}
                      disabled
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Preferred Date:
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Preferred Slot:
                      </label>
                      <select
                        className="form-select"
                        value={meetingSlot}
                        onChange={(e) => setMeetingSlot(e.target.value)}
                      >
                        <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                        <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                        <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                        <option value="03:30 PM - 04:00 PM">03:30 PM - 04:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Consultation Purpose / Type:
                    </label>
                    <select
                      className="form-select"
                      value={meetingType}
                      onChange={(e) => setMeetingType(e.target.value)}
                    >
                      <option value="Academic Guidance">Academic Guidance & Subject Doubts</option>
                      <option value="Career Counseling">Career & Placement Guidance</option>
                      <option value="Project Guidance">Capstone / Mini Project Consultation</option>
                      <option value="Attendance Review">Attendance & OD Status Review</option>
                      <option value="Personal Grievance">Personal Academic Counseling</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Meeting Agenda & Specific Questions:
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Outline specific topics or questions you wish to review..."
                      value={meetingAgenda}
                      onChange={(e) => setMeetingAgenda(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowRequestMeetingModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Manage Meeting Status Modal (Faculty Role) */}
          {selectedMeetingForAction && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '480px', background: '#ffffff' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Manage Meeting #{selectedMeetingForAction.id}</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedMeetingForAction(null)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleMeetingStatusUpdate} className="panel-card-body">
                  <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                    <div>Mentee: <strong>{selectedMeetingForAction.student_name} ({selectedMeetingForAction.usn})</strong></div>
                    <div>Requested: {selectedMeetingForAction.requested_date} at {selectedMeetingForAction.requested_slot}</div>
                    <div>Agenda: {selectedMeetingForAction.agenda}</div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Meeting Decision Status:
                    </label>
                    <select
                      className="form-select"
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                    >
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Requested">Requested</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Online Meeting Link (Google Meet / Custom Platform):
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://meet.google.com/xyz-abc-def"
                      value={meetingLinkInput}
                      onChange={(e) => setMeetingLinkInput(e.target.value)}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Enter manual meeting URL or leave blank for standard institutional Google Meet link.
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Mentor Notes / Preparation Guidance:
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="e.g. Approved. Please bring your CIE answer script."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedMeetingForAction(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save Status
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. DIGITAL MENTOR BOOK */}
      {/* ======================================================== */}
      {activeSubTab === 'mentor_book' && (
        <div>
          {/* Institutional Header Banner */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #1e3a8a',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                APEX INSTITUTE OF ENGINEERING & TECHNOLOGY
              </h2>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803d', marginTop: '4px', textTransform: 'uppercase' }}>
                OFFICIAL DIGITAL MENTOR BOOK (STUDENT ACADEMIC & PROGRESSION RECORD)
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Accredited Institutional Mentoring Record | Permanent Student Dossier
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(isFaculty || isAdmin) && (
                  <>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => setShowAddSessionModal(true)}
                    >
                      + Log Mentoring Session
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => {
                        const r = mentorBook?.remarks?.[0] || {};
                        setRemarksObs(r.academic_observations || '');
                        setRemarksStrengths(r.strengths || '');
                        setRemarksWeaknesses(r.weaknesses || '');
                        setRemarksImprovement(r.areas_requiring_improvement || '');
                        setRemarksRecs(r.mentor_recommendations || '');
                        setRemarksFollowup(r.follow_up_notes || '');
                        setShowEditRemarksModal(true);
                      }}
                    >
                      Update Mentor Remarks
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => {
                    const dev = mentorBook?.development || {};
                    setDevSkills(dev.technical_skills || '');
                    setDevProjects(dev.projects || '');
                    setDevCerts(dev.certifications || '');
                    setDevInternships(dev.internship_details || '');
                    setDevAchievements(dev.achievements || '');
                    setDevExtracurricular(dev.extracurricular_activities || '');
                    setShowDevModal(true);
                  }}
                >
                  Update Development Portfolio
                </button>
                {!isFaculty && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    Submit Session Feedback
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section A: Student Information */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section A: Student Dossier & Identification</h3>
              <span className="status-pill status-neutral">Verified Profile</span>
            </div>
            <div className="panel-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <div className="id-field-label">Student Full Name</div>
                <div className="id-field-value">{mentorBook?.student_info?.name || 'Alex Kumar'}</div>
              </div>
              <div>
                <div className="id-field-label">University Seat Number (USN)</div>
                <div className="id-field-value" style={{ color: '#1e3a8a' }}>{mentorBook?.student_info?.usn || '1MS21CS084'}</div>
              </div>
              <div>
                <div className="id-field-label">Department & Degree</div>
                <div className="id-field-value">{mentorBook?.student_info?.department || 'Computer Science & Engineering'}</div>
              </div>
              <div>
                <div className="id-field-label">Current Semester & Section</div>
                <div className="id-field-value">Semester {mentorBook?.student_info?.semester || 6} (Section {mentorBook?.student_info?.section || 'B'})</div>
              </div>
              <div>
                <div className="id-field-label">Assigned Faculty Mentor</div>
                <div className="id-field-value">{mentorBook?.student_info?.mentor_name || 'Dr. K. V. Sharma'} ({mentorBook?.student_info?.mentor_faculty_id || 'EMP-CS104'})</div>
              </div>
              <div>
                <div className="id-field-label">Mentor Group Batch</div>
                <div className="id-field-value">{mentorBook?.student_info?.group_name || 'CSE Batch 2021-2025 Mentor Group A'}</div>
              </div>
              <div>
                <div className="id-field-label">Official Student Email</div>
                <div className="id-field-value">{mentorBook?.student_info?.email || 'student@college.edu'}</div>
              </div>
              <div>
                <div className="id-field-label">Emergency Contact & Blood Group</div>
                <div className="id-field-value">{mentorBook?.student_info?.emergency_contact || '+91 98765 43210'} ({mentorBook?.student_info?.blood_group || 'O+'})</div>
              </div>
            </div>
          </div>

          {/* Section B: Academic Performance Records */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section B: Academic Progression & Semester Ledgers</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="status-pill status-neutral">
                  Cumulative CGPA: <strong>{mentorBook?.academics?.cgpa || 9.12}</strong>
                </span>
                <span className="status-pill status-success">First Class with Distinction</span>
              </div>
            </div>
            <div className="panel-card-body">
              {/* Semester-wise SGPA Progress */}
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                  Semester-wise SGPA Progression History:
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {mentorBook?.academics?.gpa_history?.map((g) => (
                    <div key={g.semester} style={{
                      flex: '1 1 110px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Semester {g.semester}</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a8a' }}>{g.sgpa}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{g.total_credits} Credits</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject Marks Table */}
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                Continuous Internal Evaluation (CIE) & Semester End Performance:
              </h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sem</th>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Credits</th>
                      <th>Internal</th>
                      <th>Lab</th>
                      <th>External</th>
                      <th>Total</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mentorBook?.academics?.subject_marks?.map((m) => (
                      <tr key={m.id}>
                        <td>{m.semester}</td>
                        <td><strong>{m.course_code}</strong></td>
                        <td>{m.course_title}</td>
                        <td>{m.credits}</td>
                        <td>{m.internal_marks}</td>
                        <td>{m.lab_marks}</td>
                        <td>{m.external_marks}</td>
                        <td><strong>{m.total_marks}</strong></td>
                        <td>
                          <span style={{ fontWeight: '700', color: m.grade === 'O' || m.grade === 'A+' ? '#15803d' : '#0f172a' }}>
                            {m.grade}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${m.status === 'Pass' ? 'status-success' : 'status-danger'}`} style={{ fontSize: '10px' }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section C: Attendance Records */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section C: Official Attendance & OD Log</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`status-pill ${mentorBook?.attendance?.overall_percentage >= 75 ? 'status-success' : 'status-danger'}`}>
                  Overall Attendance: {mentorBook?.attendance?.overall_percentage}%
                </span>
                <span className="status-pill status-neutral">
                  {mentorBook?.attendance?.status}
                </span>
              </div>
            </div>
            <div className="panel-card-body">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Conducted</th>
                      <th>Attended</th>
                      <th>OD Hours</th>
                      <th>Percentage</th>
                      <th>Eligibility Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mentorBook?.attendance?.records?.map((att) => {
                      const pct = att.total_hours > 0 ? ((att.attended_hours / att.total_hours) * 100).toFixed(1) : '100.0';
                      return (
                        <tr key={att.id}>
                          <td><strong>{att.course_code}</strong></td>
                          <td>{att.course_title}</td>
                          <td>{att.total_hours} hrs</td>
                          <td>{att.attended_hours} hrs</td>
                          <td>{att.od_hours} hrs</td>
                          <td><strong>{pct}%</strong></td>
                          <td>
                            <span className={`status-pill ${parseFloat(pct) >= 75 ? 'status-success' : 'status-danger'}`} style={{ fontSize: '10px' }}>
                              {parseFloat(pct) >= 75 ? 'Eligible' : 'Shortage Alert'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '10px', background: '#f8fafc', padding: '8px 12px', borderRadius: '4px' }}>
                <strong>On Duty (OD) Policy Note:</strong> 4 OD hours verified for participation in National Smart Campus Hackathon. Student meets institutional 75% attendance criteria across all course offerings.
              </div>
            </div>
          </div>

          {/* Section D: Mentoring Meeting Records */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section D: Formal Mentoring Meeting Sessions</h3>
              <span className="status-pill status-neutral">
                {mentorBook?.sessions?.length || 0} Sessions Recorded
              </span>
            </div>
            <div className="panel-card-body">
              {mentorBook?.sessions?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {mentorBook.sessions.map((sess) => (
                    <div
                      key={sess.id}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        padding: '12px',
                        background: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e3a8a' }}>
                            {sess.session_type} (Semester {sess.semester})
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                            Date: {sess.session_date}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Recorded by: <strong>{sess.recorded_by}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '12px' }}>
                        <div>
                          <div style={{ color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                            Topics Discussed
                          </div>
                          <div style={{ color: '#0f172a', marginTop: '2px' }}>{sess.topics_discussed}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                            Student Concerns
                          </div>
                          <div style={{ color: '#0f172a', marginTop: '2px' }}>{sess.student_concerns || 'None reported.'}</div>
                        </div>
                        <div>
                          <div style={{ color: '#15803d', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                            Mentor Guidance & Suggestions
                          </div>
                          <div style={{ color: '#0f172a', marginTop: '2px' }}>{sess.mentor_suggestions}</div>
                        </div>
                        <div>
                          <div style={{ color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                            Agreed Action Items & Next Review
                          </div>
                          <div style={{ color: '#0f172a', marginTop: '2px' }}>
                            {sess.action_items}
                            {sess.next_meeting_date && (
                              <div style={{ marginTop: '2px', color: '#475569', fontStyle: 'italic' }}>
                                Next Follow-up: {sess.next_meeting_date}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No formal mentoring meeting sessions recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Section E: Student Development Portfolio */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section E: Student Development & Competency Portfolio</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => {
                  const dev = mentorBook?.development || {};
                  setDevSkills(dev.technical_skills || '');
                  setDevProjects(dev.projects || '');
                  setDevCerts(dev.certifications || '');
                  setDevInternships(dev.internship_details || '');
                  setDevAchievements(dev.achievements || '');
                  setDevExtracurricular(dev.extracurricular_activities || '');
                  setShowDevModal(true);
                }}
              >
                Edit Portfolio
              </button>
            </div>
            <div className="panel-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <div className="id-field-label">Technical Skills & Stacks</div>
                <div className="id-field-value">{mentorBook?.development?.technical_skills || 'None'}</div>
              </div>
              <div>
                <div className="id-field-label">Academic & Capstone Projects</div>
                <div className="id-field-value">{mentorBook?.development?.projects || 'None'}</div>
              </div>
              <div>
                <div className="id-field-label">Industry Certifications</div>
                <div className="id-field-value">{mentorBook?.development?.certifications || 'None'}</div>
              </div>
              <div>
                <div className="id-field-label">Industrial Internship Experience</div>
                <div className="id-field-value">{mentorBook?.development?.internship_details || 'None'}</div>
              </div>
              <div>
                <div className="id-field-label">Honors & Academic Achievements</div>
                <div className="id-field-value">{mentorBook?.development?.achievements || 'None'}</div>
              </div>
              <div>
                <div className="id-field-label">Extracurricular & Club Leadership</div>
                <div className="id-field-value">{mentorBook?.development?.extracurricular_activities || 'None'}</div>
              </div>
            </div>
          </div>

          {/* Section F: Official Mentor Remarks */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section F: Official Faculty Mentor Observations & Appraisal</h3>
              <span className="status-pill status-neutral">Faculty Signed</span>
            </div>
            <div className="panel-card-body">
              {mentorBook?.remarks?.length > 0 ? (
                mentorBook.remarks.map((r) => (
                  <div key={r.id || r.semester} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a8a' }}>
                        Semester {r.semester} Comprehensive Mentor Evaluation
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Evaluator: <strong>{r.updated_by}</strong> ({r.updated_at})
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', fontSize: '12px' }}>
                      <div>
                        <div style={{ color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                          Academic Observations
                        </div>
                        <div style={{ color: '#0f172a', marginTop: '2px' }}>{r.academic_observations}</div>
                      </div>
                      <div>
                        <div style={{ color: '#15803d', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                          Key Strengths
                        </div>
                        <div style={{ color: '#0f172a', marginTop: '2px' }}>{r.strengths}</div>
                      </div>
                      <div>
                        <div style={{ color: '#b91c1c', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                          Weaknesses & Areas Requiring Improvement
                        </div>
                        <div style={{ color: '#0f172a', marginTop: '2px' }}>{r.areas_requiring_improvement || r.weaknesses}</div>
                      </div>
                      <div>
                        <div style={{ color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', fontSize: '10px' }}>
                          Recommendations & Progression Guidance
                        </div>
                        <div style={{ color: '#0f172a', marginTop: '2px' }}>{r.mentor_recommendations}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No official mentor remarks logged for this student yet.
                </div>
              )}
            </div>
          </div>

          {/* Section G: Student Feedback on Mentoring */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Section G: Student Feedback & Session Reflections</h3>
              <span className="status-pill status-neutral">
                {mentorBook?.feedback?.length || 0} Submissions
              </span>
            </div>
            <div className="panel-card-body">
              {mentorBook?.feedback?.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Session Title</th>
                        <th>Rating</th>
                        <th>Usefulness</th>
                        <th>Student Remarks & Suggestions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentorBook.feedback.map((f) => (
                        <tr key={f.id}>
                          <td>{f.submitted_at}</td>
                          <td><strong>{f.session_title}</strong></td>
                          <td>
                            <span style={{ fontWeight: '700', color: '#1e3a8a' }}>
                              {f.rating} / 5
                            </span>
                          </td>
                          <td>
                            <span className="status-pill status-success" style={{ fontSize: '10px' }}>
                              {f.usefulness}
                            </span>
                          </td>
                          <td>
                            <div>{f.feedback_text}</div>
                            {f.suggestions && (
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Suggestion: {f.suggestions}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                  No student feedback submitted yet.
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail & Record Timestamp History */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Digital Mentor Book Update Audit Log</h3>
              <span className="status-pill status-neutral">Immutable Timestamps</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Performed By</th>
                    <th>Role</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {mentorBook?.audit_logs?.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '11px' }}>{l.created_at}</td>
                      <td><strong>{l.action_type}</strong></td>
                      <td>{l.performed_by}</td>
                      <td>
                        <span className={`status-pill ${l.role === 'admin' ? 'status-danger' : l.role === 'faculty' ? 'status-success' : 'status-neutral'}`} style={{ fontSize: '10px' }}>
                          {l.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{l.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL: Log Mentoring Session */}
          {showAddSessionModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '540px', background: '#ffffff', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Log Formal Mentoring Meeting Session</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowAddSessionModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleAddSession} className="panel-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Session Date:
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={newSessionDate}
                        onChange={(e) => setNewSessionDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Semester:
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={newSessionSem}
                        onChange={(e) => setNewSessionSem(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Session Type:
                    </label>
                    <select
                      className="form-select"
                      value={newSessionType}
                      onChange={(e) => setNewSessionType(e.target.value)}
                    >
                      <option value="Academic Progress Review">Academic Progress Review</option>
                      <option value="Mid-Term Performance Review">Mid-Term Performance Review</option>
                      <option value="Attendance & OD Counseling">Attendance & OD Counseling</option>
                      <option value="Career & Placement Guidance">Career & Placement Guidance</option>
                      <option value="End-Term Evaluation">End-Term Evaluation</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Topics Discussed:
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="e.g. CIE-1 analysis, subject difficulties, balancing lab work..."
                      value={newSessionTopics}
                      onChange={(e) => setNewSessionTopics(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Student Concerns:
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="e.g. Time management during descriptive tests..."
                      value={newSessionConcerns}
                      onChange={(e) => setNewSessionConcerns(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Mentor Suggestions & Guidance:
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="e.g. Recommended solving question bank exercises..."
                      value={newSessionSuggestions}
                      onChange={(e) => setNewSessionSuggestions(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Agreed Action Items:
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Submit tutorial sheet 3"
                        value={newSessionActions}
                        onChange={(e) => setNewSessionActions(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Next Follow-Up Date:
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={newSessionNextDate}
                        onChange={(e) => setNewSessionNextDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAddSessionModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save Session
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: Edit Mentor Remarks */}
          {showEditRemarksModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '540px', background: '#ffffff', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Official Faculty Mentor Appraisal</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowEditRemarksModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleUpdateRemarks} className="panel-card-body">
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Academic Observations:
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={remarksObs}
                      onChange={(e) => setRemarksObs(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Identified Strengths:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={remarksStrengths}
                      onChange={(e) => setRemarksStrengths(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Areas Requiring Improvement:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={remarksImprovement}
                      onChange={(e) => setRemarksImprovement(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Official Mentor Recommendations:
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={remarksRecs}
                      onChange={(e) => setRemarksRecs(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Follow-up Notes:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={remarksFollowup}
                      onChange={(e) => setRemarksFollowup(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowEditRemarksModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save Remarks
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: Update Student Development Portfolio */}
          {showDevModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '520px', background: '#ffffff', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Student Development Portfolio</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowDevModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleUpdateDevelopment} className="panel-card-body">
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Technical Skills:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={devSkills}
                      onChange={(e) => setDevSkills(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Academic & Capstone Projects:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={devProjects}
                      onChange={(e) => setDevProjects(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Certifications:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={devCerts}
                      onChange={(e) => setDevCerts(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Internship Details:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={devInternships}
                      onChange={(e) => setDevInternships(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Achievements & Honors:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={devAchievements}
                      onChange={(e) => setDevAchievements(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Extracurricular Activities:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={devExtracurricular}
                      onChange={(e) => setDevExtracurricular(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDevModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save Portfolio
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: Submit Student Feedback */}
          {showFeedbackModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '480px', background: '#ffffff' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Submit Mentoring Session Feedback</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowFeedbackModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleSubmitFeedback} className="panel-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Guidance Rating:
                      </label>
                      <select
                        className="form-select"
                        value={feedbackRating}
                        onChange={(e) => setFeedbackRating(parseInt(e.target.value, 10))}
                      >
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Very Good</option>
                        <option value={3}>3 - Satisfactory</option>
                        <option value={2}>2 - Fair</option>
                        <option value={1}>1 - Needs Improvement</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                        Session Usefulness:
                      </label>
                      <select
                        className="form-select"
                        value={feedbackUsefulness}
                        onChange={(e) => setFeedbackUsefulness(e.target.value)}
                      >
                        <option value="Highly Beneficial">Highly Beneficial</option>
                        <option value="Beneficial">Beneficial</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Needs Improvement">Needs Improvement</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Your Feedback / Reflection:
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="How did the mentoring session help your academic focus and goal setting?"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Suggestions for Department Mentoring:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Any additional topics or workshop requests..."
                      value={feedbackSuggestions}
                      onChange={(e) => setFeedbackSuggestions(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowFeedbackModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Submit Feedback
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. ADMIN MENTOR MANAGEMENT */}
      {/* ======================================================== */}
      {activeSubTab === 'admin' && isAdmin && (
        <div>
          {/* Institutional KPI Cards */}
          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-label">Faculty Mentors</div>
              <div className="stat-value">{adminOverview?.metrics?.total_mentors || 3}</div>
              <div className="stat-footer">Active Institutional Guides</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Assigned Mentees</div>
              <div className="stat-value">{adminOverview?.metrics?.total_assigned_students || 6}</div>
              <div className="stat-footer">Undergraduate Cohort</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Logged Mentoring Sessions</div>
              <div className="stat-value">{adminOverview?.metrics?.total_sessions_logged || 0}</div>
              <div className="stat-footer">Formal Mentor Book Entries</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Student Feedback Rating</div>
              <div className="stat-value">{adminOverview?.metrics?.avg_feedback_rating || 5.0} / 5</div>
              <div className="stat-footer">Across all mentoring cohorts</div>
            </div>
          </div>

          {/* Mentor Assignment Table */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Student Mentor Assignments Ledger</h3>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowAssignModal(true)}
              >
                + Assign / Reassign Mentor
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>USN</th>
                    <th>Student Name</th>
                    <th>Department & Sem</th>
                    <th>Assigned Faculty Mentor</th>
                    <th>Mentor Group</th>
                    <th>CGPA</th>
                    <th>Attendance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOverview?.assigned_students?.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.usn}</strong></td>
                      <td>{s.student_name}</td>
                      <td>{s.department} (Sem {s.semester})</td>
                      <td>
                        <strong>{s.mentor_name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{s.mentor_faculty_id}</div>
                      </td>
                      <td>{s.group_name}</td>
                      <td>{s.cgpa || '--'}</td>
                      <td>{s.overall_attendance || '--'}%</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => {
                            setAssignStudentId(s.student_id);
                            setAssignMentorId(s.mentor_id);
                            setAssignGroupName(s.group_name);
                            setShowAssignModal(true);
                          }}
                        >
                          Change Mentor
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mentor Groups Directory */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Mentor Groups Directory</h3>
              <span className="status-pill status-neutral">
                {adminOverview?.groups?.length || 0} Active Groups
              </span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mentor Group Name</th>
                    <th>Faculty In-Charge</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Total Mentees</th>
                    <th>Academic Year</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOverview?.groups?.map((g) => (
                    <tr key={g.group_name}>
                      <td><strong>{g.group_name}</strong></td>
                      <td>{g.mentor_name}</td>
                      <td>{g.department}</td>
                      <td>Semester {g.semester}</td>
                      <td><strong>{g.total_students}</strong> Students</td>
                      <td>{g.academic_year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reassign Mentor Modal */}
          {showAssignModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '90%', maxWidth: '480px', background: '#ffffff' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">Assign or Change Faculty Mentor</h3>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handleAdminAssignMentor} className="panel-card-body">
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Select Student:
                    </label>
                    <select
                      className="form-select"
                      value={assignStudentId}
                      onChange={(e) => setAssignStudentId(parseInt(e.target.value, 10))}
                    >
                      <option value={1}>Alex Kumar (1MS21CS084)</option>
                      <option value={101}>Rohan Sharma (1MS21CS092)</option>
                      <option value={102}>Pooja Hegde (1MS21CS065)</option>
                      <option value={103}>Priya Nair (1MS21CS071)</option>
                      <option value={104}>Vikram Aditya (1MS21CS115)</option>
                      <option value={105}>Sneha Patil (1MS21CS102)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Select Assigned Faculty Mentor:
                    </label>
                    <select
                      className="form-select"
                      value={assignMentorId}
                      onChange={(e) => setAssignMentorId(parseInt(e.target.value, 10))}
                    >
                      {adminOverview?.mentors?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.faculty_id} - {m.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                      Mentor Group Name:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={assignGroupName}
                      onChange={(e) => setAssignGroupName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAssignModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save Assignment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
