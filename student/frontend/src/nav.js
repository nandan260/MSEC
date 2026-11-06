// Navigation model for the mobile shell. Pure JS, no React.

export const SCREENS = {
  dashboard: { label: 'Dashboard', icon: 'home' },
  academics: { label: 'Academic Performance', icon: 'chart' },
  attendance: { label: 'Attendance', icon: 'check' },
  attendance_calc: { label: 'Attendance Calculator', icon: 'calc' },
  timetable: { label: 'Timetable', icon: 'calendar' },
  assignments: { label: 'Assignments', icon: 'clipboard' },
  notes: { label: 'Notes & Study Materials', icon: 'book' },
  examinations: { label: 'Examinations', icon: 'edit' },
  gpa_calc: { label: 'SGPA & CGPA Calculator', icon: 'calc' },
  profile: { label: 'Student Profile', icon: 'user' },
  placements: { label: 'Placement & Career', icon: 'briefcase' },
  projects: { label: 'Projects Hub', icon: 'folder' },
  events: { label: 'Events & Clubs', icon: 'star' },
  library: { label: 'Library', icon: 'library' },
  services: { label: 'Campus Services', icon: 'grid' },
  notifications: { label: 'Notifications', icon: 'bell' },
  analytics: { label: 'Performance Analytics', icon: 'trend' },
  doubts: { label: 'Faculty Doubt Portal', icon: 'help' },
  faculty_mentor: { label: 'Faculty Mentor', icon: 'users' },
  fees: { label: 'Fees Management', icon: 'receipt' },
  assistant: { label: 'Ask AI', icon: 'sparkle' },
  more: { label: 'More', icon: 'grid' },
  admin: { label: 'Admin: Roster', icon: 'users', roles: ['admin'] },
};

// Screens reachable only by certain roles (linked from More, not listed in MORE_GROUPS).
export const ROLE_SCREENS = ['admin'];

export const TABS = ['dashboard', 'attendance', 'assistant', 'academics', 'timetable', 'more'];

export const MORE_GROUPS = [
  { title: 'Study', ids: ['assignments', 'notes', 'examinations', 'gpa_calc', 'attendance_calc', 'analytics'] },
  { title: 'Campus', ids: ['events', 'library', 'services', 'placements', 'projects'] },
  { title: 'Help', ids: ['doubts', 'faculty_mentor'] },
  { title: 'Account', ids: ['fees', 'profile', 'notifications'] },
];

// The tab that is highlighted for a screen.
export function tabFor(id) {
  return TABS.includes(id) ? id : 'more';
}

// Selecting a tab resets history to home plus that tab. Any other screen is
// pushed on top, unless it is already the top item.
export function pushScreen(stack, id) {
  if (TABS.includes(id)) {
    return id === 'dashboard' ? ['dashboard'] : ['dashboard', id];
  }
  if (stack[stack.length - 1] === id) {
    return stack.slice();
  }
  return [...stack, id];
}

// Back navigation. Pops the top item. On a single item (home), signals exit.
export function popScreen(stack) {
  if (stack.length <= 1) {
    return { stack: stack.slice(), exit: true };
  }
  return { stack: stack.slice(0, -1), exit: false };
}
