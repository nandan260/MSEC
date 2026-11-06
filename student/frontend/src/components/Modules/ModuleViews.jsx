import React, { useState, useEffect } from 'react';
import { apiRequest, apiUrl, openExternal } from '../../api';

// ==========================================================
// 9. STUDENT PROFILE AND DIGITAL ID MODULE
// ==========================================================
export function StudentProfileView({ userRole }) {
  const [profile, setProfile] = useState(null);
  const [digitalId, setDigitalId] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'digital_id'
  const [editForm, setEditForm] = useState({
    phone: '',
    email: '',
    emergency_contact: '',
    blood_group: 'O+',
    address: '',
    department: '',
    semester: 6,
    section: 'A'
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showQrInspector, setShowQrInspector] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const loadData = async () => {
    try {
      const pRes = await apiRequest('/profile');
      setProfile(pRes.profile);
      setEditForm({
        phone: pRes.profile.phone || '',
        email: pRes.profile.email || '',
        emergency_contact: pRes.profile.emergency_contact || '',
        blood_group: pRes.profile.blood_group || 'O+',
        address: pRes.profile.address || '',
        department: pRes.profile.department || '',
        semester: pRes.profile.semester || 6,
        section: pRes.profile.section || 'A'
      });

      const idRes = await apiRequest('/profile/digital-id');
      setDigitalId(idRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setProfile(res.profile);
      setMsg('Profile and permitted contact records successfully updated in the official database.');
      const idRes = await apiRequest('/profile/digital-id');
      setDigitalId(idRes);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/profile/photo'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Photo upload failed');

      setMsg('Profile photograph successfully updated.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCredential = async () => {
    if (!profile?.usn) return;
    setVerifyLoading(true);
    try {
      const res = await apiRequest(`/profile/verify/${profile.usn}`);
      setVerifyResult(res);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePrintIdCard = () => {
    window.print();
  };

  if (!profile) return <div style={{ padding: '20px' }}>Loading student profile...</div>;

  return (
    <div>
      <div className="banner-card">
        <div>
          <div className="banner-title">Student Profile & Digital Identification</div>
          <div className="banner-sub">
            Verified institutional registry, contact preferences, and official digital ID card with secure QR code.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Summary Profile Header Card */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="id-photo-box" style={{ width: '90px', height: '100px' }}>
            <img src={apiUrl(profile.photo_url || '/uploads/profiles/default_student.png')} alt={profile.name} />
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{profile.name}</h2>
              <span className="status-pill status-neutral">USN: {profile.usn}</span>
              <span className="status-pill status-success">{profile.academic_status || 'Good Standing'}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
              {profile.department} | {profile.college_name || 'Apex Institute of Engineering & Technology'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {profile.degree || 'Bachelor of Engineering (B.E.)'} - Semester {profile.semester} (Section {profile.section}) | Batch: {profile.admission_year || 2021} - {(profile.admission_year || 2021) + 4}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
            <div>
              <div className="stat-label">Current CGPA</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a8a' }}>{profile.cgpa}</div>
            </div>
            <div>
              <div className="stat-label">Attendance</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803d' }}>{profile.overall_attendance}%</div>
            </div>
            <div>
              <div className="stat-label">Earned Credits</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{profile.credits_earned || 128}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Switcher */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{
              backgroundColor: activeTab === 'profile' ? '#1e3a8a' : '#ffffff',
              color: activeTab === 'profile' ? '#ffffff' : '#1e293b'
            }}
            onClick={() => setActiveTab('profile')}
          >
            Profile Information & Contact Settings
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{
              backgroundColor: activeTab === 'digital_id' ? '#1e3a8a' : '#ffffff',
              color: activeTab === 'digital_id' ? '#ffffff' : '#1e293b'
            }}
            onClick={() => setActiveTab('digital_id')}
          >
            Digital Student ID & Verified QR Badge
          </button>
        </div>
      </div>

      {/* TAB 1: PROFILE INFORMATION */}
      {activeTab === 'profile' && (
        <div className="dashboard-sections-grid">
          {/* Institutional Official Records (Locked) */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Official Institutional Records</h3>
              <span className="status-pill status-neutral">Registrar Master Copy</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="stat-label">University Seat Number (USN)</label>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{profile.usn}</div>
                </div>
                <div>
                  <label className="stat-label">Student Full Name</label>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{profile.name}</div>
                </div>
                <div>
                  <label className="stat-label">College / Institution</label>
                  <div style={{ color: '#334155' }}>{profile.college_name || 'Apex Institute of Engineering & Technology'}</div>
                </div>
                <div>
                  <label className="stat-label">Department / Branch</label>
                  <div style={{ color: '#334155' }}>{profile.department}</div>
                </div>
                <div>
                  <label className="stat-label">Academic Program</label>
                  <div style={{ color: '#334155' }}>{profile.degree || 'B.E. Computer Science'}</div>
                </div>
                <div>
                  <label className="stat-label">Current Semester & Section</label>
                  <div style={{ color: '#334155' }}>Semester {profile.semester} - Section {profile.section}</div>
                </div>
                <div>
                  <label className="stat-label">Admission Year</label>
                  <div style={{ color: '#334155' }}>{profile.admission_year || 2021}</div>
                </div>
                <div>
                  <label className="stat-label">ID Expiry / Valid Thru</label>
                  <div style={{ color: '#334155' }}>{profile.valid_thru || 'June 2027'}</div>
                </div>
                <div>
                  <label className="stat-label">Active Backlogs</label>
                  <div style={{ color: '#15803d', fontWeight: 600 }}>{profile.backlogs || 0} Backlogs</div>
                </div>
                <div>
                  <label className="stat-label">Standing Status</label>
                  <div style={{ color: '#15803d', fontWeight: 600 }}>{profile.academic_status || 'Good Standing'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <label className="stat-label" style={{ marginBottom: '6px' }}>Update Profile Photograph</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="form-input"
                    style={{ padding: '6px' }}
                    disabled={loading}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Supported formats: PNG, JPG, JPEG, WEBP. Photo is automatically updated on your Digital ID.
                </div>
              </div>
            </div>
          </div>

          {/* Permitted Editable Details Form */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Permitted Personal & Contact Details</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Editable by Student</span>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label>Primary Phone Number</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Official Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.emergency_contact}
                    onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Blood Group</label>
                  <select
                    className="form-select"
                    value={editForm.blood_group}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Residential / Hostel Address</label>
                  <textarea
                    rows="3"
                    className="form-input"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                {userRole === 'admin' && (
                  <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '4px', marginBottom: '14px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>
                      ADMINISTRATOR MASTER RECORD OVERRIDE:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px' }}>Department</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px' }}>Semester</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.semester}
                          onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Permitted Contact Details'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL STUDENT ID CARD & QR CODE */}
      {activeTab === 'digital_id' && digitalId && (
        <div>
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e3a8a' }}>
              Security & Credential Verification Notice
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
              Each student is issued a unique dynamic QR code for campus identification, laboratory attendance, and institutional verification. Passwords, hashes, and sensitive authentication keys are never exposed in the QR credential.
            </div>
          </div>

          <div className="id-card-wrapper">
            {/* Front Card */}
            <div className="id-card-badge">
              <div className="id-card-header">
                <div className="id-card-header-college">{digitalId.digital_id.college_name}</div>
                <div className="id-card-header-sub">STUDENT IDENTITY CARD</div>
              </div>

              <div className="id-card-body">
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                  <div className="id-photo-box">
                    <img src={apiUrl(digitalId.digital_id.photo_url || '/uploads/profiles/default_student.png')} alt={digitalId.digital_id.name} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="id-field-label">Student Name</div>
                    <div className="id-field-value" style={{ fontSize: '14px', color: '#1e3a8a' }}>{digitalId.digital_id.name}</div>

                    <div className="id-field-label" style={{ marginTop: '6px' }}>University Seat No (USN)</div>
                    <div className="id-field-value">{digitalId.digital_id.usn}</div>

                    <div className="id-field-label" style={{ marginTop: '6px' }}>Blood Group</div>
                    <div className="id-field-value">{digitalId.digital_id.blood_group}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div>
                    <div className="id-field-label">Branch</div>
                    <div className="id-field-value" style={{ fontSize: '11px' }}>{digitalId.digital_id.department}</div>
                  </div>
                  <div>
                    <div className="id-field-label">Semester & Sec</div>
                    <div className="id-field-value">Sem {digitalId.digital_id.semester} - Sec {digitalId.digital_id.section}</div>
                  </div>
                  <div>
                    <div className="id-field-label">Valid Thru</div>
                    <div className="id-field-value" style={{ color: '#15803d' }}>{digitalId.digital_id.valid_thru}</div>
                  </div>
                  <div>
                    <div className="id-field-label">Emergency Tel</div>
                    <div className="id-field-value" style={{ fontSize: '11px' }}>{digitalId.digital_id.emergency_contact}</div>
                  </div>
                </div>
              </div>

              <div className="id-card-footer">
                <span>Registrar Seal Verified</span>
                <span style={{ fontWeight: 600 }}>Active Student</span>
              </div>
            </div>

            {/* Back Card with Unique QR Code */}
            <div className="id-card-badge">
              <div className="id-card-header" style={{ background: '#0f172a' }}>
                <div className="id-card-header-college">INSTITUTIONAL DIGITAL CREDENTIAL</div>
                <div className="id-card-header-sub">OFFICIAL SCANNABLE VERIFICATION BADGE</div>
              </div>

              <div className="id-card-body" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <img
                    src={digitalId.qr_code_image}
                    alt="Student ID QR Code"
                    style={{ width: '130px', height: '130px', display: 'block' }}
                  />
                </div>

                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a8a', marginTop: '8px' }}>
                  UNIQUE SECURE QR CODE
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  Scan with any camera or scanner to verify student credentials.
                </div>

                <div style={{ marginTop: '10px', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'left', fontSize: '10px', color: '#475569' }}>
                  <div><strong>Address:</strong> {digitalId.digital_id.address}</div>
                  <div><strong>Emergency Helpline:</strong> {digitalId.digital_id.emergency_contact}</div>
                  <div style={{ marginTop: '4px', color: '#64748b', fontStyle: 'italic' }}>
                    If found, return to Registrar Office, Apex Institute of Engineering & Technology.
                  </div>
                </div>
              </div>

              <div className="id-card-footer">
                <span>Barcode Access: 1MS21CS084</span>
                <span>ISO/IEC 18004</span>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button type="button" className="btn-primary" onClick={handlePrintIdCard}>
              Print / Save ID Card
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowQrInspector(true)}>
              Inspect QR Encoded Content
            </button>
            <button type="button" className="btn-secondary" onClick={handleVerifyCredential} disabled={verifyLoading}>
              {verifyLoading ? 'Verifying...' : 'Simulate External Scanner Verification'}
            </button>
          </div>

          {/* Verification Result Drawer */}
          {verifyResult && (
            <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: '#15803d', fontSize: '14px' }}>
                  Official Registrar Verification Certificate
                </div>
                <button type="button" className="btn-secondary" style={{ fontSize: '11px' }} onClick={() => setVerifyResult(null)}>
                  Dismiss
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                Status: <strong>{verifyResult.student.academic_status}</strong> | Authority: <strong>{verifyResult.verification_source}</strong> | Timestamp: {verifyResult.timestamp}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
                <div>Name: <strong>{verifyResult.student.name}</strong></div>
                <div>USN: <strong>{verifyResult.student.usn}</strong></div>
                <div>Institution: <strong>{verifyResult.student.college_name}</strong></div>
                <div>Department: <strong>{verifyResult.student.department}</strong></div>
                <div>Validity: <strong>{verifyResult.student.valid_thru}</strong></div>
              </div>
            </div>
          )}

          {/* Modal: QR Decoded Payload Inspector */}
          {showQrInspector && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
              <div className="panel-card" style={{ width: '100%', maxWidth: '540px', margin: '20px' }}>
                <div className="panel-card-header">
                  <h3 className="panel-card-title">QR Code Decoded Content Inspector</h3>
                  <button type="button" className="btn-secondary" onClick={() => setShowQrInspector(false)}>Close</button>
                </div>
                <div className="panel-card-body">
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
                    The following exact text string is encoded inside the student's unique QR code. Notice that no passwords, private hashes, or security tokens are exposed:
                  </div>

                  <pre style={{
                    background: '#0f172a', color: '#f8fafc', padding: '14px',
                    borderRadius: '4px', fontSize: '12px', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                  }}>
                    {digitalId.qr_payload_text}
                  </pre>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setShowQrInspector(false)}>
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 10. PLACEMENT AND CAREER MODULE
// ==========================================================
export function PlacementsView({ userRole }) {
  const [activeTab, setActiveTab] = useState('drives'); // 'drives' | 'applications' | 'resumes' | 'builder' | 'prep'
  const [drives, setDrives] = useState([]);
  const [driveType, setDriveType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const [prepData, setPrepData] = useState({ resources: [], mock_questions: [] });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Modals & Forms
  const [selectedDriveForApply, setSelectedDriveForApply] = useState(null);
  const [applyResumeName, setApplyResumeName] = useState('alex_kumar_resume.pdf');
  const [showAddDriveModal, setShowAddDriveModal] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [revealedQuestionId, setRevealedQuestionId] = useState(null);

  // New Drive Form State (Admin)
  const [driveForm, setDriveForm] = useState({
    company_name: '',
    job_title: '',
    job_type: 'Full-time',
    ctc_or_stipend: '',
    location: 'Bangalore',
    description: '',
    min_cgpa: 7.5,
    eligible_branches: 'CSE, ISE, ECE',
    required_skills: '',
    deadline_date: '',
    drive_date: ''
  });

  // Resume Upload State
  const [uploadTitle, setUploadTitle] = useState('Core Software Resume');
  const [resumeFile, setResumeFile] = useState(null);

  const loadDrives = async () => {
    try {
      const query = new URLSearchParams();
      if (driveType !== 'all') query.append('type', driveType);
      if (searchTerm) query.append('search', searchTerm);
      const res = await apiRequest(`/placements/drives?${query.toString()}`);
      setDrives(res.drives || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await apiRequest('/placements/applications');
      setApplications(res.applications || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadResumes = async () => {
    try {
      const res = await apiRequest('/placements/resumes');
      setResumes(res.resumes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadResumeBuilder = async () => {
    try {
      const res = await apiRequest('/placements/resume-builder');
      setResumeData(res.resume_data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const loadPrep = async () => {
    try {
      const res = await apiRequest('/placements/interview-prep');
      setPrepData(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'drives') loadDrives();
    else if (activeTab === 'applications') loadApplications();
    else if (activeTab === 'resumes') loadResumes();
    else if (activeTab === 'builder') loadResumeBuilder();
    else if (activeTab === 'prep') loadPrep();
  }, [activeTab, driveType]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedDriveForApply) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/placements/apply', {
        method: 'POST',
        body: JSON.stringify({
          drive_id: selectedDriveForApply.id,
          resume_name: applyResumeName
        })
      });
      setMsg(res.message);
      setSelectedDriveForApply(null);
      loadDrives();
    } catch (err) {
      setError(err.message || 'Application submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/placements/drives', {
        method: 'POST',
        body: JSON.stringify(driveForm)
      });
      setMsg(res.message);
      setShowAddDriveModal(false);
      loadDrives();
    } catch (err) {
      setError(err.message || 'Failed to create drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setError('Please choose a resume file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('title', uploadTitle);

    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/placements/resumes/upload'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMsg(data.message);
      setResumeFile(null);
      loadResumes();
    } catch (err) {
      setError(err.message || 'Resume upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResumeBuilder = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/placements/resume-builder', {
        method: 'POST',
        body: JSON.stringify(resumeData)
      });
      setMsg(res.message);
    } catch (err) {
      setError(err.message || 'Failed to save resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      await apiRequest(`/placements/applications/${appId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, remarks: `Status updated to ${newStatus} by Coordinator.` })
      });
      loadApplications();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  return (
    <div>
      <div className="banner-card">
        <div>
          <div className="banner-title">Campus Placements, Internships & Career Hub</div>
          <div className="banner-sub">
            Corporate recruitment drives, resume vault, academic resume builder, and technical interview preparation.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Tabs Switcher */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'drives', label: 'Recruitment & Internship Drives' },
            { id: 'applications', label: 'My Applications & Status' },
            { id: 'resumes', label: 'Resume Vault' },
            { id: 'builder', label: 'Interactive Resume Builder' },
            { id: 'prep', label: 'Interview Preparation & Mock Q&A' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: activeTab === tab.id ? '#1e3a8a' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : '#1e293b'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: PLACEMENT DRIVES */}
      {activeTab === 'drives' && (
        <div>
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ backgroundColor: driveType === 'all' ? '#1e3a8a' : '#ffffff', color: driveType === 'all' ? '#ffffff' : '#1e293b' }}
                  onClick={() => setDriveType('all')}
                >
                  All Opportunities
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ backgroundColor: driveType === 'fulltime' ? '#1e3a8a' : '#ffffff', color: driveType === 'fulltime' ? '#ffffff' : '#1e293b' }}
                  onClick={() => setDriveType('fulltime')}
                >
                  Full-Time (FTE)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ backgroundColor: driveType === 'internship' ? '#1e3a8a' : '#ffffff', color: driveType === 'internship' ? '#ffffff' : '#1e293b' }}
                  onClick={() => setDriveType('internship')}
                >
                  Summer Internships
                </button>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by company, role title, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDrives()}
                />
              </div>

              <button type="button" className="btn-secondary" onClick={loadDrives}>Search</button>

              {userRole === 'admin' && (
                <button type="button" className="btn-primary" onClick={() => setShowAddDriveModal(true)}>
                  + Post Placement Drive
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {drives.map((d) => (
              <div key={d.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-card-header">
                  <div>
                    <h3 className="panel-card-title">{d.company_name}</h3>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{d.job_title}</div>
                  </div>
                  <span className={`status-pill ${d.job_type === 'Internship' ? 'status-warning' : 'status-success'}`}>
                    {d.job_type}
                  </span>
                </div>

                <div className="panel-card-body" style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '12px' }}>
                    <div><span className="stat-label">Package / Stipend:</span><strong> {d.ctc_or_stipend}</strong></div>
                    <div><span className="stat-label">Location:</span> {d.location}</div>
                    <div><span className="stat-label">Min CGPA:</span><strong> {d.min_cgpa}</strong></div>
                    <div><span className="stat-label">Eligible:</span> {d.eligible_branches}</div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
                    {d.description}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div className="stat-label">Required Competencies:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {d.required_skills.split(',').map((s, idx) => (
                        <span key={idx} className="status-pill status-neutral" style={{ fontSize: '10px' }}>
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#b91c1c' }}>
                      Deadline: <strong>{d.deadline_date}</strong>
                    </div>

                    {d.has_applied ? (
                      <span className="status-pill status-success">
                        Applied ({d.application_status})
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '6px 14px' }}
                        onClick={() => setSelectedDriveForApply(d)}
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Placement & Internship Application Tracker</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{applications.length} Applications Logged</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Position</th>
                  <th>Type</th>
                  <th>Compensation</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Recruiter Remarks</th>
                  {userRole === 'admin' && <th>Coordinator Action</th>}
                </tr>
              </thead>
              <tbody>
                {applications.length > 0 ? (
                  applications.map((app) => (
                    <tr key={app.id}>
                      <td><strong>{app.company_name}</strong></td>
                      <td>{app.job_title}</td>
                      <td><span className="status-pill status-neutral">{app.job_type}</span></td>
                      <td><strong>{app.ctc_or_stipend}</strong></td>
                      <td>{app.applied_date}</td>
                      <td>
                        <span className={`status-pill ${app.status === 'Selected' ? 'status-success' : app.status === 'Rejected' ? 'status-danger' : 'status-warning'}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{app.remarks || 'Application under screening.'}</td>
                      {userRole === 'admin' && (
                        <td>
                          <select
                            className="form-select"
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            value={app.status}
                            onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No recruitment applications submitted yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RESUME VAULT */}
      {activeTab === 'resumes' && (
        <div className="dashboard-sections-grid">
          <div className="panel-card">
            <div className="panel-card-header"><h3 className="panel-card-title">Upload New Resume Document</h3></div>
            <div className="panel-card-body">
              <form onSubmit={handleUploadResume}>
                <div className="form-group">
                  <label>Resume Version Title</label>
                  <input
                    type="text" required className="form-input"
                    value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Select Document (PDF / DOCX)</label>
                  <input
                    type="file" required accept=".pdf,.docx,.doc" className="form-input"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload to Placement Vault'}
                </button>
              </form>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header"><h3 className="panel-card-title">Active Resumes on Record</h3></div>
            <div className="panel-card-body">
              {resumes.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{r.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      File: {r.file_name} | Uploaded: {r.uploaded_at}
                    </div>
                  </div>
                  <button type="button" onClick={() => openExternal(apiUrl(`/api/placements/resumes/${r.id}/download`))}
                    className="btn-secondary"
                    style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '12px' }}
                  >
                    Download Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RESUME BUILDER */}
      {activeTab === 'builder' && resumeData && (
        <div className="dashboard-sections-grid">
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Candidate Profile & Credentials Form</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowResumePreview(true)}>
                Preview Formatted Resume
              </button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSaveResumeBuilder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text" className="form-input" value={resumeData.full_name}
                      onChange={(e) => setResumeData({ ...resumeData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Professional Headline</label>
                    <input
                      type="text" className="form-input" value={resumeData.headline}
                      onChange={(e) => setResumeData({ ...resumeData, headline: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email" className="form-input" value={resumeData.email}
                      onChange={(e) => setResumeData({ ...resumeData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text" className="form-input" value={resumeData.phone}
                      onChange={(e) => setResumeData({ ...resumeData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Executive Professional Summary</label>
                  <textarea
                    rows="3" className="form-input" value={resumeData.summary}
                    onChange={(e) => setResumeData({ ...resumeData, summary: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Technical Skills (Comma Separated)</label>
                  <input
                    type="text" className="form-input"
                    value={Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills}
                    onChange={(e) => setResumeData({ ...resumeData, skills: e.target.value.split(',').map(s => s.trim()) })}
                  />
                </div>

                <div className="form-group">
                  <label>Certifications (Comma Separated)</label>
                  <input
                    type="text" className="form-input"
                    value={Array.isArray(resumeData.certifications) ? resumeData.certifications.join(', ') : resumeData.certifications}
                    onChange={(e) => setResumeData({ ...resumeData, certifications: e.target.value.split(',').map(s => s.trim()) })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Save Resume Profile
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowResumePreview(true)}>
                    Printable Preview
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Preview Card */}
          <div className="panel-card">
            <div className="panel-card-header"><h3 className="panel-card-title">Live Resume Sheet Preview</h3></div>
            <div className="panel-card-body" style={{ background: '#ffffff', padding: '20px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{resumeData.full_name}</h2>
                <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 600 }}>{resumeData.headline}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {resumeData.email} | {resumeData.phone} | Bangalore, India
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px' }}>
                  Professional Summary
                </div>
                <p style={{ fontSize: '11px', color: '#334155', margin: 0 }}>{resumeData.summary}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px' }}>
                  Technical Proficiencies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(resumeData.skills || []).map((s, i) => (
                    <span key={i} className="status-pill status-neutral" style={{ fontSize: '10px' }}>{s}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px' }}>
                  Education
                </div>
                {(resumeData.education || []).map((ed, i) => (
                  <div key={i} style={{ fontSize: '11px', marginBottom: '4px' }}>
                    <strong>{ed.degree}</strong> - {ed.institution} ({ed.year}) | <strong>{ed.score}</strong>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px' }}>
                  Key Academic Projects
                </div>
                {(resumeData.projects || []).map((pj, i) => (
                  <div key={i} style={{ fontSize: '11px', marginBottom: '4px' }}>
                    <strong>{pj.title}</strong> [{pj.tech}]: {pj.description}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INTERVIEW PREPARATION */}
      {activeTab === 'prep' && (
        <div className="dashboard-sections-grid">
          <div className="panel-card">
            <div className="panel-card-header"><h3 className="panel-card-title">Technical Knowledge Repositories</h3></div>
            <div className="panel-card-body">
              {prepData.resources.map((res) => (
                <div key={res.id} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{res.title}</div>
                    <span className="status-pill status-neutral">{res.category}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0' }}>{res.description}</p>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Key Focus Topics: <strong>{res.key_topics}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Mock Interview Question Bank</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Click to Reveal Model Answers</span>
            </div>
            <div className="panel-card-body">
              {prepData.mock_questions.map((q) => (
                <div key={q.id} style={{ marginBottom: '14px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{ background: '#f8fafc', padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setRevealedQuestionId(revealedQuestionId === q.id ? null : q.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{q.question}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Tags: {q.company_tags} | Category: {q.category}
                      </div>
                    </div>
                    <span className={`status-pill ${q.difficulty === 'Hard' ? 'status-danger' : 'status-warning'}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  {revealedQuestionId === q.id && (
                    <div style={{ padding: '12px 14px', background: '#ffffff', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                      <strong style={{ color: '#15803d' }}>Model Solution & Architecture Approach:</strong>
                      <div style={{ marginTop: '4px' }}>{q.sample_answer}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apply to Placement Drive */}
      {selectedDriveForApply && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '520px', margin: '20px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Apply for {selectedDriveForApply.company_name}</h3>
              <button type="button" className="btn-secondary" onClick={() => setSelectedDriveForApply(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleApply}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '4px', marginBottom: '14px', fontSize: '12px' }}>
                  <div>Role: <strong>{selectedDriveForApply.job_title}</strong></div>
                  <div>Compensation: <strong>{selectedDriveForApply.ctc_or_stipend}</strong></div>
                  <div>Minimum Required CGPA: <strong>{selectedDriveForApply.min_cgpa}</strong></div>
                  <div style={{ marginTop: '6px', color: '#15803d', fontWeight: 600 }}>
                    Eligibility Status: Verified (Student CGPA &gt;= Cutoff)
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Resume from Vault</label>
                  <select
                    className="form-select"
                    value={applyResumeName}
                    onChange={(e) => setApplyResumeName(e.target.value)}
                  >
                    <option value="alex_kumar_resume.pdf">Alex Kumar - Core Software Resume (Primary)</option>
                    <option value="systems_resume_v2.pdf">Alex Kumar - Distributed Systems Resume</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Submitting Application...' : 'Confirm & Submit Application'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setSelectedDriveForApply(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Placement Drive (Admin) */}
      {showAddDriveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '560px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Post New Campus Recruitment Drive</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowAddDriveModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleCreateDrive}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text" required className="form-input" value={driveForm.company_name}
                      onChange={(e) => setDriveForm({ ...driveForm, company_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Job Title</label>
                    <input
                      type="text" required className="form-input" value={driveForm.job_title}
                      onChange={(e) => setDriveForm({ ...driveForm, job_title: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Opportunity Type</label>
                    <select
                      className="form-select" value={driveForm.job_type}
                      onChange={(e) => setDriveForm({ ...driveForm, job_type: e.target.value })}
                    >
                      <option value="Full-time">Full-time (FTE)</option>
                      <option value="Internship">Summer Internship</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>CTC / Stipend</label>
                    <input
                      type="text" required placeholder="e.g. ₹28.0 LPA or ₹80,000 / month" className="form-input"
                      value={driveForm.ctc_or_stipend} onChange={(e) => setDriveForm({ ...driveForm, ctc_or_stipend: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Minimum CGPA</label>
                    <input
                      type="number" step="0.1" min="5" max="10" className="form-input"
                      value={driveForm.min_cgpa} onChange={(e) => setDriveForm({ ...driveForm, min_cgpa: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text" className="form-input" value={driveForm.location}
                      onChange={(e) => setDriveForm({ ...driveForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Required Technical Skills</label>
                  <input
                    type="text" placeholder="e.g. C++, Java, Distributed Systems" className="form-input"
                    value={driveForm.required_skills} onChange={(e) => setDriveForm({ ...driveForm, required_skills: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Job Description</label>
                  <textarea
                    rows="3" className="form-input" value={driveForm.description}
                    onChange={(e) => setDriveForm({ ...driveForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Application Deadline</label>
                    <input
                      type="date" required className="form-input" value={driveForm.deadline_date}
                      onChange={(e) => setDriveForm({ ...driveForm, deadline_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Drive Date</label>
                    <input
                      type="date" required className="form-input" value={driveForm.drive_date}
                      onChange={(e) => setDriveForm({ ...driveForm, drive_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Publish Placement Drive
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddDriveModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 11. PROJECTS HUB MODULE
// ==========================================================
export function ProjectsView({ userRole }) {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRole, setJoinRole] = useState('Frontend Engineer');
  const [joinMsg, setJoinMsg] = useState('');

  // Feedback Modal (Faculty)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState(48);
  const [feedbackComments, setFeedbackComments] = useState('');

  // Create Project Form
  const [projectForm, setProjectForm] = useState({
    title: '',
    category: 'Capstone Project',
    description: '',
    technologies: '',
    github_url: '',
    demo_url: '',
    team_status: 'Looking for Teammates',
    open_roles: '1 Systems Dev, 1 React UI Engineer',
    guide_name: 'Dr. Ramesh Rao'
  });
  const [docFile, setDocFile] = useState(null);

  const loadProjects = async () => {
    try {
      const q = new URLSearchParams();
      if (categoryFilter !== 'ALL') q.append('category', categoryFilter);
      if (teamFilter !== 'ALL') q.append('team_status', teamFilter);
      if (searchTerm) q.append('search', searchTerm);
      const res = await apiRequest(`/projects?${q.toString()}`);
      setProjects(res.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [categoryFilter, teamFilter]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    const formData = new FormData();
    Object.keys(projectForm).forEach(k => formData.append(k, projectForm[k]));
    if (docFile) formData.append('document_file', docFile);

    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to showcase project');

      setMsg(data.message);
      setShowCreateModal(false);
      setDocFile(null);
      loadProjects();
    } catch (err) {
      setError(err.message || 'Project registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendJoinRequest = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest(`/projects/${selectedProject.id}/teammate-request`, {
        method: 'POST',
        body: JSON.stringify({
          role_applied: joinRole,
          message: joinMsg,
          requester_name: 'Alex Kumar',
          requester_usn: '1MS21CS084'
        })
      });
      setMsg(res.message);
      setShowJoinModal(false);
      setJoinMsg('');
    } catch (err) {
      setError(err.message || 'Failed to submit teammate request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest(`/projects/${selectedProject.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          faculty_name: userRole === 'faculty' ? 'Dr. Ramesh Rao' : 'Dean Academics',
          score: parseInt(feedbackScore, 10),
          max_score: 50,
          comments: feedbackComments
        })
      });
      setMsg(res.message);
      setShowFeedbackModal(false);
      setFeedbackComments('');
      loadProjects();
    } catch (err) {
      setError(err.message || 'Failed to submit evaluation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="banner-card">
        <div>
          <div className="banner-title">Academic Projects Hub & Collaborative Innovation</div>
          <div className="banner-sub">
            Showcase capstone prototypes, discover teammate openings, coordinate with faculty guides, and track evaluations.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Filter and Showcase Action Header */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search projects by title, stack, keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProjects()}
            />
          </div>

          <div>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Capstone Project">Capstone Project</option>
              <option value="Mini Project">Mini Project</option>
              <option value="Research">Research & Papers</option>
              <option value="Open Source">Open Source Tooling</option>
            </select>
          </div>

          <div>
            <select
              className="form-select"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="ALL">All Team Statuses</option>
              <option value="Looking for Teammates">Looking for Teammates</option>
              <option value="Team Full">Team Full</option>
            </select>
          </div>

          <button type="button" className="btn-secondary" onClick={loadProjects}>Search</button>

          <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Showcase Academic Project
          </button>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {projects.map((p) => (
          <div key={p.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-card-header">
              <div>
                <h3 className="panel-card-title">{p.title}</h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Author: <strong>{p.student_name}</strong> ({p.usn})
                </div>
              </div>
              <span className="status-pill status-neutral">{p.category}</span>
            </div>

            <div className="panel-card-body" style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#334155', marginBottom: '12px' }}>
                {p.description}
              </p>

              <div style={{ marginBottom: '10px' }}>
                <div className="stat-label">Technologies Used:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {p.technologies.split(',').map((t, idx) => (
                    <span key={idx} className="status-pill status-neutral" style={{ fontSize: '10px' }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                <div>Faculty Guide: <strong>{p.guide_name || 'Dr. Ramesh Rao'}</strong> ({p.guide_status})</div>
                {p.team_status === 'Looking for Teammates' ? (
                  <div style={{ marginTop: '4px', color: '#b45309' }}>
                    Open Slots: <strong>{p.open_roles || 'Open Collaboration'}</strong>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', color: '#15803d' }}>Team Status: Full</div>
                )}
                {p.avg_score && (
                  <div style={{ marginTop: '4px', color: '#1e3a8a', fontWeight: 600 }}>
                    Faculty Evaluation Score: {p.avg_score} / 50
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {p.github_url && (
                    <a
                      href={p.github_url} target="_blank" rel="noreferrer"
                      className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}
                    >
                      GitHub Repo
                    </a>
                  )}
                  {p.document_file && (
                    <button type="button" onClick={() => openExternal(apiUrl(`/api/projects/${p.id}/document/download`))}
                      className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}
                    >
                      Architecture PDF
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {p.team_status === 'Looking for Teammates' && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => { setSelectedProject(p); setShowJoinModal(true); }}
                    >
                      Join Team
                    </button>
                  )}

                  {(userRole === 'faculty' || userRole === 'admin') && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => { setSelectedProject(p); setShowFeedbackModal(true); }}
                    >
                      Evaluate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Showcase New Project */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '580px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Showcase New Academic Project</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleCreateProject}>
                <div className="form-group">
                  <label>Project Title</label>
                  <input
                    type="text" required className="form-input" value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Project Domain Category</label>
                    <select
                      className="form-select" value={projectForm.category}
                      onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                    >
                      <option value="Capstone Project">Capstone Project</option>
                      <option value="Mini Project">Mini Project</option>
                      <option value="Research">Research & Papers</option>
                      <option value="Open Source">Open Source Tooling</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Faculty Guide Mentor</label>
                    <input
                      type="text" className="form-input" value={projectForm.guide_name}
                      onChange={(e) => setProjectForm({ ...projectForm, guide_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Technologies Used (Comma Separated)</label>
                  <input
                    type="text" required placeholder="e.g. Go, Docker, gRPC, React.js" className="form-input"
                    value={projectForm.technologies} onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Detailed Abstract & Problem Statement</label>
                  <textarea
                    rows="3" required className="form-input" value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>GitHub Repository URL</label>
                    <input
                      type="url" placeholder="https://github.com/..." className="form-input"
                      value={projectForm.github_url} onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Live Hosted Prototype URL</label>
                    <input
                      type="url" placeholder="https://..." className="form-input"
                      value={projectForm.demo_url} onChange={(e) => setProjectForm({ ...projectForm, demo_url: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Team Recruitment Status</label>
                    <select
                      className="form-select" value={projectForm.team_status}
                      onChange={(e) => setProjectForm({ ...projectForm, team_status: e.target.value })}
                    >
                      <option value="Looking for Teammates">Looking for Teammates</option>
                      <option value="Team Full">Team Full</option>
                      <option value="Individual">Individual Work</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Open Teammate Roles</label>
                    <input
                      type="text" placeholder="e.g. 1 ML Engineer, 1 UI Dev" className="form-input"
                      value={projectForm.open_roles} onChange={(e) => setProjectForm({ ...projectForm, open_roles: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Project Architecture / Report Document (PDF)</label>
                  <input
                    type="file" accept=".pdf" className="form-input"
                    onChange={(e) => setDocFile(e.target.files[0])}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Publish Academic Project
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Teammate Join Request */}
      {showJoinModal && selectedProject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Join Project Team</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowJoinModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSendJoinRequest}>
                <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                  Applying to collaborate on: <strong>{selectedProject.title}</strong>
                </div>
                <div className="form-group">
                  <label>Role You Want to Fill</label>
                  <input
                    type="text" required className="form-input" value={joinRole}
                    onChange={(e) => setJoinRole(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Contribution Pitch / Message to Team Lead</label>
                  <textarea
                    rows="3" required placeholder="Describe your relevant skills, past tools, and availability..."
                    className="form-input" value={joinMsg} onChange={(e) => setJoinMsg(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Send Teammate Request
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowJoinModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Faculty Feedback & Evaluation */}
      {showFeedbackModal && selectedProject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Faculty Project Evaluation</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowFeedbackModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSendFeedback}>
                <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                  Project: <strong>{selectedProject.title}</strong>
                </div>
                <div className="form-group">
                  <label>Evaluation Marks (Max 50)</label>
                  <input
                    type="number" min="0" max="50" required className="form-input"
                    value={feedbackScore} onChange={(e) => setFeedbackScore(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Faculty Written Feedback & Assessment Remarks</label>
                  <textarea
                    rows="4" required placeholder="Comment on architecture design, testing rigor, and implementation quality..."
                    className="form-input" value={feedbackComments} onChange={(e) => setFeedbackComments(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Submit Evaluation
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 13. LIBRARY MODULE
// ==========================================================
export function LibraryView({ userRole }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'my_books', 'history', 'circulation'
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({ total_titles: 0, total_copies: 0, available_copies: 0, issued_copies: 0 });
  const [myBooks, setMyBooks] = useState({ borrowed_books: [], total_active: 0, total_overdue_fines: 0, reminders: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'Computer Science',
    publisher: '',
    edition: '1st Edition',
    shelf_location: 'Rack CS-01',
    total_copies: 5
  });

  const [editingBook, setEditingBook] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    category: '',
    publisher: '',
    edition: '',
    shelf_location: '',
    total_copies: 5
  });

  const [issuingBook, setIssuingBook] = useState(null);
  const [issueForm, setIssueForm] = useState({
    usn: '1MS21CS084',
    student_name: 'Alex Kumar',
    days: 14
  });

  const [returningRecord, setReturningRecord] = useState(null);
  const [returnRemarks, setReturnRemarks] = useState('Returned in good condition');

  const loadCatalog = async () => {
    try {
      setLoading(true);
      let url = '/library/books?';
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (categoryFilter !== 'ALL') url += `category=${encodeURIComponent(categoryFilter)}&`;
      if (availabilityFilter !== 'ALL') url += `availability=${encodeURIComponent(availabilityFilter.toLowerCase())}&`;
      const res = await apiRequest(url);
      setBooks(res.books || []);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      setError(err.message || 'Failed to load library catalog.');
    } finally {
      setLoading(false);
    }
  };

  const loadMyBooks = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/library/my-books?usn=1MS21CS084');
      setMyBooks(res);
    } catch (err) {
      setError(err.message || 'Failed to load borrowed books.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/library/history?usn=1MS21CS084');
      setHistory(res.history || []);
    } catch (err) {
      setError(err.message || 'Failed to load borrowing history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') loadCatalog();
    else if (activeTab === 'my_books') loadMyBooks();
    else if (activeTab === 'history') loadHistory();
    else if (activeTab === 'circulation') {
      loadCatalog();
      loadMyBooks();
    }
  }, [activeTab]);

  const handleAddBook = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/library/books', {
        method: 'POST',
        body: JSON.stringify(addForm)
      });
      setMsg(res.message);
      setShowAddModal(false);
      setAddForm({
        isbn: '',
        title: '',
        author: '',
        category: 'Computer Science',
        publisher: '',
        edition: '1st Edition',
        shelf_location: 'Rack CS-01',
        total_copies: 5
      });
      loadCatalog();
    } catch (err) {
      setError(err.message || 'Failed to add book.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBook = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest(`/library/books/${editingBook.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setMsg(res.message);
      setEditingBook(null);
      loadCatalog();
    } catch (err) {
      setError(err.message || 'Failed to update book.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (bookId, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the catalog?`)) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest(`/library/books/${bookId}`, {
        method: 'DELETE'
      });
      setMsg(res.message);
      loadCatalog();
    } catch (err) {
      setError(err.message || 'Failed to delete book.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    if (!issuingBook) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/library/issue', {
        method: 'POST',
        body: JSON.stringify({
          book_id: issuingBook.id,
          usn: issueForm.usn,
          student_name: issueForm.student_name,
          days: parseInt(issueForm.days, 10)
        })
      });
      setMsg(res.message);
      setIssuingBook(null);
      loadCatalog();
      if (activeTab === 'my_books' || activeTab === 'circulation') {
        loadMyBooks();
      }
    } catch (err) {
      setError(err.message || 'Failed to issue book.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBook = async (e) => {
    e.preventDefault();
    if (!returningRecord) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest(`/library/return/${returningRecord.id}`, {
        method: 'POST',
        body: JSON.stringify({ remarks: returnRemarks })
      });
      setMsg(res.message);
      setReturningRecord(null);
      setReturnRemarks('Returned in good condition');
      loadMyBooks();
      loadCatalog();
    } catch (err) {
      setError(err.message || 'Failed to process return.');
    } finally {
      setLoading(false);
    }
  };

  const isLibrarian = userRole === 'admin' || userRole === 'faculty';

  return (
    <div>
      {/* Module Title Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">University Central Library & Digital Knowledge Vault</div>
          <div className="banner-sub">
            Search textbook catalog, track borrowed book loans, review automated return reminders, and manage library circulation.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Tabs Navigation */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'catalog', label: 'Book Catalog & Search' },
            { id: 'my_books', label: `My Borrowed Books (${myBooks.total_active || 0})` },
            { id: 'history', label: 'Borrowing History' },
            ...(isLibrarian ? [{ id: 'circulation', label: 'Librarian Circulation Desk' }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: activeTab === tab.id ? '#1e3a8a' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : '#1e293b'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: BOOK CATALOG & SEARCH */}
      {activeTab === 'catalog' && (
        <div>
          {/* Summary Metric Stats */}
          <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-label">Catalog Titles</div>
              <div className="stat-value">{stats.total_titles}</div>
              <div className="stat-sub">Indexed textbook titles</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Inventory Copies</div>
              <div className="stat-value">{stats.total_copies}</div>
              <div className="stat-sub">Physical shelf stock</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Available for Lending</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>{stats.available_copies}</div>
              <div className="stat-sub">Ready for checkout</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Currently Issued</div>
              <div className="stat-value" style={{ color: '#2563eb' }}>{stats.issued_copies}</div>
              <div className="stat-sub">On active student loans</div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by title, author, ISBN, or shelf location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadCatalog()}
                />
              </div>

              <div>
                <select
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics & Statistics">Mathematics & Statistics</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Information Science">Information Science</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                >
                  <option value="ALL">All Availability</option>
                  <option value="available">Available Copies Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <button type="button" className="btn-secondary" onClick={loadCatalog}>
                Search
              </button>

              {isLibrarian && (
                <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
                  + Add Book to Catalog
                </button>
              )}
            </div>
          </div>

          {/* Books Table */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Indexed Academic Books & Repositories</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Showing {books.length} volumes</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Book Title & Edition</th>
                    <th>Author & Publisher</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th>Shelf Rack</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No books matching your query criteria.
                      </td>
                    </tr>
                  ) : (
                    books.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.title}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{b.edition}</div>
                        </td>
                        <td>
                          <div>{b.author}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{b.publisher}</div>
                        </td>
                        <td><code>{b.isbn}</code></td>
                        <td><span className="status-pill status-neutral">{b.category}</span></td>
                        <td><strong>{b.shelf_location}</strong></td>
                        <td>
                          <span className={`status-pill ${b.available_copies > 0 ? 'status-success' : 'status-danger'}`}>
                            {b.available_copies} of {b.total_copies} Available
                          </span>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {b.issued_copies} checked out
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {isLibrarian ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  disabled={b.available_copies === 0}
                                  onClick={() => {
                                    setIssuingBook(b);
                                    setIssueForm({ usn: '1MS21CS084', student_name: 'Alex Kumar', days: 14 });
                                  }}
                                >
                                  Issue
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => {
                                    setEditingBook(b);
                                    setEditForm({
                                      title: b.title,
                                      author: b.author,
                                      category: b.category,
                                      publisher: b.publisher,
                                      edition: b.edition,
                                      shelf_location: b.shelf_location,
                                      total_copies: b.total_copies
                                    });
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-danger"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleDeleteBook(b.id, b.title)}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => {
                                  if (b.available_copies > 0) {
                                    alert(`Book is currently available on shelf ${b.shelf_location}. Visit the circulation counter with student ID to issue.`);
                                  } else {
                                    alert(`All copies are currently issued. Expected return queue active.`);
                                  }
                                }}
                              >
                                View Shelf
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY BORROWED BOOKS & RETURN REMINDERS */}
      {activeTab === 'my_books' && (
        <div>
          {/* Overdue Alerts & Return Reminders Notice Banner */}
          {myBooks.reminders && myBooks.reminders.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              {myBooks.reminders.map((rem, idx) => (
                <div
                  key={idx}
                  className={`alert-box ${rem.severity === 'high' ? 'alert-danger' : 'alert-warning'}`}
                  style={{ marginBottom: '8px' }}
                >
                  <strong>[{rem.type}] </strong>
                  {rem.message}
                </div>
              ))}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-label">Active Loans</div>
              <div className="stat-value">{myBooks.total_active || 0}</div>
              <div className="stat-sub">Books currently in possession</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Maximum Allowed Limit</div>
              <div className="stat-value">4</div>
              <div className="stat-sub">UG student quota</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Accrued Overdue Fines</div>
              <div className="stat-value" style={{ color: myBooks.total_overdue_fines > 0 ? '#dc2626' : '#16a34a' }}>
                Rs {Number(myBooks.total_overdue_fines || 0).toFixed(2)}
              </div>
              <div className="stat-sub">Late fee rate: Rs 2.00 / day</div>
            </div>
          </div>

          {/* Active Borrowed Books Table */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Currently Borrowed Volumes</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Borrower USN: 1MS21CS084</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Author & Shelf</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Loan Status</th>
                    <th>Fine Accrued</th>
                    <th>Circulation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(!myBooks.borrowed_books || myBooks.borrowed_books.length === 0) ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No active book loans on your student record.
                      </td>
                    </tr>
                  ) : (
                    myBooks.borrowed_books.map((rec) => (
                      <tr key={rec.id}>
                        <td>
                          <strong>{rec.title}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>ISBN: {rec.isbn}</div>
                        </td>
                        <td>
                          <div>{rec.author}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Shelf: {rec.shelf_location}</div>
                        </td>
                        <td>{rec.issue_date}</td>
                        <td><strong>{rec.due_date}</strong></td>
                        <td>
                          {rec.status === 'Overdue' ? (
                            <span className="status-pill status-danger">
                              Overdue by {rec.overdue_days} day(s)
                            </span>
                          ) : (
                            <span className="status-pill status-success">
                              {rec.days_remaining} day(s) remaining
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: '600', color: rec.calculated_fine > 0 ? '#dc2626' : '#16a34a' }}>
                            Rs {Number(rec.calculated_fine || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setReturningRecord(rec);
                              setReturnRemarks('Returned in good condition');
                            }}
                          >
                            Return Book
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BORROWING HISTORY */}
      {activeTab === 'history' && (
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Completed Borrowing History & Clearance Ledger</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Past returned volumes</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Issue Date</th>
                  <th>Return Date</th>
                  <th>Clearance Status</th>
                  <th>Fine Paid</th>
                  <th>Librarian Remarks</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No past borrowing history on record.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.title}</strong></td>
                      <td>{h.author}</td>
                      <td><span className="status-pill status-neutral">{h.category}</span></td>
                      <td>{h.issue_date}</td>
                      <td>{h.return_date || '-'}</td>
                      <td><span className="status-pill status-success">Returned</span></td>
                      <td>Rs {Number(h.fine_amount || 0).toFixed(2)}</td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>{h.librarian_remarks || 'Returned on schedule'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LIBRARIAN CIRCULATION DESK (FACULTY / ADMIN ONLY) */}
      {activeTab === 'circulation' && isLibrarian && (
        <div className="dashboard-sections-grid">
          {/* Quick Issue Panel */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Issue Book to Student</h3>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleIssueBook}>
                <div className="form-group">
                  <label>Select Textbook from Catalog</label>
                  <select
                    className="form-select"
                    value={issuingBook ? issuingBook.id : ''}
                    onChange={(e) => {
                      const found = books.find(b => b.id === parseInt(e.target.value, 10));
                      setIssuingBook(found || null);
                    }}
                    required
                  >
                    <option value="">-- Choose Book --</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id} disabled={b.available_copies <= 0}>
                        {b.title} ({b.available_copies} available) - {b.shelf_location}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Student USN</label>
                    <input
                      type="text"
                      className="form-input"
                      value={issueForm.usn}
                      onChange={(e) => setIssueForm({ ...issueForm, usn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Student Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={issueForm.student_name}
                      onChange={(e) => setIssueForm({ ...issueForm, student_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Lending Period (Days)</label>
                  <select
                    className="form-select"
                    value={issueForm.days}
                    onChange={(e) => setIssueForm({ ...issueForm, days: parseInt(e.target.value, 10) })}
                  >
                    <option value={7}>7 Days (Reserve Loan)</option>
                    <option value={14}>14 Days (Standard Student Loan)</option>
                    <option value={28}>28 Days (Faculty / Research Loan)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!issuingBook || issuingBook.available_copies <= 0 || loading}
                >
                  Confirm Issue & Record Loan
                </button>
              </form>
            </div>
          </div>

          {/* Quick Return Ledger Panel */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Active Circulation Returns</h3>
            </div>
            <div className="panel-card-body">
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                Inspect student borrow records, calculate late fines automatically at Rs 2.00/day, and clear shelf records.
              </p>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Book</th>
                      <th>Due Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!myBooks.borrowed_books || myBooks.borrowed_books.length === 0) ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          No active loan records for this test student.
                        </td>
                      </tr>
                    ) : (
                      myBooks.borrowed_books.map(b => (
                        <tr key={b.id}>
                          <td><strong>{b.student_name}</strong><br /><span style={{ fontSize: '11px', color: '#64748b' }}>{b.usn}</span></td>
                          <td>{b.title}</td>
                          <td>{b.due_date}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => {
                                setReturningRecord(b);
                                setReturnRemarks('Returned via Circulation Counter');
                              }}
                            >
                              Process Return
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW BOOK */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Add New Textbook to Catalog</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleAddBook}>
                <div className="form-group">
                  <label>ISBN Identifier</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. 978-0131103627"
                    value={addForm.isbn} onChange={(e) => setAddForm({ ...addForm, isbn: e.target.value })} required
                  />
                </div>
                <div className="form-group">
                  <label>Textbook Title</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. Database System Concepts"
                    value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Author(s)</label>
                    <input
                      type="text" className="form-input" placeholder="e.g. Silberschatz, Korth, Sudarshan"
                      value={addForm.author} onChange={(e) => setAddForm({ ...addForm, author: e.target.value })} required
                    />
                  </div>
                  <div className="form-group">
                    <label>Academic Category</label>
                    <select
                      className="form-select"
                      value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Mathematics & Statistics">Mathematics & Statistics</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Information Science">Information Science</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Publisher</label>
                    <input
                      type="text" className="form-input" placeholder="e.g. McGraw-Hill"
                      value={addForm.publisher} onChange={(e) => setAddForm({ ...addForm, publisher: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Edition</label>
                    <input
                      type="text" className="form-input" placeholder="e.g. 7th Edition"
                      value={addForm.edition} onChange={(e) => setAddForm({ ...addForm, edition: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Shelf Location</label>
                    <input
                      type="text" className="form-input" placeholder="e.g. Rack CS-04"
                      value={addForm.shelf_location} onChange={(e) => setAddForm({ ...addForm, shelf_location: e.target.value })} required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Copies</label>
                    <input
                      type="number" min="1" className="form-input"
                      value={addForm.total_copies} onChange={(e) => setAddForm({ ...addForm, total_copies: parseInt(e.target.value, 10) || 1 })} required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Save Textbook</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BOOK */}
      {editingBook && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Edit Book: {editingBook.title}</h3>
              <button type="button" className="btn-secondary" onClick={() => setEditingBook(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleUpdateBook}>
                <div className="form-group">
                  <label>Textbook Title</label>
                  <input
                    type="text" className="form-input"
                    value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Author</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.author} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} required
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Publisher</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.publisher} onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Edition</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.edition} onChange={(e) => setEditForm({ ...editForm, edition: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Shelf Location</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.shelf_location} onChange={(e) => setEditForm({ ...editForm, shelf_location: e.target.value })} required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Copies (Min: {editingBook.issued_copies})</label>
                    <input
                      type="number" min={editingBook.issued_copies} className="form-input"
                      value={editForm.total_copies} onChange={(e) => setEditForm({ ...editForm, total_copies: parseInt(e.target.value, 10) || editingBook.issued_copies })} required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingBook(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Update Book</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE BOOK */}
      {issuingBook && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '480px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Issue Book to Student</h3>
              <button type="button" className="btn-secondary" onClick={() => setIssuingBook(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '13px' }}>
                <div>Book: <strong>{issuingBook.title}</strong></div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Shelf: {issuingBook.shelf_location} | Available: {issuingBook.available_copies}</div>
              </div>
              <form onSubmit={handleIssueBook}>
                <div className="form-group">
                  <label>Student USN</label>
                  <input
                    type="text" className="form-input"
                    value={issueForm.usn} onChange={(e) => setIssueForm({ ...issueForm, usn: e.target.value })} required
                  />
                </div>
                <div className="form-group">
                  <label>Student Full Name</label>
                  <input
                    type="text" className="form-input"
                    value={issueForm.student_name} onChange={(e) => setIssueForm({ ...issueForm, student_name: e.target.value })} required
                  />
                </div>
                <div className="form-group">
                  <label>Loan Duration</label>
                  <select
                    className="form-select"
                    value={issueForm.days} onChange={(e) => setIssueForm({ ...issueForm, days: parseInt(e.target.value, 10) })}
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days (Standard)</option>
                    <option value={28}>28 Days</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIssuingBook(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Confirm Issue</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RETURN BOOK */}
      {returningRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '480px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Process Book Return</h3>
              <button type="button" className="btn-secondary" onClick={() => setReturningRecord(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '13px' }}>
                <div>Book: <strong>{returningRecord.title}</strong></div>
                <div>Due Date: <strong>{returningRecord.due_date}</strong></div>
                {returningRecord.calculated_fine > 0 ? (
                  <div style={{ color: '#dc2626', marginTop: '4px' }}>
                    Late Fine Accrued: <strong>Rs {Number(returningRecord.calculated_fine).toFixed(2)}</strong>
                  </div>
                ) : (
                  <div style={{ color: '#16a34a', marginTop: '4px' }}>
                    Returned within due date. Zero fine.
                  </div>
                )}
              </div>
              <form onSubmit={handleReturnBook}>
                <div className="form-group">
                  <label>Clearance Remarks</label>
                  <input
                    type="text" className="form-input"
                    value={returnRemarks} onChange={(e) => setReturnRemarks(e.target.value)} required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setReturningRecord(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Confirm Return & Clear Record</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 14. CAMPUS SERVICES MODULE
// ==========================================================
export function CampusServicesView({ userRole }) {
  const [activeTab, setActiveTab] = useState('bus'); // 'bus', 'map', 'canteen', 'lost_found', 'facilities'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // 1. Bus Tracking State
  const [busRoutes, setBusRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [busDisclaimer, setBusDisclaimer] = useState('');

  // 2. Campus Map State
  const [selectedBuildingId, setSelectedBuildingId] = useState('cs_block');
  const [mapSearch, setMapSearch] = useState('');

  // 3. Canteen State
  const [canteenInfo, setCanteenInfo] = useState(null);
  const [canteenMenu, setCanteenMenu] = useState([]);
  const [canteenCategory, setCanteenCategory] = useState('ALL');
  const [canteenDietary, setCanteenDietary] = useState('ALL');
  const [canteenSearch, setCanteenSearch] = useState('');

  // 4. Lost & Found State
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [lfTypeFilter, setLfTypeFilter] = useState('ALL');
  const [lfCategoryFilter, setLfCategoryFilter] = useState('ALL');
  const [lfStatusFilter, setLfStatusFilter] = useState('ALL');
  const [lfSearch, setLfSearch] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    report_type: 'Lost',
    item_title: '',
    category: 'Personal Items',
    location_reported: '',
    date_reported: new Date().toISOString().split('T')[0],
    description: '',
    reporter_name: 'Alex Kumar',
    reporter_usn: '1MS21CS084',
    contact_email: 'student@college.edu',
    contact_phone: '+91 98765 43210',
    claim_instructions: 'Contact reporter directly or check with department office.'
  });
  const [contactingItem, setContactingItem] = useState(null);
  const [itemMessages, setItemMessages] = useState([]);
  const [inquiryText, setInquiryText] = useState('');

  // 5. Facilities State
  const [facilities, setFacilities] = useState([]);
  const [facilityCategory, setFacilityCategory] = useState('ALL');
  const [facilitySearch, setFacilitySearch] = useState('');

  // LOAD DATA FUNCTIONS
  const loadBusRoutes = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/services/bus-routes');
      setBusRoutes(res.routes || []);
      setBusDisclaimer(res.tracking_disclaimer || '');
    } catch (err) {
      setError(err.message || 'Failed to load transit routes.');
    } finally {
      setLoading(false);
    }
  };

  const loadCanteen = async () => {
    try {
      setLoading(true);
      let url = '/services/canteen?';
      if (canteenCategory !== 'ALL') url += `category=${encodeURIComponent(canteenCategory)}&`;
      if (canteenDietary !== 'ALL') url += `dietary=${encodeURIComponent(canteenDietary)}&`;
      if (canteenSearch) url += `search=${encodeURIComponent(canteenSearch)}&`;
      const res = await apiRequest(url);
      setCanteenInfo(res.info || null);
      setCanteenMenu(res.menu || []);
    } catch (err) {
      setError(err.message || 'Failed to load canteen menu.');
    } finally {
      setLoading(false);
    }
  };

  const loadLostFound = async () => {
    try {
      setLoading(true);
      let url = '/services/lost-found?';
      if (lfTypeFilter !== 'ALL') url += `type=${encodeURIComponent(lfTypeFilter)}&`;
      if (lfCategoryFilter !== 'ALL') url += `category=${encodeURIComponent(lfCategoryFilter)}&`;
      if (lfStatusFilter !== 'ALL') url += `status=${encodeURIComponent(lfStatusFilter)}&`;
      if (lfSearch) url += `search=${encodeURIComponent(lfSearch)}&`;
      const res = await apiRequest(url);
      setLostFoundItems(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load lost and found items.');
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async () => {
    try {
      setLoading(true);
      let url = '/services/facilities?';
      if (facilityCategory !== 'ALL') url += `category=${encodeURIComponent(facilityCategory)}&`;
      if (facilitySearch) url += `search=${encodeURIComponent(facilitySearch)}&`;
      const res = await apiRequest(url);
      setFacilities(res.facilities || []);
    } catch (err) {
      setError(err.message || 'Failed to load campus facilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bus') loadBusRoutes();
    else if (activeTab === 'canteen') loadCanteen();
    else if (activeTab === 'lost_found') loadLostFound();
    else if (activeTab === 'facilities') loadFacilities();
  }, [activeTab]);

  // Canteen Toggle Availability
  const handleToggleAvailability = async (itemId, currentAvailability) => {
    const newAvail = currentAvailability === 'Available' ? 'Sold Out' : 'Available';
    try {
      setLoading(true);
      const res = await apiRequest(`/services/canteen/${itemId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ availability: newAvail })
      });
      setMsg(res.message);
      loadCanteen();
    } catch (err) {
      setError(err.message || 'Failed to update item availability.');
    } finally {
      setLoading(false);
    }
  };

  // Lost & Found Handlers
  const handleCreateReport = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/services/lost-found', {
        method: 'POST',
        body: JSON.stringify(reportForm)
      });
      setMsg(res.message);
      setShowReportModal(false);
      setReportForm({
        report_type: 'Lost',
        item_title: '',
        category: 'Personal Items',
        location_reported: '',
        date_reported: new Date().toISOString().split('T')[0],
        description: '',
        reporter_name: 'Alex Kumar',
        reporter_usn: '1MS21CS084',
        contact_email: 'student@college.edu',
        contact_phone: '+91 98765 43210',
        claim_instructions: 'Contact reporter directly or check with department office.'
      });
      loadLostFound();
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      setLoading(true);
      const res = await apiRequest(`/services/lost-found/${itemId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setMsg(res.message);
      loadLostFound();
    } catch (err) {
      setError(err.message || 'Failed to update report status.');
    } finally {
      setLoading(false);
    }
  };

  const openContactModal = async (item) => {
    setContactingItem(item);
    setInquiryText('');
    try {
      const res = await apiRequest(`/services/lost-found/${item.id}/messages`);
      setItemMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!contactingItem || !inquiryText.trim()) return;
    try {
      const res = await apiRequest(`/services/lost-found/${contactingItem.id}/message`, {
        method: 'POST',
        body: JSON.stringify({
          sender_name: 'Alex Kumar',
          sender_usn: '1MS21CS084',
          sender_contact: '+91 98765 43210',
          message: inquiryText.trim()
        })
      });
      setMsg(res.message);
      setInquiryText('');
      const updated = await apiRequest(`/services/lost-found/${contactingItem.id}/messages`);
      setItemMessages(updated.messages || []);
      loadLostFound();
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    }
  };

  // Campus Map Directory Data
  const campusBuildings = [
    {
      id: 'admin_block',
      code: 'ADM-01',
      name: 'Main Administrative Block',
      category: 'Administration',
      floors: 'Ground + 3 Floors',
      departments: 'Principal Secretariat, Admissions, Registrar, Examination Controller, Student Welfare Desk',
      timings: '09:00 AM - 05:00 PM (Mon-Sat)',
      in_charge: 'Dr. K. S. Anand (Dean of Academic Affairs)',
      contact: 'Intercom 101 / +91 80 2345 6700',
      description: 'Central administrative headquarters handling student records, scholarship endorsements, and fee counters.'
    },
    {
      id: 'cs_block',
      code: 'CS-02',
      name: 'Department of Computer Science & Engineering',
      category: 'Academic Departments',
      floors: 'Ground + 4 Floors',
      departments: 'Computer Science, AI & Machine Learning, Data Science, High Performance Computing Labs',
      timings: '08:00 AM - 07:00 PM (Mon-Sat)',
      in_charge: 'Dr. Ramesh Rao (Head of Department)',
      contact: 'Intercom 201 / +91 80 2345 6701',
      description: 'Houses 8 software laboratories, faculty chambers, smart classrooms, and graduate research clusters.'
    },
    {
      id: 'is_ec_block',
      code: 'EC-03',
      name: 'Electronics & Information Science Complex',
      category: 'Academic Departments',
      floors: 'Ground + 4 Floors',
      departments: 'Electronics & Communication, Information Science, VLSI & Embedded Systems',
      timings: '08:00 AM - 06:30 PM (Mon-Sat)',
      in_charge: 'Dr. Geetha S. (HoD ECE)',
      contact: 'Intercom 301 / +91 80 2345 6703',
      description: 'Equipped with hardware testbenches, signal processing studios, and microprocessor fabrication suites.'
    },
    {
      id: 'library_vault',
      code: 'LIB-04',
      name: 'Central University Library & Digital Vault',
      category: 'Amenities & Utilities',
      floors: 'Ground + 2 Floors',
      departments: 'Circulation Desk, IEEE Digital Vault, Reference Stacks, Quiet Reading Cubicles',
      timings: '08:00 AM - 10:00 PM (Mon-Sat)',
      in_charge: 'Dr. Meenakshi Sundaram (Chief Librarian)',
      contact: 'Intercom 401 / +91 80 2345 6705',
      description: 'Houses 65,000 physical volumes, 120 e-learning workstations, journal archives, and group discussion rooms.'
    },
    {
      id: 'central_labs',
      code: 'LAB-05',
      name: 'Central Computing & Systems Laboratories',
      category: 'Laboratories',
      floors: 'Ground + 2 Floors',
      departments: 'Operating Systems Lab, Network Security Lab, Cloud Simulation Center, AI Cluster 304',
      timings: '08:00 AM - 08:00 PM (Mon-Sat)',
      in_charge: 'Prof. Anil Deshmukh (Lab Director)',
      contact: 'Intercom 501 / +91 80 2345 6708',
      description: '450 high-end Linux workstations connected via 10 Gbps backbone with uninterrupted UPS conditioning.'
    },
    {
      id: 'canteen_plaza',
      code: 'CAN-06',
      name: 'Central Student Plaza & Food Court',
      category: 'Food & Dining',
      floors: 'Ground Floor + Mezzanine',
      departments: 'Main Dining Hall, South & North Indian Food Counters, Fruit & Juice Bar, Snack Kiosk',
      timings: '07:30 AM - 08:30 PM (Daily)',
      in_charge: 'Mr. Raghavendra Kamath (Catering Manager)',
      contact: 'Intercom 601 / +91 80 2345 6750',
      description: 'Hygienic multi-cuisine dining hall with seating capacity of 600 students and cashless payment system.'
    },
    {
      id: 'health_clinic',
      code: 'MED-07',
      name: 'Campus Health & Emergency Care Pavilion',
      category: 'Medical & Health',
      floors: 'Ground Floor',
      departments: 'Resident Physician Consultation, 6-Bed Observation Ward, 24/7 Ambulance Bay, Pharmacy',
      timings: '24 Hours / 7 Days (Continuous Emergency Service)',
      in_charge: 'Dr. Sunita Varma (Senior Medical Officer)',
      contact: 'Emergency Intercom 911 / +91 80 2345 6799',
      description: 'Provides primary emergency medical treatment, first response care, diagnostic ECG, and urgent hospital transfers.'
    },
    {
      id: 'sports_pavilion',
      code: 'SPT-08',
      name: 'Indoor Sports Arena & Athletic Complex',
      category: 'Sports & Fitness',
      floors: 'Ground + 1 Floor',
      departments: 'Badminton Courts, Table Tennis Arena, Olympic Weightlifting Gym, Coaches Office',
      timings: '06:00 AM - 09:00 AM & 04:30 PM - 08:30 PM',
      in_charge: 'Mr. B. K. Prasad (Sports Director)',
      contact: 'Intercom 701 / +91 80 2345 6712',
      description: 'Multi-discipline indoor sports complex featuring wooden competition courts and cardiovascular fitness gym.'
    },
    {
      id: 'auditorium_hall',
      code: 'AUD-09',
      name: 'APEX Convocation Auditorium & Green Hall',
      category: 'Auditoriums & Halls',
      floors: 'Ground + Balcony',
      departments: 'Main Stage, Green Rooms, Audio Control Room, Media Broadcast Booth',
      timings: 'Scheduled Events / 08:30 AM - 09:30 PM',
      in_charge: 'Mr. K. V. Satish (Estate Operations)',
      contact: 'Intercom 801 / +91 80 2345 6720',
      description: 'Acoustically designed 1,200-seat amphitheater equipped with 4K projection and surround audio.'
    }
  ];

  const selectedBuilding = campusBuildings.find(b => b.id === selectedBuildingId) || campusBuildings[0];

  const filteredBuildings = campusBuildings.filter(b => {
    if (!mapSearch) return true;
    const q = mapSearch.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.departments.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Title Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">Campus Auxiliary Services & Facilities Portal</div>
          <div className="banner-sub">
            College transit bus routes, interactive campus map directory, central food court menus, lost & found registry, and institutional facilities.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Services Sub-Tabs */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'bus', label: 'College Bus Tracking & Transit' },
            { id: 'map', label: 'Interactive Campus Map & Directory' },
            { id: 'canteen', label: 'Canteen & Food Court' },
            { id: 'lost_found', label: `Lost and Found (${lostFoundItems.length || 0})` },
            { id: 'facilities', label: 'Campus Facilities' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: activeTab === tab.id ? '#1e3a8a' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : '#1e293b'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================== */}
      {/* 1. BUS TRACKING & TRANSIT TAB */}
      {/* ========================================================== */}
      {activeTab === 'bus' && (
        <div>
          {/* Simulation Disclaimer Banner */}
          <div className="alert-box alert-warning" style={{ marginBottom: '16px' }}>
            <strong>Notice on Bus Telematics: </strong>
            {busDisclaimer || 'Simulation / Demo Tracking Mode Active. Hardware GPS satellite telematics are currently simulated for demonstration.'}
          </div>

          {/* Route Selector Pills */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Select Transit Route:</span>
              {busRoutes.map((r, idx) => (
                <button
                  key={r.id}
                  type="button"
                  className="btn-secondary"
                  style={{
                    backgroundColor: selectedRouteIdx === idx ? '#1e3a8a' : '#ffffff',
                    color: selectedRouteIdx === idx ? '#ffffff' : '#1e293b'
                  }}
                  onClick={() => setSelectedRouteIdx(idx)}
                >
                  {r.route_number}: {r.start_point} to {r.end_point}
                </button>
              ))}
            </div>
          </div>

          {busRoutes.length > 0 && busRoutes[selectedRouteIdx] && (() => {
            const currentRoute = busRoutes[selectedRouteIdx];
            return (
              <div>
                {/* Active Route Overview Card */}
                <div className="panel-card" style={{ marginBottom: '16px' }}>
                  <div className="panel-card-header">
                    <div>
                      <h3 className="panel-card-title">{currentRoute.route_number} - {currentRoute.start_point} to {currentRoute.end_point}</h3>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Vehicle: <strong>{currentRoute.bus_number}</strong></div>
                    </div>
                    <span className="status-pill status-success">{currentRoute.status}</span>
                  </div>
                  <div className="panel-card-body">
                    {/* Live Simulated Telematics Bar */}
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '16px',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          Simulated Waypoint Location
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#14532d' }}>
                          {currentRoute.current_demo_location}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          Operating Speed
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#14532d' }}>
                          {currentRoute.demo_speed_kmh} km/h (Normal Transit)
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          Driver in Charge
                        </div>
                        <div style={{ fontSize: '13px', color: '#14532d' }}>
                          <strong>{currentRoute.driver_name}</strong> ({currentRoute.driver_phone})
                        </div>
                      </div>
                    </div>

                    {/* Stops and Timings Table */}
                    <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Stops & Estimated Schedule Timings</h4>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Stop #</th>
                            <th>Designated Pickup / Drop Point</th>
                            <th>Morning Inbound Pickup</th>
                            <th>Evening Outbound Departure</th>
                            <th>Simulation Transit Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(currentRoute.stops || []).map((stop) => {
                            const isCurrent = currentRoute.current_demo_location.toLowerCase().includes(stop.stop_name.toLowerCase());
                            return (
                              <tr key={stop.stop_number} style={{ backgroundColor: isCurrent ? '#f0fdf4' : 'transparent' }}>
                                <td><strong>#{stop.stop_number}</strong></td>
                                <td>
                                  <strong>{stop.stop_name}</strong>
                                  {isCurrent && (
                                    <span className="status-pill status-success" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                      Bus Currently Here
                                    </span>
                                  )}
                                </td>
                                <td>{stop.morning_time}</td>
                                <td>{stop.evening_time}</td>
                                <td>
                                  <span className={`status-pill ${stop.status === 'Passed' ? 'status-neutral' : stop.status === 'Current' ? 'status-success' : 'status-warning'}`}>
                                    {stop.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. CAMPUS MAP & DIRECTORY TAB */}
      {/* ========================================================== */}
      {activeTab === 'map' && (
        <div>
          {/* Map Search Bar */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search campus buildings, departments, laboratories..."
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Click any building block below to view its floor plan and directory details
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            {/* Schematic Campus Layout Grid */}
            <div className="panel-card">
              <div className="panel-card-header">
                <h3 className="panel-card-title">Campus Master Plan & Sector Grid</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>University Main Campus (45 Acres)</span>
              </div>
              <div className="panel-card-body">
                {/* Visual Campus Block Schematic */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  {filteredBuildings.map((b) => {
                    const isSelected = selectedBuildingId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBuildingId(b.id)}
                        style={{
                          backgroundColor: isSelected ? '#1e3a8a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#0f172a',
                          border: isSelected ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '12px 10px',
                          cursor: 'pointer',
                          minHeight: '100px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: isSelected ? '#93c5fd' : '#64748b',
                            textTransform: 'uppercase'
                          }}>
                            {b.code}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginTop: '2px',
                            lineHeight: '1.2'
                          }}>
                            {b.name}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: isSelected ? '#e2e8f0' : '#475569',
                          marginTop: '6px'
                        }}>
                          {b.category}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  Gates: Gate 1 (North Ring Road) | Gate 2 (Student Plaza & Canteen) | Gate 3 (Sports Arena & Athletic Ground)
                </div>
              </div>
            </div>

            {/* Selected Building Details Inspector */}
            <div className="panel-card">
              <div className="panel-card-header">
                <div>
                  <h3 className="panel-card-title">{selectedBuilding.name}</h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Code: <strong>{selectedBuilding.code}</strong></div>
                </div>
                <span className="status-pill status-neutral">{selectedBuilding.category}</span>
              </div>
              <div className="panel-card-body">
                <div style={{ marginBottom: '12px' }}>
                  <div className="stat-label">Description & Scope:</div>
                  <p style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                    {selectedBuilding.description}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    Floor Distribution: <strong>{selectedBuilding.floors}</strong>
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    Operating Hours: <strong>{selectedBuilding.timings}</strong>
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    Officer in Charge: <strong>{selectedBuilding.in_charge}</strong>
                  </div>
                  <div>
                    Contact Telephone: <strong>{selectedBuilding.contact}</strong>
                  </div>
                </div>

                <div>
                  <div className="stat-label">Departments & Units Inside:</div>
                  <p style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                    {selectedBuilding.departments}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 3. CANTEEN & FOOD COURT TAB */}
      {/* ========================================================== */}
      {activeTab === 'canteen' && (
        <div>
          {/* Canteen General Information Banner */}
          {canteenInfo && (
            <div className="panel-card" style={{ marginBottom: '16px' }}>
              <div className="panel-card-header">
                <div>
                  <h3 className="panel-card-title">{canteenInfo.name}</h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Location: {canteenInfo.location}</div>
                </div>
                <span className="status-pill status-success">Open Today</span>
              </div>
              <div className="panel-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Operating Timings:</strong>
                  <div style={{ color: '#475569', marginTop: '2px' }}>{canteenInfo.opening_hours}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Meal Schedule:</strong>
                  <div style={{ color: '#475569', marginTop: '2px' }}>Breakfast: {canteenInfo.breakfast_timings}</div>
                  <div style={{ color: '#475569' }}>Lunch: {canteenInfo.lunch_timings}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Accepted Payment:</strong>
                  <div style={{ color: '#475569', marginTop: '2px' }}>{canteenInfo.payment_methods}</div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Enquiry: {canteenInfo.contact}</div>
                </div>
              </div>
            </div>
          )}

          {/* Menu Search and Filters */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search food items (e.g. Masala Dosa, Thali, Coffee)..."
                  value={canteenSearch}
                  onChange={(e) => setCanteenSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadCanteen()}
                />
              </div>

              <div>
                <select
                  className="form-select"
                  value={canteenCategory}
                  onChange={(e) => setCanteenCategory(e.target.value)}
                >
                  <option value="ALL">All Meal Categories</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch & Meals">Lunch & Meals</option>
                  <option value="Snacks & Quick Bites">Snacks & Quick Bites</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select"
                  value={canteenDietary}
                  onChange={(e) => setCanteenDietary(e.target.value)}
                >
                  <option value="ALL">All Dietary Preferences</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>

              <button type="button" className="btn-secondary" onClick={loadCanteen}>
                Filter Menu
              </button>
            </div>
          </div>

          {/* Canteen Items Table */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Daily Canteen Menu & Pricing</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Showing {canteenMenu.length} items</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Dietary Type</th>
                    <th>Serving Window</th>
                    <th>Unit Price (INR)</th>
                    <th>Current Availability</th>
                    {(userRole === 'admin' || userRole === 'faculty') && <th>Staff Control</th>}
                  </tr>
                </thead>
                <tbody>
                  {canteenMenu.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No menu items found for the selected category.
                      </td>
                    </tr>
                  ) : (
                    canteenMenu.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.item_name}</strong></td>
                        <td><span className="status-pill status-neutral">{item.category}</span></td>
                        <td>
                          <span className={`status-pill ${item.dietary === 'Vegetarian' || item.dietary === 'Vegan' ? 'status-success' : 'status-warning'}`}>
                            {item.dietary}
                          </span>
                        </td>
                        <td>{item.timings}</td>
                        <td><strong>Rs {Number(item.price).toFixed(2)}</strong></td>
                        <td>
                          <span className={`status-pill ${item.availability === 'Available' ? 'status-success' : 'status-danger'}`}>
                            {item.availability}
                          </span>
                        </td>
                        {(userRole === 'admin' || userRole === 'faculty') && (
                          <td>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleToggleAvailability(item.id, item.availability)}
                            >
                              Mark {item.availability === 'Available' ? 'Sold Out' : 'Available'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. LOST AND FOUND PORTAL TAB */}
      {/* ========================================================== */}
      {activeTab === 'lost_found' && (
        <div>
          {/* Action Header & Quick Stats */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search lost and found items by title, description, or location..."
                  value={lfSearch}
                  onChange={(e) => setLfSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLostFound()}
                />
              </div>

              <div>
                <select
                  className="form-select"
                  value={lfTypeFilter}
                  onChange={(e) => setLfTypeFilter(e.target.value)}
                >
                  <option value="ALL">All Reports</option>
                  <option value="Lost">Lost Items Only</option>
                  <option value="Found">Found Items Only</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select"
                  value={lfCategoryFilter}
                  onChange={(e) => setLfCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Documents & IDs">Documents & IDs</option>
                  <option value="Books & Stationery">Books & Stationery</option>
                  <option value="Personal Items">Personal Items</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select"
                  value={lfStatusFilter}
                  onChange={(e) => setLfStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Claimed">Claimed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <button type="button" className="btn-secondary" onClick={loadLostFound}>
                Search
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setReportForm({ ...reportForm, report_type: 'Lost' });
                  setShowReportModal(true);
                }}
              >
                + Report Lost Item
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ backgroundColor: '#0284c7', color: '#ffffff' }}
                onClick={() => {
                  setReportForm({ ...reportForm, report_type: 'Found' });
                  setShowReportModal(true);
                }}
              >
                + Report Found Item
              </button>
            </div>
          </div>

          {/* Reported Items Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {lostFoundItems.length === 0 ? (
              <div className="panel-card" style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No lost or found items reported matching your filters.
              </div>
            ) : (
              lostFoundItems.map((item) => (
                <div key={item.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="panel-card-header">
                    <div>
                      <span className={`status-pill ${item.report_type === 'Lost' ? 'status-danger' : 'status-success'}`} style={{ marginRight: '6px' }}>
                        {item.report_type.toUpperCase()}
                      </span>
                      <span className="status-pill status-neutral">{item.category}</span>
                    </div>
                    <span className={`status-pill ${item.status === 'Open' ? 'status-warning' : 'status-success'}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="panel-card-body" style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>{item.item_title}</h4>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                      Location Reported: <strong>{item.location_reported}</strong> | Date: {item.date_reported}
                    </div>

                    <p style={{ fontSize: '12px', color: '#334155', marginBottom: '12px' }}>
                      {item.description}
                    </p>

                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '11px' }}>
                      <div>Reporter: <strong>{item.reporter_name}</strong> ({item.reporter_usn})</div>
                      <div>Claim Instructions: {item.claim_instructions || 'Contact reporter directly.'}</div>
                      {item.message_count > 0 && (
                        <div style={{ color: '#2563eb', marginTop: '4px', fontWeight: 'bold' }}>
                          {item.message_count} inquiry message(s) received
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}
                        onClick={() => openContactModal(item)}
                      >
                        Contact / Inquire ({item.message_count || 0})
                      </button>

                      {item.status === 'Open' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleUpdateStatus(item.id, 'Claimed')}
                        >
                          Mark Claimed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 5. CAMPUS FACILITIES DIRECTORY TAB */}
      {/* ========================================================== */}
      {activeTab === 'facilities' && (
        <div>
          {/* Facilities Filter */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search facilities by name, building, equipment, or features..."
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadFacilities()}
                />
              </div>

              <div>
                <select
                  className="form-select"
                  value={facilityCategory}
                  onChange={(e) => setFacilityCategory(e.target.value)}
                >
                  <option value="ALL">All Facility Domains</option>
                  <option value="Laboratories">Laboratories</option>
                  <option value="Sports & Fitness">Sports & Fitness</option>
                  <option value="Medical & Health">Medical & Health</option>
                  <option value="Auditoriums & Halls">Auditoriums & Halls</option>
                  <option value="Amenities & Utilities">Amenities & Utilities</option>
                </select>
              </div>

              <button type="button" className="btn-secondary" onClick={loadFacilities}>
                Search
              </button>
            </div>
          </div>

          {/* Facility Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
            {facilities.length === 0 ? (
              <div className="panel-card" style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No campus facilities found.
              </div>
            ) : (
              facilities.map((fac) => (
                <div key={fac.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="panel-card-header">
                    <div>
                      <h3 className="panel-card-title">{fac.facility_name}</h3>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Location: {fac.building_location}</div>
                    </div>
                    <span className="status-pill status-neutral">{fac.category}</span>
                  </div>

                  <div className="panel-card-body" style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: '#334155', marginBottom: '12px' }}>
                      {fac.description}
                    </p>

                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                      <div>Operating Hours: <strong>{fac.operating_hours}</strong></div>
                      <div>In-Charge: <strong>{fac.in_charge_name}</strong></div>
                      <div>Emergency / Contact: <strong>{fac.contact_tel}</strong></div>
                    </div>

                    <div>
                      <div className="stat-label">Key Specifications & Features:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {(fac.key_features || '').split(',').map((feat, idx) => (
                          <span key={idx} className="status-pill status-neutral" style={{ fontSize: '11px' }}>
                            {feat.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: REPORT LOST / FOUND ITEM */}
      {showReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Report {reportForm.report_type} Item to Campus Registry</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowReportModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleCreateReport}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Report Type</label>
                    <select
                      className="form-select"
                      value={reportForm.report_type}
                      onChange={(e) => setReportForm({ ...reportForm, report_type: e.target.value })}
                    >
                      <option value="Lost">Lost Item</option>
                      <option value="Found">Found Item</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Item Classification</label>
                    <select
                      className="form-select"
                      value={reportForm.category}
                      onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Documents & IDs">Documents & IDs</option>
                      <option value="Books & Stationery">Books & Stationery</option>
                      <option value="Personal Items">Personal Items</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Item Title & Model</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. HP Wireless Ergonomic Mouse (Black)"
                    value={reportForm.item_title}
                    onChange={(e) => setReportForm({ ...reportForm, item_title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Location Where Lost / Found</label>
                    <input
                      type="text" className="form-input" placeholder="e.g. Systems Lab 3, Row 4"
                      value={reportForm.location_reported}
                      onChange={(e) => setReportForm({ ...reportForm, location_reported: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date" className="form-input"
                      value={reportForm.date_reported}
                      onChange={(e) => setReportForm({ ...reportForm, date_reported: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Detailed Description & Identifying Marks</label>
                  <textarea
                    className="form-textarea" rows="3"
                    placeholder="Provide detailed description, color, identifying scratches, or content..."
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Reporter Name</label>
                    <input
                      type="text" className="form-input"
                      value={reportForm.reporter_name}
                      onChange={(e) => setReportForm({ ...reportForm, reporter_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Reporter USN / ID</label>
                    <input
                      type="text" className="form-input"
                      value={reportForm.reporter_usn}
                      onChange={(e) => setReportForm({ ...reportForm, reporter_usn: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Contact Email</label>
                    <input
                      type="email" className="form-input"
                      value={reportForm.contact_email}
                      onChange={(e) => setReportForm({ ...reportForm, contact_email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text" className="form-input"
                      value={reportForm.contact_phone}
                      onChange={(e) => setReportForm({ ...reportForm, contact_phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Claim / Retrieval Instructions</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. Deposit with CS Lab attendant or call reporter directly"
                    value={reportForm.claim_instructions}
                    onChange={(e) => setReportForm({ ...reportForm, claim_instructions: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Submit Report</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTACT REPORTER / IN-PORTAL INQUIRY */}
      {contactingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <div>
                <h3 className="panel-card-title">Inquiry: {contactingItem.item_title}</h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Reported by: <strong>{contactingItem.reporter_name}</strong> ({contactingItem.reporter_usn})</div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setContactingItem(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              {/* Reporter Contact Info Box */}
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '14px', fontSize: '12px' }}>
                <div>Email: <strong>{contactingItem.contact_email}</strong></div>
                <div>Phone: <strong>{contactingItem.contact_phone}</strong></div>
                <div>Claim Instructions: {contactingItem.claim_instructions || 'Contact reporter directly.'}</div>
              </div>

              {/* Existing Message Thread */}
              <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>In-Portal Inquiries & Messages ({itemMessages.length})</h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '14px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                {itemMessages.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px' }}>
                    No messages sent yet. Use the form below to message the reporter.
                  </div>
                ) : (
                  itemMessages.map((m) => (
                    <div key={m.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                        <strong>{m.sender_name} ({m.sender_usn})</strong>
                        <span>{m.sent_at}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#0f172a' }}>{m.message}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Send New Inquiry Form */}
              <form onSubmit={handleSendInquiry}>
                <div className="form-group">
                  <label>Send a Message to Reporter</label>
                  <textarea
                    className="form-textarea" rows="3"
                    placeholder="Type your inquiry or update (e.g., 'I found this item and handed it to the department office')..."
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setContactingItem(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading || !inquiryText.trim()}>Send Message</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 15. COMMUNICATION & NOTIFICATIONS MODULE
// ==========================================================
export function NotificationsView({ userRole }) {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'appointments', 'directory'
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Admin Publish Modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    category: 'College Announcement',
    department: 'Office of Academic Affairs',
    content: '',
    priority: 'Normal',
    target_role: 'all'
  });

  // Faculty Appointments State
  const [appointments, setAppointments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({
    faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
    department: 'Computer Science & Engineering',
    purpose: '',
    requested_date: new Date().toISOString().split('T')[0],
    requested_slot: '10:30 AM - 11:00 AM'
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      let url = '/notifications?';
      if (categoryFilter !== 'ALL') url += `category=${encodeURIComponent(categoryFilter)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter.toLowerCase())}&`;
      const res = await apiRequest(url);
      setNotifs(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/communications/appointments?role=${userRole}`);
      setAppointments(res.appointments || []);
    } catch (err) {
      setError(err.message || 'Failed to load appointment requests.');
    } finally {
      setLoading(false);
    }
  };

  const loadFacultyDirectory = async () => {
    try {
      const res = await apiRequest('/communications/faculty-directory');
      setFacultyList(res.faculty || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox') loadNotifications();
    else if (activeTab === 'appointments') {
      loadAppointments();
      loadFacultyDirectory();
    } else if (activeTab === 'directory') {
      loadFacultyDirectory();
    }
  }, [activeTab, categoryFilter, statusFilter]);

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to mark as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setMsg('All circulars marked as read.');
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    }
  };

  const handleDeleteNotif = async (id) => {
    if (!window.confirm('Delete this official announcement?')) return;
    try {
      await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
      setMsg('Notification deleted.');
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to delete notification.');
    }
  };

  const handlePublishNotification = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify(publishForm)
      });
      setMsg(res.message);
      setShowPublishModal(false);
      setPublishForm({
        title: '',
        category: 'College Announcement',
        department: 'Office of Academic Affairs',
        content: '',
        priority: 'Normal',
        target_role: 'all'
      });
      loadNotifications();
    } catch (err) {
      setError(err.message || 'Failed to publish notice.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAppointment = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const res = await apiRequest('/communications/appointments', {
        method: 'POST',
        body: JSON.stringify(apptForm)
      });
      setMsg(res.message);
      setShowApptModal(false);
      setApptForm({
        faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
        department: 'Computer Science & Engineering',
        purpose: '',
        requested_date: new Date().toISOString().split('T')[0],
        requested_slot: '10:30 AM - 11:00 AM'
      });
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApptStatus = async (id, status, remarks = '') => {
    try {
      const res = await apiRequest(`/communications/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, remarks })
      });
      setMsg(res.message);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to update appointment status.');
    }
  };

  const filteredNotifs = notifs.filter(n => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.department.toLowerCase().includes(q);
  });

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'Examination': return 'status-primary';
      case 'Placement': return 'status-success';
      case 'Assignment Reminder': return 'status-warning';
      case 'Attendance Alert': return 'status-danger';
      default: return 'status-neutral';
    }
  };

  return (
    <div>
      {/* Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">College Communications, Announcements & Faculty Connect</div>
          <div className="banner-sub">
            Institutional circulars, examination alerts, placement bulletins, attendance warnings, and faculty appointment bookings.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Tabs Switcher */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ padding: '8px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'inbox', label: `Notifications Inbox (${unreadCount} Unread)` },
            { id: 'appointments', label: `Faculty Appointments (${appointments.length})` },
            { id: 'directory', label: 'Faculty Directory & Office Hours' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: activeTab === tab.id ? '#1e3a8a' : '#ffffff',
                color: activeTab === tab.id ? '#ffffff' : '#1e293b'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: NOTIFICATIONS INBOX */}
      {activeTab === 'inbox' && (
        <div>
          {/* Top Metric Cards */}
          <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Notices</div>
              <div className="stat-value">{notifs.length}</div>
              <div className="stat-sub">Archived circulars</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unread Alerts</div>
              <div className="stat-value" style={{ color: unreadCount > 0 ? '#dc2626' : '#16a34a' }}>
                {unreadCount}
              </div>
              <div className="stat-sub">Requires your review</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Examinations</div>
              <div className="stat-value">
                {notifs.filter(n => n.category === 'Examination').length}
              </div>
              <div className="stat-sub">Hall tickets & schedules</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Attendance & Deadlines</div>
              <div className="stat-value">
                {notifs.filter(n => n.category === 'Attendance Alert' || n.category === 'Assignment Reminder').length}
              </div>
              <div className="stat-sub">Urgent reminders</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search notices by keyword, course, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <select
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Announcement Categories</option>
                  <option value="College Announcement">College Announcements</option>
                  <option value="Examination">Examination Notifications</option>
                  <option value="Placement">Placement Drives</option>
                  <option value="Assignment Reminder">Assignment Reminders</option>
                  <option value="Attendance Alert">Attendance Alerts</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>

              {unreadCount > 0 && (
                <button type="button" className="btn-secondary" onClick={handleMarkAllRead}>
                  Mark All Read
                </button>
              )}

              {(userRole === 'admin' || userRole === 'faculty') && (
                <button type="button" className="btn-primary" onClick={() => setShowPublishModal(true)}>
                  + Publish Announcement
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Official Announcements & Notifications Ledger</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Showing {filteredNotifs.length} notices</span>
            </div>
            <div className="panel-card-body" style={{ padding: '0' }}>
              {filteredNotifs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No announcements match your search or filter criteria.
                </div>
              ) : (
                <ul className="item-list" style={{ margin: '0' }}>
                  {filteredNotifs.map((n) => (
                    <li
                      key={n.id}
                      className="list-item"
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: n.is_read ? '#ffffff' : '#f0fdf4'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`status-pill ${getCategoryBadgeClass(n.category)}`} style={{ fontSize: '11px' }}>
                            {n.category}
                          </span>
                          {n.priority === 'Urgent' && (
                            <span className="status-pill status-danger" style={{ fontSize: '10px' }}>URGENT</span>
                          )}
                          {!n.is_read && (
                            <span className="status-pill status-primary" style={{ fontSize: '10px' }}>UNREAD</span>
                          )}
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {n.published_date}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {!n.is_read && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleMarkAsRead(n.id)}
                            >
                              Mark Read
                            </button>
                          )}
                          {userRole === 'admin' && (
                            <button
                              type="button"
                              className="btn-danger"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleDeleteNotif(n.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>
                        {n.title}
                      </h4>

                      <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', marginBottom: '8px' }}>
                        {n.content}
                      </p>

                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Issuing Authority: <strong>{n.department}</strong> | Scope: {n.target_role === 'all' ? 'Entire College' : n.target_role.toUpperCase()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY APPOINTMENTS & CONSULTATION */}
      {activeTab === 'appointments' && (
        <div>
          <div className="panel-card" style={{ marginBottom: '16px' }}>
            <div className="panel-card-header">
              <div>
                <h3 className="panel-card-title">Faculty Consultation & Meeting Appointments</h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Schedule office hours for project guidance, doubt clearing, or mentoring.</div>
              </div>
              <button type="button" className="btn-primary" onClick={() => setShowApptModal(true)}>
                + Request Faculty Appointment
              </button>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header">
              <h3 className="panel-card-title">Scheduled Consultation Sessions</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Student USN: 1MS21CS084</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Faculty Member</th>
                    <th>Department</th>
                    <th>Consultation Purpose</th>
                    <th>Requested Date & Slot</th>
                    <th>Status</th>
                    <th>Faculty Remarks</th>
                    {(userRole === 'faculty' || userRole === 'admin') && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No appointment requests found. Click the button above to request a consultation slot.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.faculty_name}</strong></td>
                        <td>{a.department}</td>
                        <td style={{ maxWidth: '280px' }}>{a.purpose}</td>
                        <td>
                          <strong>{a.requested_date}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{a.requested_slot}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${
                            a.status === 'Confirmed' ? 'status-success' :
                            a.status === 'Pending' ? 'status-warning' :
                            a.status === 'Completed' ? 'status-neutral' : 'status-danger'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#475569' }}>
                          {a.faculty_remarks || 'Awaiting faculty confirmation.'}
                        </td>
                        {(userRole === 'faculty' || userRole === 'admin') && (
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {a.status === 'Pending' && (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleUpdateApptStatus(a.id, 'Confirmed', 'Approved. Slot reserved.')}
                                >
                                  Confirm
                                </button>
                              )}
                              {a.status === 'Confirmed' && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleUpdateApptStatus(a.id, 'Completed', 'Consultation finished.')}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY DIRECTORY & OFFICE HOURS */}
      {activeTab === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {facultyList.map((f, idx) => (
            <div key={idx} className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-card-header">
                <div>
                  <h3 className="panel-card-title">{f.name}</h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{f.designation}</div>
                </div>
                <span className="status-pill status-neutral">{f.department.split('&')[0]}</span>
              </div>
              <div className="panel-card-body" style={{ flex: 1 }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>Office Room: <strong>{f.office}</strong></div>
                  <div style={{ marginBottom: '4px' }}>Email: <strong>{f.email}</strong></div>
                  <div>Consultation Slot: <strong>{f.consultation_hours}</strong></div>
                </div>

                <div>
                  <div className="stat-label">Primary Courses:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', marginBottom: '12px' }}>
                    {f.courses.map((c, cIdx) => (
                      <span key={cIdx} className="status-pill status-neutral" style={{ fontSize: '10px' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => {
                    setApptForm({
                      ...apptForm,
                      faculty_name: f.name,
                      department: f.department
                    });
                    setActiveTab('appointments');
                    setShowApptModal(true);
                  }}
                >
                  Book Consultation Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: PUBLISH ANNOUNCEMENT */}
      {showPublishModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Publish Official Notice / Announcement</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowPublishModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handlePublishNotification}>
                <div className="form-group">
                  <label>Announcement Title</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. Schedule for Final Year Project Progress Review"
                    value={publishForm.title} onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })} required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Notice Category</label>
                    <select
                      className="form-select"
                      value={publishForm.category} onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value })}
                    >
                      <option value="College Announcement">College Announcement</option>
                      <option value="Examination">Examination Notification</option>
                      <option value="Placement">Placement Drive</option>
                      <option value="Assignment Reminder">Assignment Reminder</option>
                      <option value="Attendance Alert">Attendance Alert</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Issuing Department</label>
                    <input
                      type="text" className="form-input"
                      value={publishForm.department} onChange={(e) => setPublishForm({ ...publishForm, department: e.target.value })} required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Priority Level</label>
                    <select
                      className="form-select"
                      value={publishForm.priority} onChange={(e) => setPublishForm({ ...publishForm, priority: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <select
                      className="form-select"
                      value={publishForm.target_role} onChange={(e) => setPublishForm({ ...publishForm, target_role: e.target.value })}
                    >
                      <option value="all">Entire College</option>
                      <option value="student">Students Only</option>
                      <option value="faculty">Faculty Only</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Announcement Details & Body</label>
                  <textarea
                    rows="4" className="form-textarea" placeholder="Enter complete circular text, instructions, and deadlines..."
                    value={publishForm.content} onChange={(e) => setPublishForm({ ...publishForm, content: e.target.value })} required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowPublishModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Publish Circular</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST FACULTY APPOINTMENT */}
      {showApptModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '520px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Book Faculty Consultation Slot</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowApptModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleRequestAppointment}>
                <div className="form-group">
                  <label>Choose Faculty Member</label>
                  <select
                    className="form-select"
                    value={apptForm.faculty_name}
                    onChange={(e) => {
                      const selected = facultyList.find(f => f.name === e.target.value);
                      setApptForm({
                        ...apptForm,
                        faculty_name: e.target.value,
                        department: selected ? selected.department : apptForm.department
                      });
                    }}
                    required
                  >
                    {facultyList.map((f, idx) => (
                      <option key={idx} value={f.name}>
                        {f.name} ({f.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Preferred Date</label>
                    <input
                      type="date" className="form-input"
                      value={apptForm.requested_date}
                      onChange={(e) => setApptForm({ ...apptForm, requested_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Time Slot</label>
                    <select
                      className="form-select"
                      value={apptForm.requested_slot}
                      onChange={(e) => setApptForm({ ...apptForm, requested_slot: e.target.value })}
                    >
                      <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                      <option value="10:30 AM - 11:00 AM">10:30 AM - 11:00 AM</option>
                      <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                      <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Consultation Agenda / Purpose</label>
                  <textarea
                    rows="3" className="form-textarea" placeholder="Detail what you would like to discuss (e.g. project review, doubt solving)..."
                    value={apptForm.purpose} onChange={(e) => setApptForm({ ...apptForm, purpose: e.target.value })} required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowApptModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 17. FACULTY DOUBT PORTAL MODULE
// ==========================================================
export function FacultyDoubtPortalView({ userRole }) {
  const [doubts, setDoubts] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Submit Doubt Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [doubtForm, setDoubtForm] = useState({
    subject_code: 'CS601',
    subject_name: 'Distributed Systems',
    faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
    title: '',
    question: ''
  });
  const [doubtFile, setDoubtFile] = useState(null);

  // Response Modal State
  const [respondingDoubt, setRespondingDoubt] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseFile, setResponseFile] = useState(null);

  const subjectsCatalog = [
    { code: 'CS601', name: 'Distributed Systems', faculty: 'Dr. Ramesh Rao (Head of Systems)' },
    { code: 'CS602', name: 'Machine Learning', faculty: 'Dr. Ramesh Rao (Head of Systems)' },
    { code: 'CS603', name: 'Compiler Design', faculty: 'Prof. Anil Deshmukh' },
    { code: 'CS604', name: 'Cloud Architecture', faculty: 'Dr. Ramesh Rao (Head of Systems)' },
    { code: 'EC601', name: 'Embedded IoT Systems', faculty: 'Dr. Geetha S. (HoD ECE)' }
  ];

  const loadDoubts = async () => {
    try {
      setLoading(true);
      let url = '/doubts?';
      if (subjectFilter !== 'ALL') url += `subject=${encodeURIComponent(subjectFilter)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      const res = await apiRequest(url);
      setDoubts(res.doubts || []);
    } catch (err) {
      setError(err.message || 'Failed to load faculty doubts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoubts();
  }, [subjectFilter, statusFilter]);

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('subject_code', doubtForm.subject_code);
      formData.append('subject_name', doubtForm.subject_name);
      formData.append('faculty_name', doubtForm.faculty_name);
      formData.append('title', doubtForm.title);
      formData.append('question', doubtForm.question);
      formData.append('usn', '1MS21CS084');
      formData.append('student_name', 'Alex Kumar');
      if (doubtFile) {
        formData.append('attachment', doubtFile);
      }

      const res = await fetch(apiUrl('/api/doubts'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post doubt');
      setMsg(data.message);
      setShowSubmitModal(false);
      setDoubtForm({
        subject_code: 'CS601',
        subject_name: 'Distributed Systems',
        faculty_name: 'Dr. Ramesh Rao (Head of Systems)',
        title: '',
        question: ''
      });
      setDoubtFile(null);
      loadDoubts();
    } catch (err) {
      setError(err.message || 'Failed to submit doubt.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!respondingDoubt || !responseText.trim()) return;
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('response_text', responseText.trim());
      formData.append('responder_name', userRole === 'faculty' ? 'Dr. Ramesh Rao (Head of Systems)' : 'Alex Kumar');
      formData.append('responder_role', userRole === 'faculty' ? 'faculty' : 'student');
      if (responseFile) {
        formData.append('attachment', responseFile);
      }

      const res = await fetch(apiUrl(`/api/doubts/${respondingDoubt.id}/respond`), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send response');
      setMsg(data.message);
      setRespondingDoubt(null);
      setResponseText('');
      setResponseFile(null);
      loadDoubts();
    } catch (err) {
      setError(err.message || 'Failed to deliver response.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (doubtId, newStatus) => {
    try {
      const res = await apiRequest(`/doubts/${doubtId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setMsg(res.message);
      loadDoubts();
    } catch (err) {
      setError(err.message || 'Failed to update doubt status.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted': return 'status-warning';
      case 'Under Review': return 'status-primary';
      case 'Answered': return 'status-success';
      case 'Resolved': return 'status-neutral';
      default: return 'status-neutral';
    }
  };

  return (
    <div>
      {/* Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">Faculty Academic Doubt & Mentorship Portal</div>
          <div className="banner-sub">
            Direct course question submission to faculty, supporting attachments, status tracking, and structured instructor explanations.
          </div>
        </div>
      </div>

      {msg && <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>{msg}</div>}
      {error && <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Stats Counter Bar */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Questions</div>
          <div className="stat-value">{doubts.length}</div>
          <div className="stat-sub">Submitted inquiries</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved Doubts</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {doubts.filter(d => d.status === 'Resolved' || d.status === 'Answered').length}
          </div>
          <div className="stat-sub">Instructor solutions provided</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending / In Review</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {doubts.filter(d => d.status === 'Submitted' || d.status === 'Under Review').length}
          </div>
          <div className="stat-sub">Awaiting faculty attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Instructors</div>
          <div className="stat-value">4</div>
          <div className="stat-sub">Course coordinators</div>
        </div>
      </div>

      {/* Action and Filter Toolbar */}
      <div className="panel-card" style={{ marginBottom: '16px' }}>
        <div className="panel-card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search doubts by title, concept question, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDoubts()}
            />
          </div>

          <div>
            <select
              className="form-select"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="ALL">All Subjects</option>
              <option value="CS601">CS601: Distributed Systems</option>
              <option value="CS602">CS602: Machine Learning</option>
              <option value="CS603">CS603: Compiler Design</option>
              <option value="CS604">CS604: Cloud Architecture</option>
              <option value="EC601">EC601: Embedded IoT Systems</option>
            </select>
          </div>

          <div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Answered">Answered</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <button type="button" className="btn-secondary" onClick={loadDoubts}>Search</button>

          <button type="button" className="btn-primary" onClick={() => setShowSubmitModal(true)}>
            + Ask Academic Doubt
          </button>
        </div>
      </div>

      {/* Doubts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {doubts.length === 0 ? (
          <div className="panel-card" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            No doubts match the selected subject or status filter.
          </div>
        ) : (
          doubts.map((d) => (
            <div key={d.id} className="panel-card">
              <div className="panel-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="status-pill status-neutral">
                    {d.subject_code}: {d.subject_name}
                  </span>
                  <span className={`status-pill ${getStatusBadge(d.status)}`}>
                    {d.status}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Submitted by: <strong>{d.student_name}</strong> ({d.usn}) | {d.created_at}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 'bold' }}>
                  Faculty: {d.faculty_name}
                </div>
              </div>

              <div className="panel-card-body">
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>
                  {d.title}
                </h4>

                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', marginBottom: '12px' }}>
                  {d.question}
                </p>

                {d.attachment_file && (
                  <div style={{ marginBottom: '12px' }}>
                    <button type="button" onClick={() => openExternal(apiUrl(`/uploads/${d.attachment_file}`))}
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none' }}
                    >
                      View Attached Supporting File
                    </button>
                  </div>
                )}

                {/* Conversation / Response Thread */}
                {d.responses && d.responses.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
                      Faculty Explanations & Dialogue Thread ({d.responses.length}):
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {d.responses.map((resp) => (
                        <div
                          key={resp.id}
                          style={{
                            background: resp.responder_role === 'faculty' ? '#f0fdf4' : '#f8fafc',
                            borderLeft: resp.responder_role === 'faculty' ? '3px solid #16a34a' : '3px solid #64748b',
                            padding: '10px 12px',
                            borderRadius: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                            <strong>{resp.responder_name} ({resp.responder_role === 'faculty' ? 'Course Instructor' : 'Student'})</strong>
                            <span>{resp.responded_at}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: '#1e293b', margin: '0', lineHeight: '1.4' }}>
                            {resp.response_text}
                          </p>
                          {resp.attachment_file && (
                            <div style={{ marginTop: '6px' }}>
                              <button type="button" onClick={() => openExternal(apiUrl(`/uploads/${resp.attachment_file}`))}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', color: '#2563eb' }}
                              >
                                Download Response Attachment
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => {
                      setRespondingDoubt(d);
                      setResponseText('');
                      setResponseFile(null);
                    }}
                  >
                    Reply to Doubt
                  </button>

                  {d.status !== 'Resolved' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleUpdateStatus(d.id, 'Resolved')}
                    >
                      Mark as Resolved
                    </button>
                  )}

                  {(userRole === 'faculty' || userRole === 'admin') && d.status === 'Submitted' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleUpdateStatus(d.id, 'Under Review')}
                    >
                      Mark Under Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: SUBMIT DOUBT */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Submit Academic Doubt to Course Instructor</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)}>Close</button>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSubmitDoubt}>
                <div className="form-group">
                  <label>Select Course Subject</label>
                  <select
                    className="form-select"
                    value={doubtForm.subject_code}
                    onChange={(e) => {
                      const sel = subjectsCatalog.find(s => s.code === e.target.value);
                      setDoubtForm({
                        ...doubtForm,
                        subject_code: e.target.value,
                        subject_name: sel ? sel.name : doubtForm.subject_name,
                        faculty_name: sel ? sel.faculty : doubtForm.faculty_name
                      });
                    }}
                    required
                  >
                    {subjectsCatalog.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code}: {s.name} (Faculty: {s.faculty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assigned Course Instructor</label>
                  <input
                    type="text" className="form-input" readOnly
                    value={doubtForm.faculty_name}
                    style={{ backgroundColor: '#f1f5f9' }}
                  />
                </div>

                <div className="form-group">
                  <label>Doubt Title / Concept Topic</label>
                  <input
                    type="text" className="form-input" placeholder="e.g. Quorum consensus partitioning question"
                    value={doubtForm.title} onChange={(e) => setDoubtForm({ ...doubtForm, title: e.target.value })} required
                  />
                </div>

                <div className="form-group">
                  <label>Detailed Question Explanation</label>
                  <textarea
                    rows="4" className="form-textarea" placeholder="Detail the specific code segment, theorem, or homework step you need guidance with..."
                    value={doubtForm.question} onChange={(e) => setDoubtForm({ ...doubtForm, question: e.target.value })} required
                  />
                </div>

                <div className="form-group">
                  <label>Supporting Image or Document (Optional: PDF, PNG, JPG, DOC)</label>
                  <input
                    type="file" className="form-input"
                    onChange={(e) => setDoubtFile(e.target.files[0] || null)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>Submit to Faculty</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESPOND TO DOUBT */}
      {respondingDoubt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Reply: {respondingDoubt.title}</h3>
              <button type="button" className="btn-secondary" onClick={() => setRespondingDoubt(null)}>Close</button>
            </div>
            <div className="panel-card-body">
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                <div>Course: <strong>{respondingDoubt.subject_code} - {respondingDoubt.subject_name}</strong></div>
                <div>Original Question: <em>{respondingDoubt.question}</em></div>
              </div>

              <form onSubmit={handleSendResponse}>
                <div className="form-group">
                  <label>Your Explanation / Solution</label>
                  <textarea
                    rows="4" className="form-textarea" placeholder="Enter your detailed technical explanation, algorithmic derivation, or feedback..."
                    value={responseText} onChange={(e) => setResponseText(e.target.value)} required
                  />
                </div>

                <div className="form-group">
                  <label>Attach Solution Document or Reference (Optional)</label>
                  <input
                    type="file" className="form-input"
                    onChange={(e) => setResponseFile(e.target.files[0] || null)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setRespondingDoubt(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading || !responseText.trim()}>Post Response</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
