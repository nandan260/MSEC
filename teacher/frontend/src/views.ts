import { icon } from './icons.js';
import { atRisk, today } from './model.js';
import type { AppState, ClassItem, Filters, Student } from './types.js';

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter((s) => s !== 'Dr.')
    .slice(0, 2)
    .map((s) => s[0])
    .join('');

export const mean = (xs: number[]): number =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

export const fmt = (d: string): string =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const cls = (s: AppState, id: string): ClassItem | undefined => s.classes.find((c) => c.id === id);

export const className = (s: AppState, id: string): string =>
  id === 'all' ? 'All classes' : cls(s, id)?.subject ?? 'Unassigned';

export const badge = (text: string, color = ''): string => `<span class="badge ${color}">${esc(text)}</span>`;

export const button = (text: string, action: string, extra = '', style = ''): string =>
  `<button type="button" class="btn ${style}" data-action="${action}" ${extra}>${text}</button>`;

export const link = (text: string, route: string): string =>
  `<a class="text-link" href="#${route}">${text} ${icon('arrow')}</a>`;

export const avatar = (name: string, color = ''): string =>
  `<span class="avatar ${color}">${esc(initials(name))}</span>`;

export const empty = (
  title = 'Nothing here yet',
  text = 'Create your first item to get started.'
): string => `<div class="empty">${icon('folder')}<h3>${title}</h3><p>${text}</p></div>`;

export const table = (heads: string[], rows: string[]): string =>
  `<div class="table-wrap"><table><thead><tr>${heads
    .map((h) => `<th>${h}</th>`)
    .join('')}</tr></thead><tbody>${
    rows.length
      ? rows.join('')
      : `<tr><td colspan="${heads.length}">${empty('No matching records', 'Try another class or search term.')}</td></tr>`
  }</tbody></table></div>`;

export const person = (s: Student): string =>
  `<div class="person">${avatar(s.name, ['', 'orange', 'purple', 'blue'][Number(s.id.slice(1)) % 4])}<span><strong>${esc(
    s.name
  )}</strong><small>${esc(s.roll)}</small></span></div>`;

export const score = (n: number): string =>
  `<span class="score">${n}% <span class="bar ${n < 75 ? 'low' : ''}"><i style="width:${n}%"></i></span></span>`;

export const selectClasses = (s: AppState, id = '', all = true): string =>
  `${all ? '<option value="all">All classes</option>' : ''}${s.classes
    .map(
      (c) =>
        `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${esc(c.subject)} · ${esc(
          c.section.split(' · ').at(-1)
        )}</option>`
    )
    .join('')}`;

export function heading(
  title: string,
  sub: string,
  actions = '',
  eyebrow = 'YOUR TEACHING WORKSPACE'
): string {
  return `<div class="page-heading"><div><div class="eyebrow">${icon('sun')}${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p></div><div class="heading-actions">${actions}</div></div>`;
}

export function filters(s: AppState, f: Filters, search = true): string {
  return `<div class="toolbar"><div class="filters"><select id="class-filter" aria-label="Filter by class">${selectClasses(
    s,
    f.classId
  )}</select>${
    search
      ? `<label class="search-field">${icon('search')}<input id="list-search" value="${esc(
          f.search
        )}" type="search" placeholder="Search records…" aria-label="Search records"></label>`
      : ''
  }</div></div>`;
}

function weeklyChart(s: AppState): string {
  const now = new Date(),
    day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(12, 0, 0, 0);
  const reviews = s.submissions.filter((x) => x.marks === null).length;
  const columns = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      sessions: s.classes.filter((c) => c.days.includes(i)).length,
      exams: s.assessments.filter((a) => a.date === d.toLocaleDateString('en-CA')).length,
      review: i === day ? reviews : 0
    };
  });
  // Text stays in CSS pixels; only the nested bar graphics use a scaled viewBox.
  // A shared baseline and a scale that includes every series keep all stacks above zero.
  const ceiling = Math.max(4, ...columns.map((c) => c.sessions + c.exams + c.review));
  const scale = 172 / ceiling, baseline = 190;
  return `<div class="week-legend"><span><i class="key-yellow"></i>Assessments</span><span><i class="key-green"></i>Classes</span><span><i class="key-orange"></i>To review</span></div><div class="week-chart-wrap"><svg class="week-chart" role="img" aria-label="Weekly timetable: ${columns
    .map((c) => `${c.day} ${c.sessions} classes`)
    .join(', ')}. ${reviews} submissions waiting for review."><defs>${[['green', 'var(--color-primary)'], ['yellow', 'var(--color-warning)'], ['orange', 'var(--color-accent)']].map(([name, color]) => `<pattern id="week-${name}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${color}"/></pattern>`).join('')}</defs>${Array.from({ length: 5 }, (_, i) => Math.ceil((i * ceiling) / 4))
    .map((v) => `<line x1="${31 / 560 * 100}%" x2="${550 / 560 * 100}%" y1="${(baseline - v * scale) / 224 * 100}%" y2="${(baseline - v * scale) / 224 * 100}%" stroke="var(--color-border)"/><text x="8" y="${(baseline - v * scale) / 224 * 100}%" dy="4">${v}</text>`)
    .join('')}${columns.map((c, i) => {
      const x = 42 + i * 73, w = 48, active = i === day;
      let top = baseline;
      const bars = [
        { count: c.sessions, series: 'classes', color: 'var(--color-primary)' },
        { count: c.exams, series: 'assessments', color: 'var(--color-warning)' },
        { count: c.review, series: 'review', color: 'var(--color-accent)' }
      ].map(({ count, series, color }) => {
        if (!count) return '';
        const height = count * scale;
        top -= height;
        return `<rect class="week-bar week-bar-${series}" x="${x}" y="${top}" width="${w}" height="${height}" rx="3" fill="${color}"/>`;
      }).join('');
      return `<g class="week-column${active ? ' is-today' : ''}" data-day="${i}" tabindex="0" aria-label="${c.day}: ${c.sessions} classes, ${c.exams} assessments, ${c.review} to review"><title>${c.day}: ${c.sessions} classes · ${c.exams} assessments${active ? ' · ' + c.review + ' submissions to review' : ''}</title><svg width="100%" height="100%" viewBox="0 0 560 224" preserveAspectRatio="none" aria-hidden="true">${active ? `<path class="week-today-highlight" d="M${x - 6} 12h${w + 12}v208h-${w + 12}z" fill="var(--color-primary-light)"/>` : ''}${bars}</svg><text x="${(x + w / 2) / 560 * 100}%" y="${212 / 224 * 100}%" text-anchor="middle">${c.day}</text></g>`;
    }).join('')}</svg><div class="week-tooltip"><strong>${columns[day].day}, ${fmt(today())}</strong><span><i class="dot"></i>Classes <b>${columns[day].sessions}</b></span><span><i class="dot yellow"></i>Assessments <b>${columns[day].exams}</b></span><span><i class="dot orange"></i>To review <b>${reviews}</b></span></div></div>`;
}

function stat(label: string, value: string | number, ico: string, color: string, note: string, tag: string): string {
  const colorMap: Record<string, string> = {
    teal: 'var(--color-primary)',
    purple: 'var(--color-primary)',
    orange: 'var(--color-warning)',
    blue: 'var(--color-info)'
  };
  return `<article class="stat"><div class="stat-top">${label}<span class="stat-icon ${color}">${icon(
    ico
  )}</span></div><div class="stat-number">${value}</div><div class="stat-bottom">${tag ? `<b>${tag}</b>` : ''}<span>${note}</span></div><svg class="sparkline" viewBox="0 0 75 30" fill="none" aria-hidden="true"><path d="M1 25 9 21 17 23 26 14 34 17 42 10 51 13 60 5 73 2" stroke="${
    colorMap[color] || 'var(--color-primary)'
  }" stroke-width="1.7"/></svg></article>`;
}

export function chart(s: AppState): string {
  const vals = s.classes.map((c) => mean(s.students.filter((x) => x.classId === c.id).map((x) => x.score)));
  const ats = s.classes.map((c) => mean(s.students.filter((x) => x.classId === c.id).map((x) => x.attendance)));
  return `<div class="chart-legend"><small>Current class averages</small><div class="legend"><span><i class="dot"></i>Academic score</span><span><i class="dot light"></i>Attendance</span></div></div><div class="analytics-chart"><svg class="chart" viewBox="0 0 560 200" role="img" aria-label="Class academic score and attendance comparison"><defs><pattern id="bar-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="5" height="5" fill="var(--color-primary)"/><rect width="2" height="5" fill="var(--color-primary-light)"/></pattern></defs>${[
    0, 25, 50, 75, 100
  ]
    .map(
      (v) =>
        `<line class="chart-grid" x1="34" x2="552" y1="${170 - v * 1.45}" y2="${170 - v * 1.45}"/><text x="2" y="${
          174 - v * 1.45
        }">${v}%</text>`
    )
    .join('')}${s.classes
    .map((c, i) => {
      const x = 76 + i * 128;
      return `<rect x="${x}" y="${170 - vals[i] * 1.45}" width="25" height="${
        vals[i] * 1.45
      }" rx="4" fill="url(#bar-hatch)"/><rect x="${x + 31}" y="${170 - ats[i] * 1.45}" width="25" height="${
        ats[i] * 1.45
      }" rx="4" fill="var(--color-primary-light)"/><text text-anchor="middle" x="${x + 28}" y="193">${c.code}</text>`;
    })
    .join('')}</svg><div class="phone-chart-labels" hidden aria-hidden="true">${[0, 25, 50, 75, 100]
    .map((v) => `<span class="phone-chart-y" style="top:${(170 - v * 1.45) / 200 * 100}%">${v}%</span>`)
    .join('')}${s.classes
    .map((c, i) => `<span class="phone-chart-x" style="left:${(104 + i * 128) / 560 * 100}%;top:94.5%">${esc(c.code)}</span>`)
    .join('')}</div></div><div class="chart-summary"><span>Class average<strong>${mean(
    s.students.map((x) => x.score)
  )}%</strong></span><span>Avg. attendance<strong>${mean(s.students.map((x) => x.attendance))}%</strong></span></div>`;
}

export function classTile(s: AppState, c: ClassItem): string {
  const students = s.students.filter((x) => x.classId === c.id);
  return `<article class="class-tile"><span class="subject-icon ${c.color}">${icon(
    'book'
  )}</span><h3>${esc(c.subject)}</h3><p>${esc(c.section)}</p><div class="class-meta"><span>${icon('users')}${
    students.length
  } students</span><span>${esc(c.code)}</span></div><div class="class-footer"><span>${esc(c.room)}</span>${icon(
    'arrow'
  )}</div><button class="tile-link" data-action="class-detail" data-id="${c.id}" aria-label="Open ${esc(
    c.subject
  )}"></button></article>`;
}

export function overview(s: AppState): string {
  const avg = mean(s.students.map((x) => x.score));
  const attendance = mean(s.students.map((x) => x.attendance));
  const pending = s.tasks.filter((x) => !x.done).length + s.submissions.filter((x) => x.marks === null).length;
  const schedule = s.classes.filter((c) => c.days.includes(new Date().getDay()));
  const safe = s.students.filter((x) => !atRisk(x)).length;
  const active = s.students.filter((x) => x.score >= 85).length;
  const due = s.assignments.filter((a) => a.status === 'Published').length;
  return `<section class="desk-hero" aria-labelledby="overview-title">
    <div class="desk-hero-copy"><span class="desk-eyebrow">${icon('sun')} Your teaching workspace</span>
    <p class="desk-greeting">Welcome back, ${esc(s.profile.name)}.</p>
    <h1 id="overview-title">Teaching overview</h1>
    <p class="desk-intro">A clear desk. A fresh perspective.<br>More space for the work that matters.</p>
    <div class="desk-hero-actions"><a class="btn primary" href="#timetable">${icon('calendar')} View timetable</a><a class="btn desk-secondary" href="#attendance">Take attendance ${icon('arrow')}</a></div>
    </div><div class="desk-hero-scene" aria-hidden="true"><div class="desk-orbit"></div><img src="assets/teacher-desk-3d.png" width="1120" height="840" alt="" fetchpriority="high"><span class="desk-scene-label">A little more headspace.</span></div>
  </section>
  <div class="desk-section-heading"><div><h2>Your week at a glance</h2><p>Classes, progress and the next small step.</p></div><a class="text-link" href="#reports">View reports ${icon('arrow')}</a></div>
  <div class="finance-grid"><div class="finance-main">
    <section class="performance-board" aria-label="Weekly teaching activity"><div class="performance-graph"><div class="performance-title"><div><div class="headline-number">${s.classes.reduce(
      (n, c) => n + c.days.length,
      0
    )}</div><p>Weekly teaching overview</p></div><a class="btn" href="#analytics">This semester ${icon(
    'down'
  )}</a></div>${weeklyChart(s)}</div><div class="metric-stack"><div class="metric-students"><i class="metric-icon" aria-hidden="true">${icon('users')}</i><span>Total students</span><strong>${
    s.students.length
  }</strong><small><b>${s.classes.length} classes</b> this semester</small></div><div class="metric-performance"><i class="metric-icon" aria-hidden="true">${icon('trend')}</i><span>Class performance</span><strong>${avg}%</strong><small><b>${
    s.classes.length
  } subjects</b> this semester</small></div><div class="metric-pending"><i class="metric-icon" aria-hidden="true">${icon('clipboard')}</i><span>Pending tasks</span><strong>${pending
    .toString()
    .padStart(2, '0')}</strong><small class="orange-text"><b>${
    s.submissions.filter((x) => x.marks === null).length
  } submissions</b> need your feedback</small></div></div></section>
    <div class="overview-banners"><section class="panel attendance-goal"><div class="panel-header"><div><h2>Class attendance</h2><p>Overall attendance · current term</p></div><a class="icon-button" href="#attendance" aria-label="Open attendance">${icon(
      'clipboard'
    )}</a></div><div class="hatched-progress"><i style="width:${attendance}%"></i></div><div class="goal-caption"><strong>${attendance}% <span>average attendance</span></strong><span>100%</span></div></section><section class="panel teaching-tip"><div><h2>A little help. A lot more headspace.</h2><p>Build your next lesson with teaching templates.</p><a class="text-link" href="#ai">Explore assistant ${icon(
    'chevron'
  )}</a></div><div class="block-pattern" aria-hidden="true">${Array.from(
    { length: 12 },
    (_, i) => `<i class="block-${i % 4}"></i>`
  ).join('')}</div></section></div>
    <div class="overview-minis"><section class="panel subject-breakdown"><div class="panel-header"><div><h2>My classes</h2><p>Students by subject</p></div><a class="mini-icon" href="#classes" aria-label="View all classes">${icon(
      'arrow'
    )}</a></div><div class="mini-value">${s.students.length}<span> students</span></div><div class="segmented-line">${s.classes
    .map((c, i) => `<i class="segment-${i}" style="flex:${s.students.filter((x) => x.classId === c.id).length}"></i>`)
    .join('')}</div><div class="subject-list">${s.classes
    .map((c, i) => {
      const n = s.students.filter((x) => x.classId === c.id).length;
      return `<button type="button" data-action="class-detail" data-id="${c.id}"><i class="subject-dot segment-${i}"></i><span>${esc(
        c.subject
      )}</span><b>${n}</b></button>`;
    })
    .join('')}</div><p class="section-note">${s.classes.length} subjects. One connected workspace.</p></section>
    <section class="panel health-card"><div class="panel-header"><div><h2>Learning health</h2><p>Students on track</p></div>${badge(
      'This term',
      'gray'
    )}</div><div class="mini-value">${safe}<span> / ${s.students.length} students</span></div><p class="health-sub">${active} students scoring 85% or higher</p><div class="health-gauge"><svg viewBox="0 0 220 125" role="img" aria-label="${Math.round(
    (safe / s.students.length) * 100
  )} percent of students on track"><defs><pattern id="gauge-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="5" height="5" fill="var(--color-primary)"/><rect width="2" height="5" fill="var(--color-primary-light)"/></pattern></defs><path d="M25 110a85 85 0 0 1 170 0" pathLength="100" fill="none" stroke="var(--color-border)" stroke-width="25"/>${Array.from(
    { length: 5 },
    (_, i) => {
      const part = Math.min(18, Math.max(0, (safe / s.students.length) * 100 - i * 20));
      return `<path d="M25 110a85 85 0 0 1 170 0" pathLength="100" fill="none" stroke="${
        i === 0 ? 'var(--color-warning)' : i === 1 ? 'var(--color-success)' : 'url(#gauge-hatch)'
      }" stroke-width="25" stroke-dasharray="${part} 100" stroke-dashoffset="${-i * 20}"/>`;
    }
  ).join('')}</svg><strong>${Math.round(
    (safe / s.students.length) * 100
  )}%</strong><small>Students on track</small></div><p class="section-note">Score ≥60% and attendance ≥75%.<br>${link(
    'View student progress',
    'progress'
  )}</p></section>
    <section class="panel overview-tasks"><div class="panel-header"><div><h2>Goal tracker</h2><p>Teaching tasks</p></div><button class="mini-icon" data-action="new-task" aria-label="Add task">${icon(
      'plus'
    )}</button></div><div class="task-list">${s.tasks
    .map(
      (t) =>
        `<div class="task-row ${t.done ? 'done' : ''}"><input id="task-${t.id}" type="checkbox" data-task="${t.id}" ${
          t.done ? 'checked' : ''
        }><label for="task-${t.id}">${esc(t.text)}<span class="task-progress"><i style="width:${
          t.done ? 100 : 0
        }%" class="${t.done ? 'complete' : 'pending'}"></i></span><span class="task-sub">${
          t.done ? 'Completed' : 'Not started'
        }</span></label><button type="button" data-action="open-task" data-id="${t.id}" aria-label="Open related page">${icon(
          'chevron'
        )}</button></div>`
    )
    .join('')}</div><div class="task-foot">${badge(due + ' active assignments', 'gray')}${link(
    'View all',
    'assignments'
  )}</div></section></div>
  </div><aside class="finance-aside"><section class="panel teacher-panel"><div class="panel-header"><div><h2>My workspace</h2><p>Teach. Connect. Inspire.</p></div><a class="mini-icon" href="#profile" aria-label="Edit teacher profile">${icon(
    'settings'
  )}</a></div><div class="pass-carousel"><div class="teacher-pass"><div class="pass-top"><span>FACULTY MEMBER</span>${icon(
    'cap'
  )}</div><div class="pass-decoration" aria-hidden="true">${icon(
    'cap'
  )}</div><div class="pass-id">MSEC <span>2026 — 27</span></div><div class="pass-bottom"><div><strong>${esc(
    s.profile.name
  )}</strong><small>${esc(s.profile.department)}</small></div><span class="pass-chip">${icon(
    'grid'
  )}</span></div></div><div class="secondary-pass" aria-hidden="true"><span>Academic ID</span><strong>MSEC</strong><small>2026–27</small>${icon(
    'cap'
  )}</div></div><div class="quick-actions">${[
    ['attendance', 'clipboard', 'Attendance'],
    ['new-assignment', 'file', 'Assignment'],
    ['materials', 'upload', 'Resources'],
    ['reports', 'clock', 'Reports']
  ]
    .map(([id, ico, label]) =>
      id === 'new-assignment'
        ? `<button type="button" data-action="new-assignment"><span>${icon(ico)}</span>${label}</button>`
        : `<a href="#${id}"><span>${icon(ico)}</span>${label}</a>`
    )
    .join(
      ''
    )}</div><div class="student-shortcut"><span>My students</span>${link(
    'View all',
    'students'
  )}</div><div class="student-faces">${s.students
    .slice(0, 5)
    .map(
      (x, i) =>
        `<button type="button" data-action="student-detail" data-id="${x.id}" aria-label="View ${esc(
          x.name
        )}"><span class="portrait"><img src="assets/portrait-${
          [12, 47, 13, 49, 14][i]
        }.jpg" alt="" loading="eager"></span><small>${esc(x.name.split(' ')[0])}</small></button>`
    )
    .join('')}</div></section>
  <section class="panel schedule-panel"><div class="panel-header"><div><h2>Today's schedule</h2><p>${new Date().toLocaleDateString(
    'en-GB',
    { weekday: 'long', day: 'numeric', month: 'short' }
  )}</p></div><a class="mini-icon" href="#timetable" aria-label="View timetable">${icon(
    'calendar'
  )}</a></div><div class="schedule-labels"><span>Class / subject</span><span>Time</span></div>${
    schedule.length
      ? schedule
          .map(
            (c, i) =>
              `<div class="schedule-row"><span class="schedule-logo segment-${i}">${icon(
                'book'
              )}</span><div><button type="button" data-action="class-detail" data-id="${c.id}">${esc(
                c.subject
              )}</button><small>${esc(c.code)} · ${esc(
                c.room
              )}</small><button type="button" class="schedule-attendance" data-action="class-attendance" data-id="${
                c.id
              }">Mark attendance ${icon('arrow')}</button></div><span class="schedule-hour">${
                c.time
              }<small>60 min</small></span></div>`
          )
          .join('')
      : empty('No lectures today', 'A little more time for preparation.')
  }<div class="schedule-labels upcoming-label"><span>Coming up</span>${badge(
    s.assessments.length + ' assessments',
    'gray'
  )}</div>${s.assignments
    .filter((a) => a.status === 'Published')
    .slice(0, 2)
    .map(
      (a) =>
        `<div class="schedule-row"><span class="schedule-logo neutral">${icon(
          'file'
        )}</span><div><button type="button" data-action="assignment-detail" data-id="${a.id}">${esc(
          a.title
        )}</button><small>${esc(className(s, a.classId))}</small></div><span class="schedule-hour">${fmt(
          a.due
        )}<small>Due date</small></span></div>`
    )
    .join('')}<div class="schedule-footer">${link('View full timetable', 'timetable')}</div></section></aside></div>`;
}

export function classes(s: AppState, f: Filters): string {
  const rows = s.classes.filter(
    (c) =>
      (f.classId === 'all' || c.id === f.classId) &&
      `${c.subject} ${c.section}`.toLowerCase().includes(f.search.toLowerCase())
  );
  return (
    heading('My classes', 'A place for every subject. A little more clarity for every day.', button(`${icon('calendar')}Weekly timetable`, 'timetable')) +
    filters(s, f) +
    `<div class="card-grid">${
      rows.length ? rows.map((c) => classTile(s, c)).join('') : empty('No matching classes', 'Try another search.')
    }</div>`
  );
}

export function students(s: AppState, f: Filters, progress = false): string {
  const rows = s.students.filter(
    (x) =>
      (f.classId === 'all' || x.classId === f.classId) &&
      `${x.name} ${x.roll}`.toLowerCase().includes(f.search.toLowerCase()) &&
      (!progress || f.status !== 'risk' || atRisk(x))
  );
  return (
    heading(
      progress ? 'Student progress' : 'Students',
      progress ? 'Notice the small changes. Support the students who need you.' : 'Know your students beyond the roll number.',
      button(`${icon('download')}Export records`, 'export', `data-type="students"`)
    ) +
    (progress
      ? `<div class="stats">${stat('Students needing support', s.students.filter(atRisk).length, 'users', 'orange', 'Score <60% or attendance <75%', 'Review')}${stat('Class average', mean(s.students.map((x) => x.score)) + '%', 'chart', 'teal', 'Current academic records', 'Overall')}${stat('Improving students', s.students.filter((x) => x.trend > 0).length, 'trend', 'purple', 'Positive score change', 'Growing')}${stat('Average attendance', mean(s.students.map((x) => x.attendance)) + '%', 'clipboard', 'blue', 'Current academic records', 'Overall')}</div>`
      : '') +
    filters(s, f) +
    (progress
      ? `<div class="tabs"><button data-action="progress-tab" data-id="all" class="tab ${
          f.status !== 'risk' ? 'active' : ''
        }">All students</button><button data-action="progress-tab" data-id="risk" class="tab ${
          f.status === 'risk' ? 'active' : ''
        }">Needs support</button></div>`
      : '') +
    `<section class="panel">${table(
      ['Student', 'Class & section', 'Academic score', 'Attendance', 'Progress', ''],
      rows.map(
        (x) =>
          `<tr><td>${person(x)}</td><td>${esc(cls(s, x.classId)?.code)} · ${esc(
            cls(s, x.classId)?.section.split(' · ').at(-1)
          )}</td><td>${score(x.score)}</td><td>${badge(
            x.attendance + '%',
            x.attendance < 75 ? 'orange' : ''
          )}</td><td><span class="${x.trend > 0 ? 'trend-up' : 'trend-down'}">${x.trend > 0 ? '+' : ''}${
            x.trend
          }%</span> ${atRisk(x) ? badge('Needs support', 'orange') : ''}</td><td><button class="text-link" data-action="student-detail" data-id="${
            x.id
          }">View profile ${icon('arrow')}</button></td></tr>`
      )
    )}</section>`
  );
}

export function attendance(s: AppState, f: Filters, draft: Record<string, string> | null): string {
  const classId = f.classId === 'all' ? 'c1' : f.classId;
  const date = f.date || today();
  const rows = s.students.filter((x) => x.classId === classId);
  const saved = s.attendance.find((a) => a.classId === classId && a.date === date);
  const records = draft || saved?.records || {};
  const present = Object.values(records).filter((x) => x === 'Present').length;
  return (
    heading(
      'Attendance',
      'Small daily check-ins. A clearer picture of every student.',
      button(`${icon('download')}Export attendance`, 'export', 'data-type="attendance"') +
        button(`${icon('check')}Save attendance`, 'save-attendance', '', 'primary')
    ) +
    `<div class="toolbar"><div class="filters"><select id="attendance-class" aria-label="Choose class">${selectClasses(
      s,
      classId,
      false
    )}</select><input type="date" id="attendance-date" value="${date}" aria-label="Attendance date"></div><div class="filters">${badge(
      `${present} present`
    )}${badge(`${Object.values(records).filter((x) => x === 'Absent').length} absent`, 'orange')}${button(
      'Mark all present',
      'all-present'
    )}</div></div><div class="info">${icon('clipboard')}<span>${
      saved ? 'Saved session loaded. Changes update this same class and date.' : 'New session. Mark every student before saving.'
    } Late and excused statuses remain separate in exports.</span></div><section class="panel">${table(
      ['Student', 'Roll number', 'Attendance status'],
      rows.map(
        (x) =>
          `<tr><td>${person(x)}</td><td>${esc(x.roll)}</td><td><div class="attendance-status">${[
            'Present',
            'Absent',
            'Late',
            'Excused'
          ]
            .map(
              (status) =>
                `<button data-action="attendance-status" data-id="${x.id}" data-status="${status}" aria-pressed="${
                  records[x.id] === status
                }" class="${records[x.id] === status ? 'selected' : ''}">${status}</button>`
            )
            .join('')}</div></td></tr>`
      )
    )}</section><p class="section-note">Roster: ${rows.length} students · ${esc(
      cls(s, classId)?.section
    )} · ${saved ? 'Previously saved' : 'Not yet saved'}</p>`
  );
}

export function assignments(s: AppState, f: Filters): string {
  const rows = s.assignments.filter(
    (a) => (f.classId === 'all' || a.classId === f.classId) && a.title.toLowerCase().includes(f.search.toLowerCase())
  );
  return (
    heading(
      'Assignments',
      'Meaningful practice, thoughtful feedback, real progress.',
      button(`${icon('plus')}Create assignment`, 'new-assignment', '', 'primary')
    ) +
    filters(s, f) +
    `<div class="card-grid">${
      rows.length
        ? rows
            .map((a) => {
              const subs = s.submissions.filter((x) => x.assignmentId === a.id),
                total = s.students.filter((x) => x.classId === a.classId).length;
              return `<article class="item-card"><div class="item-top"><span class="subject-icon ${
                cls(s, a.classId)?.color
              }" style="margin:0">${icon('clipboard')}</span>${badge(a.status, a.status === 'Draft' ? 'gray' : '')}</div><div><p style="font-size:10px;margin-bottom:6px">${esc(
                className(s, a.classId)
              )}</p><h3>${esc(a.title)}</h3></div><p>${esc(a.description).slice(0, 130)}</p><div class="score"><span class="bar" style="flex:1"><i style="width:${
                (subs.length / total) * 100
              }%"></i></span><span>${subs.length}/${total} submitted</span></div><div class="item-bottom"><small>${icon(
                'calendar'
              )} Due ${fmt(a.due)}</small><button class="text-link" data-action="assignment-detail" data-id="${
                a.id
              }">View assignment ${icon('arrow')}</button></div></article>`;
            })
            .join('')
        : empty('No assignments found', 'Create an assignment or change your filters.')
    }</div>`
  );
}

export function assessments(s: AppState, f: Filters): string {
  const rows = s.assessments.filter(
    (a) => (f.classId === 'all' || a.classId === f.classId) && a.title.toLowerCase().includes(f.search.toLowerCase())
  );
  return (
    heading(
      'Assessment & evaluation',
      'Make room for discovery. Measure what your students understand.',
      button(`${icon('plus')}Create assessment`, 'new-assessment', '', 'primary')
    ) +
    filters(s, f) +
    `<div class="two-col"><section class="panel"><div class="panel-header"><h2>Upcoming assessments</h2>${badge(
      rows.length + ' scheduled'
    )}</div>${table(
      ['Assessment', 'Class', 'Date', 'Marks', ''],
      rows.map(
        (a) =>
          `<tr><td><strong>${esc(a.title)}</strong><br><span style="display:block;margin-top:6px">${badge(
            a.type,
            'purple'
          )}</span></td><td>${esc(cls(s, a.classId)?.code)}</td><td>${fmt(a.date)}</td><td>${
            a.maxMarks
          }</td><td><button class="text-link" data-action="assessment-detail" data-id="${a.id}">Open ${icon(
            'arrow'
          )}</button></td></tr>`
      )
    )}</section><section class="panel"><div class="panel-header"><h2>Ready for your feedback</h2></div>${
      s.submissions
        .filter((x) => x.marks === null)
        .map(
          (x) =>
            `<div class="task-row"><span class="subject-icon" style="width:28px;height:28px;margin:0">${icon(
              'file'
            )}</span><label>${esc(s.students.find((st) => st.id === x.studentId)?.name)}<span class="task-sub">${esc(
              s.assignments.find((a) => a.id === x.assignmentId)?.title
            )}</span></label><button class="text-link" data-action="grade" data-id="${x.id}">Grade ${icon(
              'arrow'
            )}</button></div>`
        )
        .join('') || empty('All caught up', 'No submissions waiting for evaluation.')
    }</section></div>`
  );
}

export function analytics(s: AppState, f: Filters): string {
  const rows = s.students.filter((x) => f.classId === 'all' || x.classId === f.classId);
  return (
    heading(
      'Performance analytics',
      'Turn classroom data into the next right step.',
      button(`${icon('download')}Download report`, 'export', 'data-type="performance"')
    ) +
    filters(s, f, false) +
    `<div class="stats">${stat('Academic average', mean(rows.map((x) => x.score)) + '%', 'chart', 'teal', 'Selected student records', 'Overall')}${stat(
      'Attendance average',
      mean(rows.map((x) => x.attendance)) + '%',
      'clipboard',
      'blue',
      'Selected student records',
      'Overall'
    )}${stat('High achievers', rows.filter((x) => x.score >= 85).length, 'cap', 'purple', 'Academic score ≥85%', 'Excelling')}${stat(
      'Needs support',
      rows.filter(atRisk).length,
      'users',
      'orange',
      'Score <60% or attendance <75%',
      'Review'
    )}</div><div class="two-col"><section class="panel"><div class="panel-header"><div><h2>Subject-wise performance</h2><p>Compare class averages across all assigned subjects.</p></div></div>${chart(
      s
    )}<div style="margin-top:24px">${s.classes
      .map((c) => {
        const n = mean(s.students.filter((x) => x.classId === c.id).map((x) => x.score));
        return `<div class="progress-line"><span>${esc(c.subject)}</span><span class="bar"><i style="width:${n}%"></i></span><b>${n}%</b></div>`;
      })
      .join(
        ''
      )}</div></section><section class="panel"><div class="panel-header"><h2>Students to check in with</h2>${link(
      'View all',
      'progress'
    )}</div><div class="risk-list">${
      rows
        .filter(atRisk)
        .map(
          (x) =>
            `<button class="person" data-action="student-detail" data-id="${x.id}">${avatar(
              x.name,
              'orange'
            )}<span><strong>${esc(x.name)}</strong><small>${x.score}% score · ${x.attendance}% attendance</small></span>${badge(
              'Review',
              'orange'
            )}</button>`
        )
        .join('') || empty('On track', 'No students currently meet support thresholds.')
    }</div><p class="section-note">Demo risk thresholds: score below 60% or attendance below 75%. Academic summaries use sample records.</p></section></div>`
  );
}

export function ai(_s: AppState, f: Filters, output: string, type: string): string {
  return (
    heading('AI teaching assistant', 'A head start for your next great lesson.', badge('Offline templates', 'purple')) +
    `<div class="info orange">${icon(
      'spark'
    )}<span>Template mode · Generates editable teaching outlines locally. Live AI requires a connected server and model. Review content before sharing.</span></div><div class="ai-workspace"><section class="panel"><div class="panel-header"><h2>What are we creating?</h2></div><div class="ai-options">${[
      ['quiz', 'clipboard', 'Quiz'],
      ['questions', 'help', 'Questions'],
      ['lesson', 'book', 'Lesson plan'],
      ['notes', 'file', 'Study notes']
    ]
      .map(
        ([id, ico, name]) =>
          `<button class="ai-option ${type === id ? 'active' : ''}" data-action="ai-type" data-id="${id}">${icon(
            ico
          )}${name}</button>`
      )
      .join(
        ''
      )}</div><form id="ai-form"><div class="form-grid"><div class="form-group full"><label for="topic">Topic</label><input required id="topic" name="topic" placeholder="e.g. Binary search trees" value="${esc(
      f.topic || 'Binary search trees'
    )}" maxlength="150"></div><div class="form-group full"><label for="level">Learning level</label><select id="level" name="level"><option>Undergraduate · Introductory</option><option>Undergraduate · Intermediate</option><option>Undergraduate · Advanced</option></select></div><div class="form-group full"><label for="objectives">Learning objectives (optional)</label><textarea id="objectives" name="objectives" placeholder="What should students understand by the end?" maxlength="1000"></textarea></div><div class="form-group full"><label for="duration">Lesson duration</label><select id="duration" name="duration"><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></select></div></div><button type="submit" class="btn primary" style="width:100%;margin-top:20px">${icon(
      'spark'
    )}Generate template</button></form></section><section class="panel ai-output"><div class="panel-header"><h2>Your teaching draft</h2>${
      output ? button(`${icon('download')}Download`, 'download-ai') : badge('Ready when you are', 'gray')
    }</div>${
      output
        ? `<pre>${esc(output)}</pre>`
        : `<div class="output-placeholder">${icon(
            'spark'
          )}<h3>A little inspiration starts here.</h3><p style="font-size:11px">Choose a format and topic to create your first draft.</p></div>`
    }</section></div>`
  );
}

export function materials(s: AppState, f: Filters): string {
  const rows = s.materials.filter(
    (a) => (f.classId === 'all' || a.classId === f.classId) && a.title.toLowerCase().includes(f.search.toLowerCase())
  );
  return (
    heading('Study materials', 'Give every lesson a place to live.', button(`${icon('upload')}Add material`, 'new-material', '', 'primary')) +
    filters(s, f) +
    `<div class="card-grid">${
      rows.length
        ? rows
            .map(
              (m) =>
                `<article class="item-card"><div class="item-top"><span class="subject-icon ${
                  cls(s, m.classId)?.color
                }" style="margin:0">${icon(m.files.length ? 'file' : 'book')}</span>${badge(
                  m.type,
                  'gray'
                )}</div><h3>${esc(m.title)}</h3><p>${esc(className(s, m.classId))}<br>${
                  m.files.length ? m.files.length + ' attached file(s)' : 'Text resource'
                } · Added ${fmt(m.date)}</p><div class="item-bottom"><small>Available in this browser</small><button class="text-link" data-action="material-detail" data-id="${
                  m.id
                }">Open resource ${icon('arrow')}</button></div></article>`
            )
            .join('')
        : empty('Your resource library starts here', 'Add notes, PDFs, slides or learning resources.')
    }</div>`
  );
}

export function timetable(s: AppState, f: Filters): string {
  const monday = new Date((f.week || today()) + 'T12:00:00');
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    heading(
      'Weekly timetable',
      'Your teaching week, with a little more breathing room.',
      button('Previous week', 'week-prev') + button('This week', 'week-today') + button('Next week', 'week-next')
    ) +
    `<div class="toolbar"><span class="subtitle" style="margin:0">${dates[0].toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long'
    })} – ${dates[4].toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}</span>${badge('Weekly recurring schedule')}</div><section class="panel"><div class="table-wrap"><div class="timetable"><div></div>${dates
      .map(
        (d) =>
          `<div class="time-head"><strong>${d.toLocaleDateString('en-GB', {
            weekday: 'long'
          })}</strong>${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>`
      )
      .join('')}${['09:00', '11:00', '14:00', '15:00']
      .map(
        (time) =>
          `<div class="time-label">${time}</div>${dates
            .map((d) => {
              const c = s.classes.find((c) => c.time === time && c.days.includes(d.getDay()));
              return c
                ? `<button class="time-cell filled ${c.color}" data-action="class-detail" data-id="${c.id}"><h4>${esc(
                    c.subject
                  )}</h4><p>${esc(c.code)} · ${esc(c.section.split(' · ').at(-1))}<br>${esc(c.room)}<br>${time} – ${String(
                    Number(time.slice(0, 2)) + 1
                  ).padStart(2, '0')}:00</p></button>`
                : '<div class="time-cell"></div>';
            })
            .join('')}`
      )
      .join(
        ''
      )}</div></div></section><section class="panel" style="margin-top:22px"><div class="panel-header"><h2>Examinations & assessments</h2>${link(
      'Manage assessments',
      'assessments'
    )}</div>${table(
      ['Assessment', 'Class', 'Date', 'Type'],
      s.assessments.map((a) => `<tr><td>${esc(a.title)}</td><td>${esc(className(s, a.classId))}</td><td>${fmt(a.date)}</td><td>${badge(a.type, 'purple')}</td></tr>`)
    )}</section>`
  );
}

export function announcements(s: AppState, f: Filters): string {
  const rows = s.announcements.filter(
    (a) =>
      (f.classId === 'all' || a.classId === f.classId || a.classId === 'all') &&
      `${a.title} ${a.body}`.toLowerCase().includes(f.search.toLowerCase())
  );
  return (
    heading('Announcements', 'Keep your classroom on the same page.', button(`${icon('plus')}New announcement`, 'new-announcement', '', 'primary')) +
    `<div class="info">${icon(
      'bell'
    )}<span>Demo noticeboard · Announcements save in this browser. No external notifications are sent.</span></div>` +
    filters(s, f) +
    `<div class="card-grid">${
      rows.length
        ? rows
            .map(
              (a) =>
                `<article class="item-card"><div class="item-top">${badge(className(s, a.classId))}<small style="color:var(--color-ink-muted)">${fmt(
                  a.date
                )}</small></div><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p><div class="item-bottom"><small>${esc(
                  s.profile.name
                )}</small><button class="text-link" data-action="announcement-detail" data-id="${a.id}">Read ${icon(
                  'arrow'
                )}</button></div></article>`
            )
            .join('')
        : empty('No announcements found', 'Create a class update to get started.')
    }</div>`
  );
}

export function doubts(s: AppState, f: Filters): string {
  const rows = s.doubts.filter(
    (d) =>
      (f.classId === 'all' || d.classId === f.classId) &&
      `${d.title} ${d.body}`.toLowerCase().includes(f.search.toLowerCase()) &&
      (f.status === 'all' || !f.status || d.status === f.status)
  );
  return (
    heading(
      'Student doubts',
      'Every good question deserves a thoughtful answer.',
      badge(s.doubts.filter((x) => x.status === 'Open').length + ' unanswered', 'orange')
    ) +
    filters(s, f) +
    `<div class="tabs">${['all', 'Open', 'Resolved']
      .map(
        (x) =>
          `<button class="tab ${
            (!f.status && x === 'all') || f.status === x ? 'active' : ''
          }" data-action="doubt-tab" data-id="${x}">${x === 'all' ? 'All questions' : x}</button>`
      )
      .join('')}</div><div class="card-grid">${
      rows.length
        ? rows
            .map(
              (d) =>
                `<article class="item-card"><div class="item-top">${badge(
                  d.status,
                  d.status === 'Open' ? 'orange' : ''
                )}<small style="color:var(--color-ink-muted)">${esc(cls(s, d.classId)?.code)}</small></div><h3>${esc(d.title)}</h3><p>${esc(
                  d.body
                )}</p><div class="item-bottom"><small>${esc(
                  s.students.find((x) => x.id === d.studentId)?.name
                )}</small><button class="text-link" data-action="doubt-detail" data-id="${d.id}">${
                  d.status === 'Open' ? 'Answer question' : 'View response'
                } ${icon('arrow')}</button></div></article>`
            )
            .join('')
        : empty('No questions here', 'Try a different class or status.')
    }</div>`
  );
}

export function parents(s: AppState, f: Filters): string {
  return (
    heading(
      'Parent communication',
      'Build a stronger support circle around every student.',
      button(`${icon('mail')}Draft message`, 'new-message', '', 'primary')
    ) +
    `<div class="info">${icon(
      'mail'
    )}<span>Messages are local drafts. Download a draft to share through your school’s approved communication channel.</span></div>` +
    filters(s, f) +
    `<section class="panel"><div class="panel-header"><h2>Student & parent directory</h2></div>${table(
      ['Student', 'Class', 'Attendance', 'Academic score', ''],
      s.students
        .filter((x) => (f.classId === 'all' || x.classId === f.classId) && x.name.toLowerCase().includes(f.search.toLowerCase()))
        .map(
          (x) =>
            `<tr><td>${person(x)}</td><td>${esc(cls(s, x.classId)?.code)}</td><td>${badge(
              x.attendance + '%',
              x.attendance < 75 ? 'orange' : ''
            )}</td><td>${x.score}%</td><td><button class="text-link" data-action="message-parent" data-id="${
              x.id
            }">Draft update ${icon('arrow')}</button></td></tr>`
        )
    )}</section><section class="panel" style="margin-top:22px"><div class="panel-header"><h2>Saved message drafts <span class="count">${
      s.messages.length
    }</span></h2></div>${
      s.messages.length
        ? table(
            ['Recipient', 'Subject', 'Saved', ''],
            s.messages.map(
              (m) =>
                `<tr><td>${esc(s.students.find((x) => x.id === m.studentId)?.parent)}</td><td>${esc(m.subject)}</td><td>${fmt(
                  m.date
                )}</td><td><button class="text-link" data-action="message-detail" data-id="${m.id}">Read draft ${icon(
                  'arrow'
                )}</button></td></tr>`
            )
          )
        : empty('No message drafts yet', 'Start with a progress update for a student.')
    }</section>`
  );
}

export function leave(s: AppState): string {
  return (
    heading('Leave & substitutions', 'Plan your time away. Keep learning moving.', button(`${icon('plus')}Apply for leave`, 'new-leave', '', 'primary')) +
    `<div class="info">${icon(
      'calendar'
    )}<span>Demo requests save locally with Pending status. Approval and colleague notifications require school backend integration.</span></div><section class="panel"><div class="panel-header"><h2>Leave requests</h2>${badge(
      s.leaves.length + ' requests',
      'gray'
    )}</div>${table(
      ['Leave type', 'Dates', 'Reason', 'Substitution requested', 'Status'],
      s.leaves.map(
        (l) =>
          `<tr><td>${esc(l.type)}</td><td>${fmt(l.start)} – ${fmt(l.end)}</td><td style="white-space:normal;max-width:250px">${esc(
            l.reason
          )}</td><td>${esc(l.substitute || 'Not specified')}</td><td>${badge(l.status, 'orange')}</td></tr>`
      )
    )}</section>`
  );
}

export function reports(): string {
  const rows = [
    ['attendance', 'clipboard', 'Attendance report', 'Session-level attendance with class, date and each student’s recorded status.'],
    ['performance', 'chart', 'Performance report', 'Academic scores, attendance and progress indicators for every student.'],
    ['assignments', 'file', 'Assignment report', 'Deadlines, submission counts and evaluation progress for your assignments.'],
    ['examinations', 'book', 'Examination report', 'Scheduled tests and quizzes, maximum marks and question papers.'],
    ['students', 'users', 'Student directory', 'Student profiles, class memberships and academic contact details.']
  ];
  return (
    heading('Reports', 'The right information, ready when you need it.') +
    `<div class="card-grid">${rows
      .map(
        ([type, ico, title, body], i) =>
          `<article class="item-card report-card"><span class="subject-icon ${['', 'purple', 'orange', 'blue', ''][i]}">${icon(
            ico
          )}</span><h3>${title}</h3><p>${body}</p><div class="item-bottom"><small>CSV · Browser data</small>${button(
            `${icon('download')}Download`,
            'export',
            `data-type="${type}"`
          )}</div></article>`
      )
      .join('')}</div><p class="section-note">Reports reflect records saved in this browser. Attendance exports contain saved sessions only.</p>`
  );
}

export function profile(s: AppState): string {
  const p = s.profile;
  return (
    heading('Profile & settings', 'Make this space a little more yours.') +
    `<div class="two-col"><section class="panel"><div class="profile-head"><span class="avatar big-avatar">${esc(
      initials(p.name)
    )}</span><div><h2>${esc(p.name)}</h2><p>${esc(p.department)}</p></div></div><form id="profile-form"><div class="form-grid"><div class="form-group"><label for="profile-name">Full name</label><input id="profile-name" name="name" required value="${esc(
      p.name
    )}" maxlength="100"></div><div class="form-group"><label for="profile-email">Email address</label><input id="profile-email" name="email" type="email" required value="${esc(
      p.email
    )}"></div><div class="form-group"><label for="profile-department">Department</label><input id="profile-department" name="department" required value="${esc(
      p.department
    )}" maxlength="150"></div><div class="form-group"><label for="profile-phone">Phone number</label><input id="profile-phone" name="phone" type="tel" value="${esc(
      p.phone
    )}" maxlength="30"></div><div class="form-group full"><label for="profile-bio">About you</label><textarea id="profile-bio" name="bio" maxlength="500">${esc(
      p.bio
    )}</textarea></div><div class="form-group full"><label class="switch"><input name="emailUpdates" type="checkbox" ${
      p.emailUpdates ? 'checked' : ''
    }>Prefer email updates when connected to school services</label></div></div><div class="form-actions"><button type="submit" class="btn primary">${icon(
      'check'
    )}Save changes</button></div></form></section><div class="side-column"><section class="panel"><div class="panel-header"><h2>Assigned subjects</h2></div>${s.classes
      .map(
        (c) =>
          `<div class="task-row"><span class="dot" style="margin-top:5px"></span><span>${esc(c.subject)}<small class="task-sub">${esc(
            c.code
          )} · ${esc(c.section)}</small></span></div>`
      )
      .join(
        ''
      )}<p class="section-note">Class assignments are managed by your institution.</p></section><section class="panel"><div class="panel-header"><h2>Your workspace data</h2></div><p class="subtitle">This standalone demo stores records in this browser. Export a backup before changing devices.</p><div class="form-actions" style="justify-content:flex-start">${button(
      `${icon('download')}Export backup`,
      'backup'
    )}</div></section></div></div>`
  );
}
