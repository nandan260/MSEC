// Attendance colour meaning shared by screens: >=85 good, 75-84 warn, <75 bad.
export const attendanceTone = (pct) => (pct >= 85 ? 'good' : pct >= 75 ? 'warn' : 'bad');
