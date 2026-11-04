import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'academics', label: 'Academic Performance' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'attendance_calc', label: 'Attendance Calculator' },
  { id: 'timetable', label: 'Timetable' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'notes', label: 'Notes & Study Materials' },
  { id: 'examinations', label: 'Examinations' },
  { id: 'gpa_calc', label: 'SGPA & CGPA Calculator' },
  { id: 'profile', label: 'Student Profile' },
  { id: 'placements', label: 'Placement & Career' },
  { id: 'projects', label: 'Projects Hub' },
  { id: 'events', label: 'Events & Clubs' },
  { id: 'library', label: 'Library' },
  { id: 'services', label: 'Campus Services' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'analytics', label: 'Performance Analytics' },
  { id: 'doubts', label: 'Faculty Doubt Portal' },
  { id: 'faculty_mentor', label: 'Faculty Mentor' },
  { id: 'fees', label: 'Fees Management' }
];

export default function Sidebar({ activeTab, onSelectTab, mobileOpen, onCloseMobile }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="sidebar-header-title">COLLEGE PORTAL</span>
        {mobileOpen && (
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '2px 8px', fontSize: '11px', color: '#1e293b' }}
            onClick={onCloseMobile}
          >
            Close
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              onSelectTab(item.id, item.label);
              if (onCloseMobile) onCloseMobile();
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
export { NAV_ITEMS };
