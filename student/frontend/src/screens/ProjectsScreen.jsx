import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiUrl, openDownload } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import './projects.css';

const EMPTY_PROJECT = {
  title: '',
  category: 'Capstone Project',
  description: '',
  technologies: '',
  github_url: '',
  demo_url: '',
  team_status: 'Looking for Teammates',
  open_roles: '1 Systems Dev, 1 React UI Engineer',
  guide_name: 'Dr. Ramesh Rao'
};

export default function ProjectsView({ userRole }) {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRole, setJoinRole] = useState('Frontend Engineer');
  const [joinMsg, setJoinMsg] = useState('');

  // Feedback dialog (Faculty)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState(48);
  const [feedbackComments, setFeedbackComments] = useState('');

  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT);
  const [docFile, setDocFile] = useState(null);

  const requestId = useRef(0);
  const searchRef = useRef('');
  searchRef.current = searchTerm;

  // A late response from an older filter is dropped via the request id.
  const loadProjects = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    const q = new URLSearchParams();
    if (categoryFilter !== 'ALL') q.append('category', categoryFilter);
    if (teamFilter !== 'ALL') q.append('team_status', teamFilter);
    if (searchRef.current) q.append('search', searchRef.current);
    return apiRequest(`/projects?${q.toString()}`)
      .then((res) => {
        if (id === requestId.current) setProjects(res.projects || []);
      })
      .catch((err) => {
        if (id === requestId.current) setLoadError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [categoryFilter, teamFilter]);

  useEffect(() => {
    loadProjects();
    return () => {
      requestId.current += 1;
    };
  }, [loadProjects]);

  const begin = () => {
    setMsg('');
    setError('');
    setDialogError('');
  };

  const handleCreateProject = async (e) => {
    e?.preventDefault();
    begin();
    const formData = new FormData();
    Object.keys(projectForm).forEach((k) => formData.append(k, projectForm[k]));
    if (docFile) formData.append('document_file', docFile);

    try {
      setBusy(true);
      const res = await fetch(apiUrl('/api/projects'), { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to showcase project');
      setMsg(data.message);
      setShowCreateModal(false);
      setDocFile(null);
      loadProjects();
    } catch (err) {
      setDialogError(err.message || 'Project registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendJoinRequest = async (e) => {
    e?.preventDefault();
    if (!selectedProject) return;
    begin();
    try {
      setBusy(true);
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
      setDialogError(err.message || 'Failed to submit teammate request.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e?.preventDefault();
    if (!selectedProject) return;
    begin();
    try {
      setBusy(true);
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
      setDialogError(err.message || 'Failed to submit evaluation.');
    } finally {
      setBusy(false);
    }
  };

  const closeDialogs = () => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setShowFeedbackModal(false);
    setDialogError('');
  };
  const projectField = (key) => (e) => setProjectForm({ ...projectForm, [key]: e.target.value });
  const canEvaluate = userRole === 'faculty' || userRole === 'admin';
  const categoryOptions = (
    <>
      <option value="Capstone Project">Capstone Project</option>
      <option value="Mini Project">Mini Project</option>
      <option value="Research">Research & Papers</option>
      <option value="Open Source">Open Source Tooling</option>
    </>
  );

  return (
    <div className="page projects" data-qa="projects-screen">
      {msg && <div className="notice notice--good" role="status">{msg}</div>}
      {error && <div className="notice notice--bad" role="alert">{error}</div>}

      <form className="card projects__form" onSubmit={(e) => { e.preventDefault(); loadProjects(); }}>
        <div className="field">
          <label htmlFor="pj-search">Search</label>
          <input
            id="pj-search"
            type="text"
            placeholder="Title, stack, or keywords"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pj-category">Category</label>
          <select id="pj-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {categoryOptions}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pj-team">Team status</label>
          <select id="pj-team" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="ALL">All Team Statuses</option>
            <option value="Looking for Teammates">Looking for Teammates</option>
            <option value="Team Full">Team Full</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
        <button type="button" className="btn" onClick={() => { setDialogError(''); setShowCreateModal(true); }}>
          + Showcase Academic Project
        </button>
      </form>

      <h2 className="section-title">Academic Projects Hub</h2>
      {loadError && <ErrorCard error={loadError} onRetry={loadProjects} />}
      {loading ? (
        <div className="empty-state">Loading projects...</div>
      ) : loadError ? null : (
        <DataCards
          rows={projects}
          keyOf={(p) => p.id}
          empty="No projects matched your filters."
          title={(p) => p.title}
          value={(p) => <span className="pill pill--info">{p.category}</span>}
          meta={[
            { label: 'Author', render: (p) => `${p.student_name} (${p.usn})` },
            { label: 'About', render: (p) => p.description },
            {
              label: 'Tech',
              render: (p) =>
                p.technologies ? (
                  <span className="projects__tech">
                    {p.technologies.split(',').map((t, idx) => (
                      <span key={idx} className="pill">{t.trim()}</span>
                    ))}
                  </span>
                ) : null,
            },
            { label: 'Guide', render: (p) => `${p.guide_name || 'Dr. Ramesh Rao'} (${p.guide_status})` },
            {
              label: 'Team',
              render: (p) =>
                p.team_status === 'Looking for Teammates' ? (
                  <span className="projects__slots">Open slots: {p.open_roles || 'Open Collaboration'}</span>
                ) : (
                  <span className="projects__full">Team Status: Full</span>
                ),
            },
            {
              label: 'Score',
              render: (p) => (p.avg_score ? <span className="projects__score">{p.avg_score} / 50</span> : null),
            },
            {
              label: 'Links',
              render: (p) =>
                p.github_url || p.document_file ? (
                  <span className="projects__actions">
                    {p.github_url && (
                      <a href={p.github_url} target="_blank" rel="noreferrer" className="btn">GitHub Repo</a>
                    )}
                    {p.document_file && (
                      <button type="button" className="btn" onClick={() => openDownload(`/api/projects/${p.id}/document/download`)}>
                        Architecture PDF
                      </button>
                    )}
                  </span>
                ) : null,
            },
            {
              label: 'Action',
              render: (p) =>
                p.team_status === 'Looking for Teammates' || canEvaluate ? (
                  <span className="projects__actions">
                    {p.team_status === 'Looking for Teammates' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { setDialogError(''); setSelectedProject(p); setShowJoinModal(true); }}
                      >
                        Join Team
                      </button>
                    )}
                    {canEvaluate && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => { setDialogError(''); setSelectedProject(p); setShowFeedbackModal(true); }}
                      >
                        Evaluate
                      </button>
                    )}
                  </span>
                ) : null,
            },
          ]}
        />
      )}

      {showCreateModal && (
        <Sheet title="Showcase New Academic Project" onClose={closeDialogs} onSubmit={handleCreateProject}>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="pj-c-title">Project Title</label>
            <input id="pj-c-title" type="text" required value={projectForm.title} onChange={projectField('title')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-cat">Project Domain Category</label>
            <select id="pj-c-cat" value={projectForm.category} onChange={projectField('category')}>{categoryOptions}</select>
          </div>
          <div className="field">
            <label htmlFor="pj-c-guide">Faculty Guide Mentor</label>
            <input id="pj-c-guide" type="text" value={projectForm.guide_name} onChange={projectField('guide_name')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-tech">Technologies Used (Comma Separated)</label>
            <input id="pj-c-tech" type="text" required placeholder="e.g. Go, Docker, gRPC, React.js" value={projectForm.technologies} onChange={projectField('technologies')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-desc">Detailed Abstract &amp; Problem Statement</label>
            <textarea id="pj-c-desc" rows="3" required value={projectForm.description} onChange={projectField('description')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-git">GitHub Repository URL</label>
            <input id="pj-c-git" type="url" placeholder="https://github.com/..." value={projectForm.github_url} onChange={projectField('github_url')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-demo">Live Hosted Prototype URL</label>
            <input id="pj-c-demo" type="url" placeholder="https://..." value={projectForm.demo_url} onChange={projectField('demo_url')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-team">Team Recruitment Status</label>
            <select id="pj-c-team" value={projectForm.team_status} onChange={projectField('team_status')}>
              <option value="Looking for Teammates">Looking for Teammates</option>
              <option value="Team Full">Team Full</option>
              <option value="Individual">Individual Work</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pj-c-roles">Open Teammate Roles</label>
            <input id="pj-c-roles" type="text" placeholder="e.g. 1 ML Engineer, 1 UI Dev" value={projectForm.open_roles} onChange={projectField('open_roles')} />
          </div>
          <div className="field">
            <label htmlFor="pj-c-file">Project Architecture / Report Document (PDF)</label>
            <input id="pj-c-file" type="file" accept=".pdf" onChange={(e) => setDocFile(e.target.files[0])} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Publish Academic Project</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {showJoinModal && selectedProject && (
        <Sheet title="Join Project Team" onClose={closeDialogs} onSubmit={handleSendJoinRequest}>
          <p className="projects__note">Applying to collaborate on: <strong>{selectedProject.title}</strong></p>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="pj-j-role">Role You Want to Fill</label>
            <input id="pj-j-role" type="text" required value={joinRole} onChange={(e) => setJoinRole(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pj-j-msg">Contribution Pitch / Message to Team Lead</label>
            <textarea
              id="pj-j-msg" rows="3" required value={joinMsg}
              placeholder="Your relevant skills, tools, and availability"
              onChange={(e) => setJoinMsg(e.target.value)}
            />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Send Teammate Request</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}

      {showFeedbackModal && selectedProject && (
        <Sheet title="Faculty Project Evaluation" onClose={closeDialogs} onSubmit={handleSendFeedback}>
          <p className="projects__note">Project: <strong>{selectedProject.title}</strong></p>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="pj-f-score">Evaluation Marks (Max 50)</label>
            <input id="pj-f-score" type="number" min="0" max="50" required value={feedbackScore} onChange={(e) => setFeedbackScore(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pj-f-comments">Faculty Written Feedback &amp; Assessment Remarks</label>
            <textarea
              id="pj-f-comments" rows="4" required value={feedbackComments}
              placeholder="Architecture design, testing rigor, implementation quality"
              onChange={(e) => setFeedbackComments(e.target.value)}
            />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Submit Evaluation</button>
            <button type="button" className="btn" onClick={closeDialogs}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
