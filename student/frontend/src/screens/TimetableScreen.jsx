import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import './shared.css';
import './timetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Today as 1 (Mon) to 6 (Sat); Sunday falls back to Monday.
const defaultDay = () => {
  const d = new Date().getDay();
  return d === 0 ? 1 : d;
};

// The API sorts start_time as text, so "02:00 PM" lands before "09:00 AM". Sort by clock minutes here.
const minutesOf = (t) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(t || '');
  if (!m) return 0;
  // Without AM/PM the hour is already 24-hour.
  const h = m[3] ? (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0) : Number(m[1]);
  return h * 60 + Number(m[2]);
};
const bySchedule = (a, b) => a.day_of_week - b.day_of_week || minutesOf(a.start_time) - minutesOf(b.start_time);

export default function TimetableView({ userRole }) {
  const [viewType, setViewType] = useState('daily');
  const [day, setDay] = useState(defaultDay);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);
  const dialogRef = useRef(null);
  const activeChip = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [saveError, setSaveError] = useState('');

  // Form State
  const [formDay, setFormDay] = useState(1);
  const [formStart, setFormStart] = useState('09:00 AM');
  const [formEnd, setFormEnd] = useState('10:00 AM');
  const [formCode, setFormCode] = useState('CS601');
  const [formTitle, setFormTitle] = useState('Distributed Systems');
  const [formRoom, setFormRoom] = useState('LH-302');
  const [formFaculty, setFormFaculty] = useState('Dr. Ramesh Rao');

  const isAdmin = userRole === 'admin';

  // Each load gets an id; a response is applied only if no newer load (or unmount) happened.
  const loadTimetable = useCallback(() => {
    const url = viewType === 'weekly' ? '/timetable?view=weekly' : `/timetable?view=daily&day=${day}`;
    const id = ++reqId.current;
    setError(null);
    setSlots([]);
    setLoading(true);
    return apiRequest(url)
      .then((res) => {
        if (id === reqId.current) setSlots([...(res.schedule || [])].sort(bySchedule));
      })
      .catch((err) => {
        if (id === reqId.current) setError(err);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [viewType, day]);

  useEffect(() => {
    loadTimetable();
    return () => {
      reqId.current += 1;
    };
  }, [loadTimetable]);

  useEffect(() => {
    const el = activeChip.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [day, viewType]);

  useEffect(() => {
    if (!showAddModal) return undefined;
    dialogRef.current?.querySelector('input,select')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAddModal]);

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setSaveError('');
    const payload = {
      day_of_week: parseInt(formDay, 10),
      start_time: formStart,
      end_time: formEnd,
      course_code: formCode,
      course_title: formTitle,
      room: formRoom,
      faculty_name: formFaculty,
    };

    try {
      if (editingSlot) {
        await apiRequest(`/timetable/${editingSlot.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/timetable', { method: 'POST', body: JSON.stringify(payload) });
      }
    } catch (err) {
      setSaveError(err.message);
      return;
    }
    setShowAddModal(false);
    setEditingSlot(null);
    loadTimetable();
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Delete timetable entry #${id}?`)) {
      try {
        await apiRequest(`/timetable/${id}`, { method: 'DELETE' });
      } catch (err) {
        alert(`Error: ${err.message}`);
        return;
      }
      loadTimetable();
    }
  };

  const openAdd = () => {
    setEditingSlot(null);
    setSaveError('');
    setShowAddModal(true);
  };

  const openEdit = (slot) => {
    setEditingSlot(slot);
    setSaveError('');
    setFormDay(slot.day_of_week);
    setFormStart(slot.start_time);
    setFormEnd(slot.end_time);
    setFormCode(slot.course_code);
    setFormTitle(slot.course_title);
    setFormRoom(slot.room);
    setFormFaculty(slot.faculty_name);
    setShowAddModal(true);
  };

  const weekly = viewType === 'weekly';

  return (
    <div className="page timetable" data-qa="timetable-screen">
      <div className="timetable__bar">
        <button
          type="button"
          className="btn btn-ghost"
          aria-pressed={weekly}
          onClick={() => setViewType(weekly ? 'daily' : 'weekly')}
        >
          {weekly ? 'Day view' : 'Week view'}
        </button>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            + Add Entry
          </button>
        )}
      </div>

      {!weekly && (
        <div className="timetable__chips" role="group" aria-label="Day of week">
          {DAYS.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={day === i + 1}
              ref={day === i + 1 ? activeChip : null}
              className={`timetable__chip${day === i + 1 ? ' timetable__chip--on' : ''}`}
              onClick={() => setDay(i + 1)}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorCard error={error} onRetry={loadTimetable} />}

      {!error && !loading && weekly && (
        <div className="card scroll-x">
          <table className="timetable__grid">
            <thead>
              <tr>
                <th>Day</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Course Code</th>
                <th>Course Title</th>
                <th>Classroom</th>
                <th>Faculty Instructor</th>
                {isAdmin && <th>Admin Action</th>}
              </tr>
            </thead>
            <tbody>
              {slots.length > 0 ? (
                slots.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{DAYS[s.day_of_week - 1]}</strong></td>
                    <td>{s.start_time}</td>
                    <td>{s.end_time}</td>
                    <td><strong>{s.course_code}</strong></td>
                    <td>{s.course_title}</td>
                    <td>{s.room}</td>
                    <td>{s.faculty_name}</td>
                    {isAdmin && (
                      <td>
                        <div className="timetable__row-actions">
                          <button type="button" className="btn" onClick={() => openEdit(s)}>Edit</button>
                          <button type="button" className="btn timetable__delete" onClick={() => handleDelete(s.id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={isAdmin ? 8 : 7}>No classes scheduled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!error && loading && <div className="empty-state">Loading timetable...</div>}

      {!error && !loading && !weekly && (
        <DataCards
          rows={slots}
          keyOf={(s) => s.id}
          empty="No classes scheduled."
          title={(s) => `${s.course_code}: ${s.course_title}`}
          value={(s) => <span className="pill pill--info">{s.start_time} - {s.end_time}</span>}
          meta={[
            { label: 'Room', render: (s) => s.room },
            { label: 'Faculty', render: (s) => s.faculty_name },
            {
              label: isAdmin ? 'Admin' : '',
              render: (s) =>
                isAdmin ? (
                  <div className="timetable__row-actions">
                    <button type="button" className="btn" onClick={() => openEdit(s)}>Edit</button>
                    <button type="button" className="btn timetable__delete" onClick={() => handleDelete(s.id)}>Delete</button>
                  </div>
                ) : null,
            },
          ]}
        />
      )}

      {showAddModal && (
        <div className="sheet-scrim" role="dialog" aria-modal="true" aria-label={editingSlot ? 'Edit Timetable Entry' : 'Add New Timetable Entry'}>
          <form ref={dialogRef} className="card sheet" onSubmit={handleSaveSlot}>
            <h2 className="section-title">{editingSlot ? 'Edit Timetable Entry' : 'Add New Timetable Entry'}</h2>
            {saveError && <div className="pill pill--bad" role="alert">{saveError}</div>}
            <div className="field">
              <label htmlFor="tt-day">Day of Week</label>
              <select id="tt-day" value={formDay} onChange={(e) => setFormDay(e.target.value)}>
                {DAYS.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tt-start">Start Time</label>
              <input id="tt-start" type="text" required value={formStart} onChange={(e) => setFormStart(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tt-end">End Time</label>
              <input id="tt-end" type="text" required value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tt-code">Course Code</label>
              <input id="tt-code" type="text" required value={formCode} onChange={(e) => setFormCode(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tt-title">Course Title</label>
              <input id="tt-title" type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tt-room">Classroom Number</label>
              <input id="tt-room" type="text" required value={formRoom} onChange={(e) => setFormRoom(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tt-fac">Faculty Instructor</label>
              <input id="tt-fac" type="text" required value={formFaculty} onChange={(e) => setFormFaculty(e.target.value)} />
            </div>
            <div className="timetable__row-actions">
              <button type="submit" className="btn btn-primary">Save Timetable Entry</button>
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
