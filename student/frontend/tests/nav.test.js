import { describe, it, expect } from 'vitest';
import { SCREENS, TABS, MORE_GROUPS, tabFor, pushScreen, popScreen } from '../src/nav.js';

const SIDEBAR_IDS = [
  'dashboard', 'academics', 'attendance', 'attendance_calc', 'timetable',
  'assignments', 'notes', 'examinations', 'gpa_calc', 'profile',
  'placements', 'projects', 'events', 'library', 'services',
  'notifications', 'analytics', 'doubts', 'faculty_mentor', 'fees', 'assistant'
];

describe('nav model', () => {
  it('SCREENS holds every sidebar id plus more, with labels and icons', () => {
    for (const id of SIDEBAR_IDS) {
      expect(SCREENS[id], id).toBeDefined();
      expect(typeof SCREENS[id].label).toBe('string');
      expect(typeof SCREENS[id].icon).toBe('string');
    }
    expect(SCREENS.more.label).toBe('More');
    expect(Object.keys(SCREENS).sort()).toEqual([...SIDEBAR_IDS, 'more'].sort());
  });

  it('TABS is the bottom tab list', () => {
    expect(TABS).toEqual(['dashboard', 'attendance', 'assistant', 'academics', 'timetable', 'more']);
  });

  it('MORE_GROUPS matches the spec groups', () => {
    expect(MORE_GROUPS.map((g) => g.title)).toEqual(['Study', 'Campus', 'Help', 'Account']);
    expect(MORE_GROUPS[0].ids).toEqual(['assignments', 'notes', 'examinations', 'gpa_calc', 'attendance_calc', 'analytics']);
    expect(MORE_GROUPS[1].ids).toEqual(['events', 'library', 'services', 'placements', 'projects']);
    expect(MORE_GROUPS[2].ids).toEqual(['doubts', 'faculty_mentor']);
    expect(MORE_GROUPS[3].ids).toEqual(['fees', 'profile', 'notifications']);
  });

  it('MORE_GROUPS plus TABS cover exactly the screen ids with no duplicates', () => {
    const all = [...TABS.filter((t) => t !== 'more'), ...MORE_GROUPS.flatMap((g) => g.ids)];
    expect(all.length).toBe(new Set(all).size);
    expect([...all].sort()).toEqual([...SIDEBAR_IDS].sort());
  });

  it('tabFor maps screens to their highlighted tab', () => {
    expect(tabFor('library')).toBe('more');
    expect(tabFor('timetable')).toBe('timetable');
    expect(tabFor('dashboard')).toBe('dashboard');
  });

  it('pushScreen does not duplicate the top item', () => {
    expect(pushScreen(['dashboard'], 'dashboard')).toEqual(['dashboard']);
  });

  it('selecting a tab resets the stack to home plus tab', () => {
    expect(pushScreen(['dashboard', 'more', 'library'], 'attendance')).toEqual(['dashboard', 'attendance']);
    expect(pushScreen(['dashboard', 'more', 'library'], 'dashboard')).toEqual(['dashboard']);
  });

  it('pushScreen pushes a non-tab screen on top', () => {
    expect(pushScreen(['dashboard', 'more'], 'library')).toEqual(['dashboard', 'more', 'library']);
  });

  it('pushScreen does not mutate its input', () => {
    const s = ['dashboard', 'more'];
    pushScreen(s, 'library');
    expect(s).toEqual(['dashboard', 'more']);
  });

  it('pushScreen returns the same stack when a non-tab id is already on top', () => {
    const s = ['dashboard', 'library'];
    expect(pushScreen(s, 'library')).toEqual(['dashboard', 'library']);
  });

  it('popScreen pops the top item when the stack is longer than 1', () => {
    expect(popScreen(['dashboard', 'more', 'library'])).toEqual({ stack: ['dashboard', 'more'], exit: false });
  });

  it('popScreen on home alone signals exit and keeps the stack', () => {
    expect(popScreen(['dashboard'])).toEqual({ stack: ['dashboard'], exit: true });
  });
});
