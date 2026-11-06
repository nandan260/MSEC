import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, apiUrl, openExternal } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import './events.css';

const EMPTY_EVENT = {
  title: '',
  category: 'Hackathon',
  club_name: 'ACM Chapter',
  event_date: '',
  event_time: '10:00 AM',
  venue: 'Main Auditorium',
  description: '',
  registration_deadline: '',
  seats_total: 100
};

export default function EventsView({ userRole }) {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'my_registrations' | 'cert_desk'
  const [events, setEvents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [myRegistrations, setMyRegistrations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);

  // Certificate Upload State (Admin / Faculty)
  const [certEventId, setCertEventId] = useState(1);
  const [certStudentUsn, setCertStudentUsn] = useState('1MS21CS084');
  const [certTitle, setCertTitle] = useState('Certificate of Participation & Merit');
  const [certFile, setCertFile] = useState(null);

  const requestId = useRef(0);
  const searchRef = useRef('');
  searchRef.current = searchTerm;

  // One guarded loader for whichever list the tab needs; a late response from an
  // older tab or filter is dropped via the request id.
  const load = useCallback(() => {
    if (activeTab === 'cert_desk') return Promise.resolve();
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    let request;
    if (activeTab === 'events') {
      const q = new URLSearchParams();
      if (categoryFilter !== 'ALL') q.append('category', categoryFilter);
      if (searchRef.current) q.append('search', searchRef.current);
      request = apiRequest(`/events?${q.toString()}`).then((res) => {
        if (id === requestId.current) setEvents(res.events || []);
      });
    } else {
      request = apiRequest('/events/my-registrations').then((res) => {
        if (id === requestId.current) setMyRegistrations(res.registrations || []);
      });
    }
    return request
      .catch((err) => {
        if (id === requestId.current) setLoadError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [activeTab, categoryFilter]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const handleRegister = async (eventId) => {
    setMsg('');
    setError('');
    try {
      setBusy(true);
      const res = await apiRequest(`/events/${eventId}/register`, { method: 'POST' });
      setMsg(res.message);
      load();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e?.preventDefault();
    setMsg('');
    setError('');
    setDialogError('');
    try {
      setBusy(true);
      const res = await apiRequest('/events', {
        method: 'POST',
        body: JSON.stringify(eventForm)
      });
      setMsg(res.message);
      setShowAddEventModal(false);
      load();
    } catch (err) {
      setDialogError(err.message || 'Failed to create event.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event listing?')) return;
    setMsg('');
    setError('');
    try {
      await apiRequest(`/events/${eventId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete event.');
    }
  };

  // The select shows the first event when the stored id is not in the list; submit that one.
  const certEventValue = events.some((ev) => String(ev.id) === String(certEventId)) ? certEventId : events[0]?.id ?? certEventId;

  const handleUploadCertificate = async (e) => {
    e.preventDefault();
    if (!certFile) {
      setError('Please select a certificate document (PDF).');
      return;
    }
    const formData = new FormData();
    formData.append('certificate', certFile);
    formData.append('usn', certStudentUsn);
    formData.append('certificate_title', certTitle);

    setMsg('');
    setError('');
    try {
      setBusy(true);
      const res = await fetch(apiUrl(`/api/events/${certEventValue}/certificate/upload`), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Certificate issuance failed');
      setMsg(data.message);
      setCertFile(null);
    } catch (err) {
      setError(err.message || 'Certificate upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const closeAdd = () => {
    setShowAddEventModal(false);
    setDialogError('');
  };
  const setField = (key) => (e) => setEventForm({ ...eventForm, [key]: e.target.value });
  const isStaff = userRole === 'admin' || userRole === 'faculty';
  const tabs = [
    { id: 'events', label: 'Upcoming' },
    { id: 'my_registrations', label: 'My Passes' },
    ...(isStaff ? [{ id: 'cert_desk', label: 'Issue Certificates' }] : [])
  ];

  return (
    <div className="page events" data-qa="events-screen">
      <div className="tabs" role="tablist" aria-label="Events sections">
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
      {loadError && <ErrorCard error={loadError} onRetry={load} />}

      {activeTab === 'events' && (
        <>
          <form className="card events__filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <div className="field">
              <label htmlFor="ev-search">Search</label>
              <input
                id="ev-search"
                type="text"
                placeholder="Title, club, or venue"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ev-category">Category</label>
              <select id="ev-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">All Categories</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Workshop">Workshop</option>
                <option value="Technical Club">Technical Club</option>
                <option value="Cultural & Sports">Cultural & Sports</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            {userRole === 'admin' && (
              <button type="button" className="btn" onClick={() => { setDialogError(''); setShowAddEventModal(true); }}>
                + Post New Event
              </button>
            )}
          </form>

          <h2 className="section-title">Campus Events, Hackathons &amp; Clubs</h2>
          {loading ? (
            <div className="empty-state">Loading events...</div>
          ) : loadError ? null : (
            <DataCards
              rows={events}
              keyOf={(ev) => ev.id}
              empty="No events matched your filters."
              title={(ev) => ev.title}
              value={(ev) => <span className={`pill ${ev.category === 'Hackathon' ? 'pill--warn' : ''}`}>{ev.category}</span>}
              meta={[
                { label: 'Club', render: (ev) => ev.club_name },
                { label: 'Date', render: (ev) => `${ev.event_date} (${ev.event_time})` },
                { label: 'Venue', render: (ev) => ev.venue },
                { label: 'Seats', render: (ev) => `${ev.seats_booked} / ${ev.seats_total}` },
                { label: 'Deadline', render: (ev) => ev.registration_deadline },
                { label: 'About', render: (ev) => <span className="events__about">{ev.description}</span> },
                {
                  label: 'Action',
                  render: (ev) => (
                    <span className="events__actions">
                      {ev.is_registered ? (
                        <span className="pill pill--good">Pass Confirmed ({ev.attendance_status})</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy || ev.seats_booked >= ev.seats_total}
                          onClick={() => handleRegister(ev.id)}
                        >
                          {ev.seats_booked >= ev.seats_total ? 'Sold Out' : 'Register for Event'}
                        </button>
                      )}
                      {userRole === 'admin' && (
                        <button type="button" className="btn events__delete" onClick={() => handleDeleteEvent(ev.id)}>
                          Delete
                        </button>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {activeTab === 'my_registrations' && (
        <>
          <h2 className="section-title">Registered Events &amp; Certificates</h2>
          {!loading && !loadError && <p className="events__count">{myRegistrations.length} Registrations on File</p>}
          {loading ? (
            <div className="empty-state">Loading registrations...</div>
          ) : loadError ? null : (
            <DataCards
              rows={myRegistrations}
              keyOf={(reg) => reg.reg_id}
              empty="No event registrations found. Register for events first."
              title={(reg) => reg.title}
              value={(reg) => (
                <span className={`pill ${reg.attendance_status === 'Attended' ? 'pill--good' : 'pill--warn'}`}>
                  {reg.attendance_status}
                </span>
              )}
              meta={[
                { label: 'Category', render: (reg) => reg.category },
                { label: 'Club', render: (reg) => reg.club_name },
                { label: 'Date', render: (reg) => `${reg.event_date} - ${reg.venue}` },
                {
                  label: 'Certificate',
                  render: (reg) =>
                    reg.certificate_issued ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => openExternal(apiUrl(`/api/events/certificates/${reg.reg_id}/download`))}
                      >
                        Download Certificate (PDF)
                      </button>
                    ) : (
                      <span className="events__about">Certificate Pending Attendance</span>
                    ),
                },
              ]}
            />
          )}
        </>
      )}

      {activeTab === 'cert_desk' && isStaff && (
        <form className="card events__filters" onSubmit={handleUploadCertificate}>
          <h2 className="section-title">Issue Official Participation Certificate</h2>
          <div className="field">
            <label htmlFor="ev-cert-event">Select Event</label>
            <select id="ev-cert-event" value={certEventValue} onChange={(e) => setCertEventId(e.target.value)}>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.event_date})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-cert-usn">Recipient Student USN</label>
            <input id="ev-cert-usn" type="text" required value={certStudentUsn} onChange={(e) => setCertStudentUsn(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ev-cert-title">Certificate Title &amp; Award</label>
            <input id="ev-cert-title" type="text" required value={certTitle} onChange={(e) => setCertTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ev-cert-file">Upload Certificate Document (PDF)</label>
            <input id="ev-cert-file" type="file" required accept=".pdf" onChange={(e) => setCertFile(e.target.files[0])} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Issuing...' : 'Upload & Issue Certificate'}
          </button>
        </form>
      )}

      {showAddEventModal && (
        <Sheet title="Post New Campus Event" onClose={closeAdd} onSubmit={handleCreateEvent}>
          {dialogError && <div className="notice notice--bad" role="alert">{dialogError}</div>}
          <div className="field">
            <label htmlFor="ev-title">Event Title</label>
            <input id="ev-title" type="text" required value={eventForm.title} onChange={setField('title')} />
          </div>
          <div className="field">
            <label htmlFor="ev-cat">Activity Category</label>
            <select id="ev-cat" value={eventForm.category} onChange={setField('category')}>
              <option value="Hackathon">Hackathon</option>
              <option value="Workshop">Workshop</option>
              <option value="Seminar">Seminar</option>
              <option value="Technical Club">Technical Club</option>
              <option value="Cultural & Sports">Cultural & Sports</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-club">Organizing Club</label>
            <input id="ev-club" type="text" required value={eventForm.club_name} onChange={setField('club_name')} />
          </div>
          <div className="field">
            <label htmlFor="ev-date">Event Date</label>
            <input id="ev-date" type="date" required value={eventForm.event_date} onChange={setField('event_date')} />
          </div>
          <div className="field">
            <label htmlFor="ev-time">Event Timing</label>
            <input id="ev-time" type="text" required value={eventForm.event_time} onChange={setField('event_time')} />
          </div>
          <div className="field">
            <label htmlFor="ev-venue">Venue / Location</label>
            <input id="ev-venue" type="text" required value={eventForm.venue} onChange={setField('venue')} />
          </div>
          <div className="field">
            <label htmlFor="ev-seats">Total Seat Capacity</label>
            <input id="ev-seats" type="number" min="10" max="1000" value={eventForm.seats_total} onChange={setField('seats_total')} />
          </div>
          <div className="field">
            <label htmlFor="ev-desc">Event Description &amp; Agenda</label>
            <textarea id="ev-desc" rows="3" required value={eventForm.description} onChange={setField('description')} />
          </div>
          <div className="field">
            <label htmlFor="ev-deadline">Registration Cutoff Deadline</label>
            <input id="ev-deadline" type="date" required value={eventForm.registration_deadline} onChange={setField('registration_deadline')} />
          </div>
          <div className="sticky-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>Publish Campus Event</button>
            <button type="button" className="btn" onClick={closeAdd}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
