import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiUrl, openDownload } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import './notes.css';

export default function NotesView({ userRole }) {
  const [materials, setMaterials] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Faculty Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubject, setUploadSubject] = useState('CS601');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Lecture Notes');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const requestId = useRef(0);
  const searchRef = useRef('');
  searchRef.current = searchTerm;

  // Stale responses (an older filter resolving late) are dropped via the request id.
  const loadMaterials = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setMaterials([]);
    const params = new URLSearchParams();
    if (subjectFilter !== 'ALL') params.append('subject', subjectFilter);
    if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
    if (searchRef.current) params.append('search', searchRef.current);

    return apiRequest(`/notes?${params.toString()}`)
      .then((res) => {
        if (id === requestId.current) setMaterials(res.materials || []);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [subjectFilter, categoryFilter]);

  useEffect(() => {
    loadMaterials();
    return () => {
      requestId.current += 1;
    };
  }, [loadMaterials]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMaterials();
  };

  const handleDownload = (id) => {
    openDownload(`/api/notes/${id}/download`);
  };

  const handleUploadSubmit = async (e) => {
    e?.preventDefault();
    if (!uploadFile) {
      alert('Please choose a file to upload.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('course_code', uploadSubject);
    formData.append('course_title', uploadSubject === 'CS601' ? 'Distributed Systems' : 'Computer Science');
    formData.append('title', uploadTitle);
    formData.append('category', uploadCategory);
    formData.append('uploaded_by', 'Faculty Instructor');
    formData.append('file', uploadFile);

    try {
      const res = await fetch(apiUrl('/api/notes/upload'), { method: 'POST', body: formData });
      const data = await res.json();
      alert(data.message);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadFile(null);
      loadMaterials();
    } catch (err) {
      setUploadError(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const closeUpload = () => {
    setShowUploadModal(false);
    setUploadError(null);
  };

  return (
    <div className="page notes" data-qa="notes-screen">
      {(userRole === 'faculty' || userRole === 'admin') && (
        <button type="button" className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          + Upload Study Material
        </button>
      )}

      <form className="card notes__filters" onSubmit={handleSearchSubmit}>
        <div className="field">
          <label htmlFor="notes-search">Search</label>
          <input
            id="notes-search"
            type="text"
            placeholder="Topic, keyword, or author"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="notes-subject">Subject</label>
          <select id="notes-subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="ALL">All Subjects</option>
            <option value="CS601">CS601: Distributed Systems</option>
            <option value="CS602">CS602: Machine Learning</option>
            <option value="CS603">CS603: Compiler Design</option>
            <option value="CS604">CS604: Cloud Architecture</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="notes-category">Document type</label>
          <select id="notes-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Document Types</option>
            <option value="Lecture Notes">Lecture Notes</option>
            <option value="Lab Manual">Lab Manual</option>
            <option value="Previous Question Paper">Previous Question Paper</option>
            <option value="Reference Slide">Reference Slide</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      <h2 className="section-title">Curated Academic Repositories</h2>
      {!loading && !error && <p className="notes__count">{materials.length} Documents Available</p>}

      {error && <ErrorCard error={error} onRetry={loadMaterials} />}

      {loading ? (
        <div className="empty-state">Searching repository...</div>
      ) : error ? null : (
        <DataCards
          rows={materials}
          keyOf={(m) => m.id}
          empty="No study materials matched your filters."
          title={(m) => m.title}
          value={(m) => <span className="pill pill--info">{m.category}</span>}
          meta={[
            { label: 'Course', render: (m) => m.course_code },
            { label: 'Format', render: (m) => <span className="notes__format">{m.file_format}</span> },
            { label: 'Size', render: (m) => m.file_size },
            { label: 'Uploaded by', render: (m) => m.uploaded_by },
            { label: 'Date', render: (m) => m.upload_date },
            { label: 'Downloads', render: (m) => m.downloads_count },
            {
              label: 'Action',
              render: (m) => (
                <button type="button" className="btn" onClick={() => handleDownload(m.id)}>
                  Download {m.file_format}
                </button>
              ),
            },
          ]}
        />
      )}

      {/* Faculty Upload Modal */}
      {showUploadModal && (
        <Sheet title="Upload Course Material" onClose={closeUpload} onSubmit={handleUploadSubmit}>
          {uploadError && <ErrorCard error={uploadError} onRetry={handleUploadSubmit} />}
          <div className="field">
            <label htmlFor="notes-up-subject">Subject Course</label>
            <select id="notes-up-subject" value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)}>
              <option value="CS601">CS601: Distributed Systems</option>
              <option value="CS602">CS602: Machine Learning</option>
              <option value="CS603">CS603: Compiler Design</option>
              <option value="CS604">CS604: Cloud Architecture</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="notes-up-title">Document Title</label>
            <input id="notes-up-title" type="text" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="notes-up-cat">Category</label>
            <select id="notes-up-cat" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              <option value="Lecture Notes">Lecture Notes</option>
              <option value="Lab Manual">Lab Manual</option>
              <option value="Previous Question Paper">Previous Question Paper</option>
              <option value="Reference Slide">Reference Slide</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="notes-up-file">File (PDF, PPT, DOC, DOCX)</label>
            <input id="notes-up-file" type="file" required onChange={(e) => setUploadFile(e.target.files[0])} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={uploadLoading}>
              {uploadLoading ? 'Uploading...' : 'Upload Document'}
            </button>
            <button type="button" className="btn" onClick={closeUpload}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
