import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiUrl, openExternal } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import useTracked, { loadingOf } from './useTracked';
import './placements.css';

const EMPTY_DRIVE = {
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
};
const RESUME_CHOICES = [
  { value: 'alex_kumar_resume.pdf', label: 'Alex Kumar - Core Software Resume (Primary)' },
  { value: 'systems_resume_v2.pdf', label: 'Alex Kumar - Distributed Systems Resume' }
];
const DRIVE_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'fulltime', label: 'Full-Time' },
  { id: 'internship', label: 'Internships' }
];
const appTone = (s) => (s === 'Selected' ? 'pill--good' : s === 'Rejected' ? 'pill--bad' : 'pill--warn');
const listFrom = (value) => (Array.isArray(value) ? value.join(', ') : value ?? '');

export default function PlacementsView({ userRole }) {
  const [activeTab, setActiveTab] = useState('drives'); // 'drives' | 'applications' | 'resumes' | 'builder' | 'prep'
  const [drives, setDrives] = useState([]);
  const [driveType, setDriveType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const [prepData, setPrepData] = useState({ resources: [], mock_questions: [] });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const { loading, errors, track } = useTracked();
  const isLoading = loadingOf(loading);

  // Dialogs & forms
  const [selectedDriveForApply, setSelectedDriveForApply] = useState(null);
  const [applyResumeName, setApplyResumeName] = useState(RESUME_CHOICES[0].value);
  const [showAddDriveModal, setShowAddDriveModal] = useState(false);
  const [revealedQuestionId, setRevealedQuestionId] = useState(null);
  const [driveForm, setDriveForm] = useState(EMPTY_DRIVE);

  // Resume upload
  const [uploadTitle, setUploadTitle] = useState('Core Software Resume');
  const [resumeFile, setResumeFile] = useState(null);

  const searchRef = useRef('');
  searchRef.current = searchTerm;

  const loadDrives = useCallback(() => {
    const query = new URLSearchParams();
    if (driveType !== 'all') query.append('type', driveType);
    if (searchRef.current) query.append('search', searchRef.current);
    return track('drives', apiRequest(`/placements/drives?${query.toString()}`), (res) => setDrives(res.drives || []));
  }, [track, driveType]);

  const loadApplications = useCallback(
    () => track('apps', apiRequest('/placements/applications'), (res) => setApplications(res.applications || [])),
    [track]
  );
  const loadResumes = useCallback(
    () => track('resumes', apiRequest('/placements/resumes'), (res) => setResumes(res.resumes || [])),
    [track]
  );
  const loadResumeBuilder = useCallback(
    () => track('builder', apiRequest('/placements/resume-builder'), (res) => setResumeData(res.resume_data || {})),
    [track]
  );
  const loadPrep = useCallback(
    () => track('prep', apiRequest('/placements/interview-prep'), (res) => setPrepData(res)),
    [track]
  );

  useEffect(() => {
    if (activeTab === 'drives') loadDrives();
  }, [activeTab, loadDrives]);
  useEffect(() => {
    if (activeTab === 'applications') loadApplications();
    else if (activeTab === 'resumes') loadResumes();
    else if (activeTab === 'builder') loadResumeBuilder();
    else if (activeTab === 'prep') loadPrep();
  }, [activeTab, loadApplications, loadResumes, loadResumeBuilder, loadPrep]);

  const begin = () => {
    setMsg('');
    setError('');
    setDialogError('');
  };

  const handleApply = async (e) => {
    e?.preventDefault();
    if (!selectedDriveForApply) return;
    begin();
    try {
      setBusy(true);
      const res = await apiRequest('/placements/apply', {
        method: 'POST',
        body: JSON.stringify({ drive_id: selectedDriveForApply.id, resume_name: applyResumeName })
      });
      setMsg(res.message);
      setSelectedDriveForApply(null);
      loadDrives();
    } catch (err) {
      setDialogError(err.message || 'Application submission failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDrive = async (e) => {
    e?.preventDefault();
    begin();
    try {
      setBusy(true);
      const res = await apiRequest('/placements/drives', { method: 'POST', body: JSON.stringify(driveForm) });
      setMsg(res.message);
      setShowAddDriveModal(false);
      loadDrives();
    } catch (err) {
      setDialogError(err.message || 'Failed to create drive.');
    } finally {
      setBusy(false);
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

    begin();
    try {
      setBusy(true);
      const res = await fetch(apiUrl('/api/placements/resumes/upload'), { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMsg(data.message);
      setResumeFile(null);
      loadResumes();
    } catch (err) {
      setError(err.message || 'Resume upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveResumeBuilder = async (e) => {
    e.preventDefault();
    begin();
    try {
      setBusy(true);
      const res = await apiRequest('/placements/resume-builder', { method: 'POST', body: JSON.stringify(resumeData) });
      setMsg(res.message);
    } catch (err) {
      setError(err.message || 'Failed to save resume.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateAppStatus = async (appId, newStatus) => {
    begin();
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

  const closeDialogs = () => {
    setSelectedDriveForApply(null);
    setShowAddDriveModal(false);
    setDialogError('');
  };
  const driveField = (key) => (e) => setDriveForm({ ...driveForm, [key]: e.target.value });
  const resumeField = (key) => (e) => setResumeData({ ...resumeData, [key]: e.target.value });
  const csvField = (key) => (e) => setResumeData({ ...resumeData, [key]: e.target.value.split(',').map((s) => s.trim()) });
  const errorCard = (key, retry) => (errors[key] ? <ErrorCard error={errors[key]} onRetry={retry} /> : null);

  const tabs = [
    { id: 'drives', label: 'Drives' },
    { id: 'applications', label: 'Applications' },
    { id: 'resumes', label: 'Resume Vault' },
    { id: 'builder', label: 'Resume Builder' },
    { id: 'prep', label: 'Interview Prep' }
  ];

  return (
    <div className="page placements" data-qa="placements-screen">
      <div className="tabs" role="tablist" aria-label="Placement sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab${activeTab === t.id ? ' tab--on' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="notice notice--good" role="status">{msg}</div>}
      {error && <div className="notice notice--bad" role="alert">{error}</div>}

      {/* TAB 1: PLACEMENT DRIVES */}
      {activeTab === 'drives' && (
        <>
          <form className="card placements__form" onSubmit={(e) => { e.preventDefault(); loadDrives(); }}>
            <div className="tabs" role="group" aria-label="Opportunity type">
              {DRIVE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={driveType === t.id}
                  className={`tab${driveType === t.id ? ' tab--on' : ''}`}
                  onClick={() => setDriveType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="pl-search">Search</label>
              <input
                id="pl-search"
                type="text"
                placeholder="Company, role title, or skills"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            {userRole === 'admin' && (
              <button type="button" className="btn" onClick={() => { setDialogError(''); setShowAddDriveModal(true); }}>
                + Post Placement Drive
              </button>
            )}
          </form>

          <h2 className="section-title">Recruitment &amp; Internship Drives</h2>
          {errorCard('drives', loadDrives)}
          {isLoading('drives') ? (
            <div className="empty-state">Loading drives...</div>
          ) : errors.drives ? null : (
            <DataCards
              rows={drives}
              keyOf={(d) => d.id}
              empty="No drives matched your filters."
              title={(d) => d.company_name}
              value={(d) => <span className={`pill ${d.job_type === 'Internship' ? 'pill--warn' : 'pill--good'}`}>{d.job_type}</span>}
              meta={[
                { label: 'Role', render: (d) => d.job_title },
                { label: 'Package', render: (d) => <strong>{d.ctc_or_stipend}</strong> },
                { label: 'Location', render: (d) => d.location },
                { label: 'Min CGPA', render: (d) => <strong>{d.min_cgpa}</strong> },
                { label: 'Eligible', render: (d) => d.eligible_branches },
                { label: 'About', render: (d) => d.description },
                {
                  label: 'Skills',
                  render: (d) =>
                    d.required_skills ? (
                      <span className="placements__skills">
                        {d.required_skills.split(',').map((s, idx) => (
                          <span key={idx} className="pill">{s.trim()}</span>
                        ))}
                      </span>
                    ) : null,
                },
                { label: 'Deadline', render: (d) => <span className="placements__deadline">{d.deadline_date}</span> },
                {
                  label: 'Action',
                  render: (d) =>
                    d.has_applied ? (
                      <span className="pill pill--good">Applied ({d.application_status})</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { setDialogError(''); setSelectedDriveForApply(d); }}
                      >
                        Apply Now
                      </button>
                    ),
                },
              ]}
            />
          )}
        </>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <>
          <h2 className="section-title">Application Tracker</h2>
          {!isLoading('apps') && !errors.apps && <p className="placements__hint">{applications.length} Applications Logged</p>}
          {errorCard('apps', loadApplications)}
          {isLoading('apps') ? (
            <div className="empty-state">Loading applications...</div>
          ) : errors.apps ? null : (
            <DataCards
              rows={applications}
              keyOf={(app) => app.id}
              empty="No recruitment applications submitted yet."
              title={(app) => app.company_name}
              value={(app) => <span className={`pill ${appTone(app.status)}`}>{app.status}</span>}
              meta={[
                { label: 'Position', render: (app) => app.job_title },
                { label: 'Type', render: (app) => app.job_type },
                { label: 'Pay', render: (app) => <strong>{app.ctc_or_stipend}</strong> },
                { label: 'Applied', render: (app) => app.applied_date },
                { label: 'Remarks', render: (app) => app.remarks || 'Application under screening.' },
                {
                  label: 'Coordinator',
                  render: (app) =>
                    userRole === 'admin' ? (
                      <div className="field">
                        <select
                          aria-label={`Update status for ${app.company_name}`}
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Selected">Selected</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    ) : null,
                },
              ]}
            />
          )}
        </>
      )}

      {/* TAB 3: RESUME VAULT */}
      {activeTab === 'resumes' && (
        <>
          <form className="card placements__form" onSubmit={handleUploadResume}>
            <h2 className="section-title">Upload New Resume</h2>
            <div className="field">
              <label htmlFor="pl-rtitle">Resume Version Title</label>
              <input id="pl-rtitle" type="text" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pl-rfile">Select Document (PDF / DOCX)</label>
              <input id="pl-rfile" type="file" required accept=".pdf,.docx,.doc" onChange={(e) => setResumeFile(e.target.files[0])} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Uploading...' : 'Upload to Placement Vault'}
            </button>
          </form>

          <h2 className="section-title">Active Resumes on Record</h2>
          {errorCard('resumes', loadResumes)}
          {isLoading('resumes') ? (
            <div className="empty-state">Loading resumes...</div>
          ) : errors.resumes ? null : (
            <DataCards
              rows={resumes}
              keyOf={(r) => r.id}
              empty="No resumes uploaded yet."
              title={(r) => r.title}
              meta={[
                { label: 'File', render: (r) => r.file_name },
                { label: 'Uploaded', render: (r) => r.uploaded_at },
                {
                  label: 'Action',
                  render: (r) => (
                    <button type="button" className="btn" onClick={() => openExternal(apiUrl(`/api/placements/resumes/${r.id}/download`))}>
                      Download Resume
                    </button>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {/* TAB 4: RESUME BUILDER */}
      {activeTab === 'builder' && (
        <>
          {errorCard('builder', loadResumeBuilder)}
          {isLoading('builder') ? (
            <div className="empty-state">Loading resume profile...</div>
          ) : errors.builder || !resumeData ? null : (
            <>
              <form className="card placements__form" onSubmit={handleSaveResumeBuilder}>
                <h2 className="section-title">Candidate Profile &amp; Credentials</h2>
                <div className="field">
                  <label htmlFor="pl-b-name">Full Name</label>
                  <input id="pl-b-name" type="text" value={resumeData.full_name ?? ''} onChange={resumeField('full_name')} />
                </div>
                <div className="field">
                  <label htmlFor="pl-b-head">Professional Headline</label>
                  <input id="pl-b-head" type="text" value={resumeData.headline ?? ''} onChange={resumeField('headline')} />
                </div>
                <div className="field">
                  <label htmlFor="pl-b-email">Email Address</label>
                  <input id="pl-b-email" type="email" value={resumeData.email ?? ''} onChange={resumeField('email')} />
                </div>
                <div className="field">
                  <label htmlFor="pl-b-phone">Phone Number</label>
                  <input id="pl-b-phone" type="text" value={resumeData.phone ?? ''} onChange={resumeField('phone')} />
                </div>
                <div className="field">
                  <label htmlFor="pl-b-sum">Executive Professional Summary</label>
                  <textarea id="pl-b-sum" rows="3" value={resumeData.summary ?? ''} onChange={resumeField('summary')} />
                </div>
                <div className="field">
                  <label htmlFor="pl-b-skills">Technical Skills (Comma Separated)</label>
                  <input id="pl-b-skills" type="text" value={listFrom(resumeData.skills)} onChange={csvField('skills')} />
                </div>
                <div className="field">
                  <label htmlFor="pl-b-certs">Certifications (Comma Separated)</label>
                  <input id="pl-b-certs" type="text" value={listFrom(resumeData.certifications)} onChange={csvField('certifications')} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>Save Resume Profile</button>
              </form>

              <h2 className="section-title">Live Resume Preview</h2>
              <div className="card placements__sheet">
                <div className="placements__head">
                  <h3 className="placements__name">{resumeData.full_name}</h3>
                  <div className="placements__headline">{resumeData.headline}</div>
                  <div className="placements__contact">{resumeData.email} | {resumeData.phone} | Bangalore, India</div>
                </div>
                <div>
                  <div className="placements__sect">Professional Summary</div>
                  <p className="placements__text">{resumeData.summary}</p>
                </div>
                <div>
                  <div className="placements__sect">Technical Proficiencies</div>
                  <div className="placements__skills">
                    {(resumeData.skills || []).map((s, i) => <span key={i} className="pill">{s}</span>)}
                  </div>
                </div>
                <div>
                  <div className="placements__sect">Education</div>
                  {(resumeData.education || []).map((ed, i) => (
                    <p key={i} className="placements__text">
                      <strong>{ed.degree}</strong> - {ed.institution} ({ed.year}) | <strong>{ed.score}</strong>
                    </p>
                  ))}
                </div>
                <div>
                  <div className="placements__sect">Key Academic Projects</div>
                  {(resumeData.projects || []).map((pj, i) => (
                    <p key={i} className="placements__text">
                      <strong>{pj.title}</strong> [{pj.tech}]: {pj.description}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB 5: INTERVIEW PREPARATION */}
      {activeTab === 'prep' && (
        <>
          <h2 className="section-title">Technical Knowledge Repositories</h2>
          {errorCard('prep', loadPrep)}
          {isLoading('prep') ? (
            <div className="empty-state">Loading preparation material...</div>
          ) : errors.prep ? null : (
            <>
              <DataCards
                rows={prepData.resources || []}
                keyOf={(r) => r.id}
                empty="No preparation resources yet."
                title={(r) => r.title}
                value={(r) => <span className="pill pill--info">{r.category}</span>}
                meta={[
                  { label: 'About', render: (r) => r.description },
                  { label: 'Key topics', render: (r) => <strong>{r.key_topics}</strong> },
                ]}
              />

              <h2 className="section-title">Mock Interview Question Bank</h2>
              <p className="placements__hint">Tap a question to reveal the model answer.</p>
              <div className="placements__qs">
                {(prepData.mock_questions || []).length === 0 && <div className="empty-state">No mock questions yet.</div>}
                {(prepData.mock_questions || []).map((q) => {
                  const open = revealedQuestionId === q.id;
                  return (
                    <div key={q.id} className="card placements__q">
                      <button
                        type="button"
                        className="placements__qbtn"
                        aria-expanded={open}
                        onClick={() => setRevealedQuestionId(open ? null : q.id)}
                      >
                        <span className="placements__qtext">
                          <strong>{q.question}</strong>
                          <span>Tags: {q.company_tags} | Category: {q.category}</span>
                        </span>
                        <span className={`pill ${q.difficulty === 'Hard' ? 'pill--bad' : 'pill--warn'}`}>{q.difficulty}</span>
                      </button>
                      {open && (
                        <div className="placements__ans">
                          <strong>Model Solution &amp; Architecture Approach</strong>
                          {q.sample_answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {selectedDriveForApply && (
        <Sheet title={`Apply for ${selectedDriveForApply.company_name}`} onClose={closeDialogs} onSubmit={handleApply}>
          <div className="notice">
            <div>Role: <strong>{selectedDriveForApply.job_title}</strong></div>
            <div>Compensation: <strong>{selectedDriveForApply.ctc_or_stipend}</strong></div>
            <div>Minimum Required CGPA: <strong>{selectedDriveForApply.min_cgpa}</strong></div>
          </div>
          <div className="notice notice--good">Eligibility Status: Verified (Student CGPA &gt;= Cutoff)</div>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <fieldset className="placements__radios">
            <legend>Select Resume from Vault</legend>
            {RESUME_CHOICES.map((c) => (
              <label key={c.value} className={`placements__radio${applyResumeName === c.value ? ' placements__radio--on' : ''}`}>
                <input
                  type="radio"
                  name="pl-resume"
                  value={c.value}
                  checked={applyResumeName === c.value}
                  onChange={(e) => setApplyResumeName(e.target.value)}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting...' : 'Confirm & Submit Application'}
            </button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {showAddDriveModal && (
        <Sheet title="Post New Campus Recruitment Drive" onClose={closeDialogs} onSubmit={handleCreateDrive}>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="pl-d-company">Company Name</label>
            <input id="pl-d-company" type="text" required value={driveForm.company_name} onChange={driveField('company_name')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-title">Job Title</label>
            <input id="pl-d-title" type="text" required value={driveForm.job_title} onChange={driveField('job_title')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-type">Opportunity Type</label>
            <select id="pl-d-type" value={driveForm.job_type} onChange={driveField('job_type')}>
              <option value="Full-time">Full-time (FTE)</option>
              <option value="Internship">Summer Internship</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pl-d-ctc">CTC / Stipend</label>
            <input id="pl-d-ctc" type="text" required placeholder="e.g. ₹28.0 LPA or ₹80,000 / month" value={driveForm.ctc_or_stipend} onChange={driveField('ctc_or_stipend')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-cgpa">Minimum CGPA</label>
            <input id="pl-d-cgpa" type="number" step="0.1" min="5" max="10" value={driveForm.min_cgpa} onChange={driveField('min_cgpa')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-loc">Location</label>
            <input id="pl-d-loc" type="text" value={driveForm.location} onChange={driveField('location')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-skills">Required Technical Skills</label>
            <input id="pl-d-skills" type="text" placeholder="e.g. C++, Java, Distributed Systems" value={driveForm.required_skills} onChange={driveField('required_skills')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-desc">Job Description</label>
            <textarea id="pl-d-desc" rows="3" value={driveForm.description} onChange={driveField('description')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-deadline">Application Deadline</label>
            <input id="pl-d-deadline" type="date" required value={driveForm.deadline_date} onChange={driveField('deadline_date')} />
          </div>
          <div className="field">
            <label htmlFor="pl-d-date">Drive Date</label>
            <input id="pl-d-date" type="date" required value={driveForm.drive_date} onChange={driveField('drive_date')} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Publish Placement Drive</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
