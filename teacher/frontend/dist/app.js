import { icon } from './icons.js';
import { seedData, saveAttendance, gradeSubmission, toCSV, atRisk, today, uid } from './model.js';
import { storeFiles, getFile } from './files.js';
import * as v from './views.js';
import { layoutWorkspace } from './workspace.js';
const { esc, button, badge, person, table, selectClasses, fmt, className, cls, empty } = v;
const KEY = 'msec-teacher-desk-v1';
let storageIssue = '';
let state;
try {
    const saved = localStorage.getItem(KEY);
    state = saved ? JSON.parse(saved) : seedData();
    if (state.version !== 1 || !Array.isArray(state.students))
        throw new Error();
}
catch {
    state = seedData();
    storageIssue = 'Saved data could not load. Working with fresh demo data; export a backup before closing.';
}
const nav = [
    [
        'WORKSPACE',
        [
            ['overview', 'grid', 'Overview'],
            ['classes', 'book', 'My classes'],
            ['students', 'users', 'Students'],
            ['attendance', 'clipboard', 'Attendance'],
            ['assignments', 'file', 'Assignments'],
            ['assessments', 'cap', 'Assessments'],
            ['analytics', 'chart', 'Performance analytics']
        ]
    ],
    [
        'TEACHING TOOLS',
        [
            ['ai', 'spark', 'AI assistant'],
            ['materials', 'folder', 'Study materials'],
            ['timetable', 'calendar', 'Timetable'],
            ['announcements', 'bell', 'Announcements'],
            ['progress', 'trend', 'Student progress'],
            ['doubts', 'message', 'Student doubts']
        ]
    ],
    [
        'ADMINISTRATION',
        [
            ['parents', 'mail', 'Parent communication'],
            ['leave', 'clock', 'Leave & substitutions'],
            ['reports', 'download', 'Reports'],
            ['profile', 'settings', 'Profile & settings']
        ]
    ]
];
const routes = Object.fromEntries(nav.flatMap(([, items]) => items.map(([id, , label]) => [id, label])));
let route = location.hash.slice(1) || 'overview';
if (!routes[route])
    route = 'overview';
const filters = {
    classId: 'all',
    search: '',
    date: today(),
    status: 'all',
    week: today(),
    topic: ''
};
let attendanceDraft = null;
let aiType = 'quiz';
let aiOutput = '';
let toastTimer;
function toast(text) {
    const el = document.querySelector('#toast');
    if (!el)
        return;
    el.textContent = text;
    el.classList.add('show');
    if (toastTimer)
        clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}
function persist() {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
        storageIssue = '';
        const warning = document.querySelector('#storage-warning');
        if (warning)
            warning.hidden = true;
    }
    catch {
        storageIssue = 'Browser storage is unavailable or full. Current changes are unsaved; export a backup.';
        const warning = document.querySelector('#storage-warning');
        if (warning) {
            warning.textContent = storageIssue;
            warning.hidden = false;
        }
        throw new Error(storageIssue);
    }
}
function mutate(fn, message) {
    const before = structuredClone(state);
    try {
        fn();
        persist();
        render();
        if (message)
            toast(message);
        return true;
    }
    catch (e) {
        state = before;
        toast(e instanceof Error ? e.message : String(e));
        return false;
    }
}
function navigationLink(id, label) {
    const item = nav.flatMap(([, items]) => items).find((x) => x[0] === id);
    if (!item)
        return '';
    return `<a href="#${id}" class="nav-link ${route === id ? 'active' : ''}" data-route="${id}" aria-label="${esc(label || item[2])}">${icon(item[1])}<span>${label || item[2]}</span>${id === 'doubts'
        ? `<span class="nav-count" id="doubt-count">${state.doubts.filter((x) => x.status === 'Open').length}</span>`
        : ''}</a>`;
}
function buildNavigation() {
    return `${navigationLink('overview')}${navigationLink('classes')}${navigationLink('students')}<details class="nav-group" open><summary aria-label="Coursework">${icon('clipboard')}<span>Coursework</span>${icon('down')}</summary><div class="subnav">${navigationLink('attendance')}${navigationLink('assignments')}${navigationLink('assessments')}</div></details>${navigationLink('analytics', 'Analytics')}${navigationLink('timetable')}<div class="nav-divider"></div>${navigationLink('ai')}<details class="nav-group"><summary aria-label="Teaching tools">${icon('folder')}<span>Teaching tools</span>${icon('down')}</summary><div class="subnav">${navigationLink('materials')}${navigationLink('progress')}${navigationLink('doubts')}</div></details><details class="nav-group"><summary aria-label="Administration">${icon('settings')}<span>Administration</span>${icon('down')}</summary><div class="subnav">${navigationLink('announcements')}${navigationLink('parents')}${navigationLink('leave')}${navigationLink('reports')}${navigationLink('profile')}</div></details>`;
}
function shell() {
    const app = document.querySelector('#app');
    if (!app)
        return;
    app.innerHTML = `<div class="menu-overlay" data-action="close-menu"></div><aside class="sidebar"><a class="brand" href="#overview"><span class="brand-mark"><img src="favicon.svg" alt="" width="30" height="30"></span><span><strong>Teacher Desk<span style="color:#70a68b">.</span></strong><small>MORE SPACE TO TEACH</small></span></a><div class="workspace"><span>${icon('cap')}</span><span><strong>MSEC Bengaluru</strong><small>Academic year 2026–27</small></span></div><nav aria-label="Main navigation">${buildNavigation()}</nav><section class="sidebar-promo">${icon('spark')}<h2>A little teaching magic.</h2><p>Lesson plans, quizzes and more.<br>Demo workspace · Local data</p><a href="#ai" class="btn primary">Explore assistant</a></section><button type="button" class="collapse-sidebar" data-action="toggle-sidebar" aria-label="Collapse sidebar" aria-expanded="true">${icon('chevron')}<span>Collapse sidebar</span></button><div class="sidebar-foot">${v.avatar(state.profile.name, 'orange')}<span><strong id="side-name">${esc(state.profile.name)}</strong><small>Teacher · CSE Department</small></span><a href="#profile" class="icon-button" aria-label="Account settings">${icon('settings')}</a></div></aside><div class="main-shell"><header class="topbar"><button class="icon-button mobile-menu" data-action="open-menu" aria-label="Open navigation">${icon('menu')}</button><div class="breadcrumbs">${icon('grid')}<span>Workspace</span>${icon('chevron')}<b id="breadcrumb">${routes[route]}</b></div><div class="top-actions"><form id="global-search-form" class="global-search">${icon('search')}<input id="global-search" type="search" placeholder="Search anything…" aria-label="Search dashboard"><span class="key">⌘ K</span></form><button class="icon-button" data-action="notifications" aria-label="Notifications">${icon('bell')}<i class="notification-dot" ${state.notificationsRead ? 'hidden' : ''}></i></button><a href="#profile" class="icon-button header-settings" aria-label="Workspace settings">${icon('settings')}</a><span class="top-divider"></span><a class="top-profile" href="#profile">${v.avatar(state.profile.name, 'orange')}<span id="top-name">${esc(state.profile.name)}<small>${esc(state.profile.email)}</small></span>${icon('down')}</a><button type="button" class="btn header-create" data-action="new-assignment">${icon('plus')}Create assignment</button></div></header><div id="storage-warning" class="storage-alert" role="alert" ${storageIssue ? '' : 'hidden'}>${esc(storageIssue)}</div><main class="content" id="main-content"></main></div>`;
    render();
}
function render() {
    const el = document.querySelector('#main-content');
    if (!el)
        return;
    el.dataset.page = route;
    const map = {
        overview: () => v.overview(state),
        classes: () => v.classes(state, filters),
        students: () => v.students(state, filters),
        attendance: () => v.attendance(state, filters, attendanceDraft),
        assignments: () => v.assignments(state, filters),
        assessments: () => v.assessments(state, filters),
        analytics: () => v.analytics(state, filters),
        ai: () => v.ai(state, filters, aiOutput, aiType),
        materials: () => v.materials(state, filters),
        timetable: () => v.timetable(state, filters),
        announcements: () => v.announcements(state, filters),
        progress: () => v.students(state, filters, true),
        doubts: () => v.doubts(state, filters),
        parents: () => v.parents(state, filters),
        leave: () => v.leave(state),
        reports: v.reports,
        profile: () => v.profile(state)
    };
    const renderFn = map[route] || map.overview;
    el.innerHTML =
        renderFn() +
            `<footer class="footer"><span>${icon('cap')}A little more organized. A lot more possibility.</span><span><i class="dot"></i>Demo workspace · Data saved in this browser</span></footer>`;
    layoutWorkspace(el, route, routes[route]);
    document.querySelectorAll('[data-route]').forEach((a) => {
        a.classList.toggle('active', a.dataset.route === route);
        if (a.dataset.route === route && a.closest('details')) {
            const details = a.closest('details');
            if (details)
                details.open = true;
        }
        if (a.dataset.route === route)
            a.setAttribute('aria-current', 'page');
        else
            a.removeAttribute('aria-current');
    });
    const breadcrumb = document.querySelector('#breadcrumb');
    if (breadcrumb)
        breadcrumb.textContent = routes[route];
    const doubtCount = document.querySelector('#doubt-count');
    if (doubtCount)
        doubtCount.textContent = String(state.doubts.filter((x) => x.status === 'Open').length);
    document.title = `${routes[route]} · Teacher Desk`;
}
function go(id) {
    if (route === id) {
        render();
        return;
    }
    location.hash = id;
}
window.addEventListener('hashchange', () => {
    route = location.hash.slice(1) || 'overview';
    if (!routes[route])
        route = 'overview';
    filters.classId = 'all';
    filters.search = '';
    filters.status = 'all';
    attendanceDraft = null;
    closeMenu();
    render();
    window.scrollTo(0, 0);
});
function closeMenu() {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.menu-overlay')?.classList.remove('show');
}
const dialog = document.querySelector('#dialog');
function modal(title, body, onSubmit) {
    if (dialog.open)
        dialog.close();
    dialog.innerHTML = `<div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${body}<p class="dialog-error" id="dialog-error" role="alert"></p></div>`;
    dialog.showModal();
    if (onSubmit) {
        const form = dialog.querySelector('form');
        if (!form)
            return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.reportValidity())
                return;
            const b = form.querySelector('[type=submit]');
            if (b)
                b.disabled = true;
            try {
                await onSubmit(new FormData(form), form);
                dialog.close();
                render();
            }
            catch (error) {
                const errEl = dialog.querySelector('#dialog-error');
                if (errEl)
                    errEl.textContent = error instanceof Error ? error.message : String(error);
            }
            finally {
                if (b)
                    b.disabled = false;
            }
        });
    }
}
const field = (label, name, type = 'text', value = '', extra = '') => `<div class="form-group"><label for="field-${name}">${label}</label><input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
const area = (label, name, value = '', extra = '') => `<div class="form-group full"><label for="field-${name}">${label}</label><textarea id="field-${name}" name="${name}" ${extra}>${esc(value)}</textarea></div>`;
const classField = (all = false, selected = 'c1', locked = false) => `<div class="form-group full"><label for="field-classId">Class</label><select name="classId" id="field-classId" ${locked ? 'disabled' : ''}>${selectClasses(state, selected, all)}</select>${locked
    ? `<input type="hidden" name="classId" value="${selected}"><span class="field-note">Class stays fixed once students have submitted.</span>`
    : ''}</div>`;
const fileField = () => `<div class="form-group full"><label for="field-files">Attach resources (optional)</label><input id="field-files" type="file" name="files" multiple><span class="field-note">PDFs, slides, notes and images · Up to 25 MB each · Files stay in this browser.</span></div>`;
const actions = (label = 'Save') => `<div class="form-actions">${button('Cancel', 'close-dialog')}<button type="submit" class="btn primary">${icon('check')}${label}</button></div>`;
const form = (body, label = 'Save') => `<form><div class="form-grid">${body}</div>${actions(label)}</form>`;
const val = (d, name) => String(d.get(name) || '').trim();
const required = (d, name, label) => {
    const value = val(d, name);
    if (!value)
        throw new Error(label + ' is required.');
    return value;
};
function commit(fn) {
    const before = structuredClone(state);
    try {
        fn();
        persist();
    }
    catch (e) {
        state = before;
        throw e;
    }
}
function fileLinks(files = []) {
    return files
        .map((f) => `<button class="file-link" data-action="download-file" data-id="${f.id}" data-name="${esc(f.name)}">${icon('file')}${esc(f.name)}<small>${Math.max(1, Math.round(f.size / 1024))} KB</small>${icon('download')}</button>`)
        .join('');
}
function download(name, content, type = 'text/plain') {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function activeAttendance() {
    const classId = filters.classId === 'all' ? 'c1' : filters.classId;
    return {
        classId,
        date: filters.date,
        records: attendanceDraft || { ...(state.attendance.find((x) => x.classId === classId && x.date === filters.date)?.records || {}) }
    };
}
function newAssignment(id) {
    const a = id ? state.assignments.find((a) => a.id === id) : null;
    modal(a ? 'Edit assignment' : 'Create assignment', form(field('Assignment title', 'title', 'text', a?.title || '', 'required maxlength="150"') +
        field('Maximum marks', 'maxMarks', 'number', a?.maxMarks || 100, 'required min="1" max="1000"') +
        classField(false, a?.classId || 'c1', Boolean(a && state.submissions.some((x) => x.assignmentId === a.id))) +
        field('Due date', 'due', 'date', a?.due || today(), 'required') +
        `<div class="form-group"><label for="field-status">Status</label><select id="field-status" name="status"><option ${a?.status === 'Draft' ? 'selected' : ''}>Draft</option><option ${!a || a.status === 'Published' ? 'selected' : ''}>Published</option><option ${a?.status === 'Closed' ? 'selected' : ''}>Closed</option></select></div>` +
        area('Instructions', 'description', a?.description || '', 'required maxlength="5000"') +
        fileField(), a ? 'Save changes' : 'Create assignment'), async (d) => {
        const maxMarks = Number(d.get('maxMarks'));
        if (maxMarks <= 0 || maxMarks > 1000)
            throw new Error('Maximum marks must be between 1 and 1000.');
        if (a && state.submissions.some((x) => x.assignmentId === a.id && (x.marks ?? 0) > maxMarks)) {
            throw new Error('Maximum marks cannot be lower than an existing grade.');
        }
        if (a && state.submissions.some((x) => x.assignmentId === a.id) && val(d, 'classId') !== a.classId) {
            throw new Error('Cannot change class after submissions exist.');
        }
        const title = required(d, 'title', 'Title'), description = required(d, 'description', 'Instructions');
        const rawFiles = d.getAll('files');
        const files = await storeFiles(rawFiles.filter((f) => f && f.name));
        commit(() => {
            const entry = {
                title,
                description,
                classId: val(d, 'classId'),
                due: val(d, 'due'),
                maxMarks,
                status: val(d, 'status'),
                files: [...(a?.files || []), ...files]
            };
            if (a)
                Object.assign(state.assignments.find((x) => x.id === a.id), entry);
            else
                state.assignments.unshift({ id: uid(), ...entry });
        });
        toast(a ? 'Assignment updated' : 'Assignment created');
    });
}
function assignmentDetail(id) {
    const a = state.assignments.find((a) => a.id === id);
    if (!a)
        return;
    modal(esc(a.title), `<div class="pill-list">${badge(className(state, a.classId))}${badge(a.status, 'purple')}${badge('Due ' + fmt(a.due), 'gray')}${badge(a.maxMarks + ' marks', 'gray')}</div><p class="resource-body" style="margin-top:20px">${esc(a.description)}</p>${fileLinks(a.files)}<div class="form-actions">${button('Edit assignment', 'edit-assignment', `data-id="${a.id}"`)}</div><h3 style="margin:25px 0 18px">Student submissions</h3>${table(['Student', 'Status', 'Marks', ''], state.submissions
        .filter((x) => x.assignmentId === id)
        .map((sub) => {
        const student = state.students.find((x) => x.id === sub.studentId);
        return `<tr><td>${student ? person(student) : 'Unknown'}</td><td>${badge(sub.status, sub.marks === null ? 'orange' : '')}</td><td>${sub.marks ?? '—'}/${a.maxMarks}</td><td><button class="text-link" data-action="grade" data-id="${sub.id}">${sub.marks === null ? 'Evaluate' : 'Review'}</button></td></tr>`;
    }))}<p class="section-note">${state.students.filter((x) => x.classId === a.classId).length - state.submissions.filter((x) => x.assignmentId === id).length} students have not submitted. Sample submissions are available for evaluation.</p>`);
}
function grade(id) {
    const sub = state.submissions.find((x) => x.id === id);
    if (!sub)
        return;
    const a = state.assignments.find((x) => x.id === sub.assignmentId);
    if (!a)
        return;
    const student = state.students.find((x) => x.id === sub.studentId);
    if (!student)
        return;
    modal('Evaluate submission', `${person(student)}<h3 style="margin-top:23px">${esc(a.title)}</h3><div class="reply" style="margin-bottom:23px">${esc(sub.text)}</div>` +
        form(field(`Marks (out of ${a.maxMarks})`, 'marks', 'number', sub.marks ?? '', `required min="0" max="${a.maxMarks}" step="0.5"`) +
            area('Feedback', 'feedback', sub.feedback || '', 'maxlength="3000"') +
            (sub.marks !== null ? area('Reason for grade change', 'reason', '', 'required maxlength="500"') : ''), 'Save evaluation'), (d) => {
        const feedback = val(d, 'feedback'), reason = sub.marks !== null ? required(d, 'reason', 'Change reason') : 'Initial evaluation';
        commit(() => {
            const current = state.submissions.find((x) => x.id === id);
            const old = current.marks;
            gradeSubmission(state, id, d.get('marks'));
            current.feedback = feedback;
            current.history = [...(current.history || []), { previous: old, marks: current.marks, reason, date: new Date().toISOString() }];
        });
        toast('Evaluation saved');
    });
}
function studentDetail(id) {
    const x = state.students.find((x) => x.id === id);
    if (!x)
        return;
    const sessions = state.attendance.filter((a) => a.classId === x.classId && a.records[id]);
    modal('Student profile', `<div class="profile-head">${v.avatar(x.name, 'orange')}<div><h2>${esc(x.name)}</h2><p>${esc(x.roll)} · ${esc(className(state, x.classId))}</p></div></div><div class="pill-list">${atRisk(x) ? badge('Needs support', 'orange') : badge('On track')}${badge(x.trend > 0 ? 'Improving +' + x.trend + '%' : 'Score change ' + x.trend + '%', 'gray')}</div><div class="metrics"><div><small>Academic score</small><strong>${x.score}%</strong></div><div><small>Term attendance</small><strong>${x.attendance}%</strong></div></div><p class="description">${esc(x.email)}<br>${esc(cls(state, x.classId)?.section)}</p><h3>Academic records</h3><div style="margin-top:15px">${table(['Assignment', 'Status', 'Marks'], state.submissions
        .filter((sub) => sub.studentId === id)
        .map((sub) => `<tr><td>${esc(state.assignments.find((a) => a.id === sub.assignmentId)?.title)}</td><td>${badge(sub.status)}</td><td>${sub.marks ?? 'Pending'}</td></tr>`))}</div><h3 style="margin-top:23px">Recorded attendance sessions</h3><div style="margin-top:15px">${table(['Date', 'Recorded status'], sessions.map((a) => `<tr><td>${fmt(a.date)}</td><td>${badge(a.records[id], a.records[id] === 'Absent' ? 'orange' : '')}</td></tr>`))}</div><p class="section-note">Term percentages above are sample academic records. New attendance sessions appear separately until backend analytics are connected.</p><div class="form-actions">${button(`${icon('mail')}Draft parent update`, 'message-parent', `data-id="${id}"`, 'primary')}</div>`);
}
function classDetail(id) {
    const c = cls(state, id);
    if (!c)
        return;
    const rows = state.students.filter((x) => x.classId === id);
    modal(esc(c.subject), `<div class="pill-list">${badge(c.code)}${badge(c.section, 'gray')}</div><div class="metrics"><div><small>Students</small><strong>${rows.length}</strong></div><div><small>Class average</small><strong>${v.mean(rows.map((x) => x.score))}%</strong></div></div><p class="description">${esc(c.room)} · ${esc(c.time)} · ${c.days
        .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
        .join(', ')}</p><div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap">${button('Edit class details', 'edit-class', `data-id="${id}"`)}${button('View students', 'class-students', `data-id="${id}"`)}${button('Mark attendance', 'class-attendance', `data-id="${id}"`, 'primary')}</div><h3 style="margin:25px 0 15px">Class roster</h3>${table(['Student', 'Score', 'Attendance'], rows.map((x) => `<tr><td>${person(x)}</td><td>${x.score}%</td><td>${x.attendance}%</td></tr>`))}`);
}
function newAssessment() {
    modal('Create assessment', form(field('Assessment title', 'title', 'text', '', 'required maxlength="150"') +
        `<div class="form-group"><label for="field-type">Type</label><select name="type" id="field-type"><option>Test</option><option>Quiz</option></select></div>` +
        classField() +
        field('Date', 'date', 'date', today(), 'required') +
        field('Maximum marks', 'maxMarks', 'number', 30, 'required min="1" max="1000"') +
        area('Questions — one question per line', 'questions', '', 'required maxlength="10000"'), 'Create assessment'), (d) => {
        const title = required(d, 'title', 'Title'), questions = required(d, 'questions', 'Questions');
        commit(() => state.assessments.unshift({
            id: uid(),
            title,
            questions,
            type: val(d, 'type'),
            classId: val(d, 'classId'),
            date: val(d, 'date'),
            maxMarks: Number(d.get('maxMarks'))
        }));
        toast('Assessment created');
    });
}
function assessmentDetail(id) {
    const a = state.assessments.find((x) => x.id === id);
    if (!a)
        return;
    modal(esc(a.title), `<div class="pill-list">${badge(a.type, 'purple')}${badge(className(state, a.classId))}${badge(fmt(a.date), 'gray')}${badge(a.maxMarks + ' marks', 'gray')}</div><h3 style="margin-top:25px">Question paper</h3><div class="resource-body" style="margin-top:15px">${esc(a.questions)}</div><div class="form-actions">${button(`${icon('download')}Download paper`, 'download-assessment', `data-id="${id}"`)}${button('Start practice session', 'conduct', `data-id="${id}"`, 'primary')}</div><p class="section-note">Practice sessions run on this device and save responses locally. No remote exam is started.</p>${a.responses?.length
        ? `<h3 style="margin-top:20px">Saved practice responses</h3>${a.responses
            .map((r, i) => `<div class="reply"><strong>Session ${i + 1} · ${esc(r.name)}</strong><br>${r.answers
            .map((ans, n) => `${n + 1}. ${esc(ans)}`)
            .join('<br>')}</div>`)
            .join('')}`
        : ''}`);
}
function newMaterial() {
    modal('Add study material', form(field('Resource title', 'title', 'text', '', 'required maxlength="150"') +
        `<div class="form-group"><label for="field-type">Resource type</label><select id="field-type" name="type"><option>Notes</option><option>PDF</option><option>Presentation</option><option>Learning resource</option></select></div>` +
        classField() +
        area('Notes or description', 'description', '', 'required maxlength="10000"') +
        fileField(), 'Save material'), async (d) => {
        const title = required(d, 'title', 'Title'), description = required(d, 'description', 'Description');
        const rawFiles = d.getAll('files');
        const files = await storeFiles(rawFiles.filter((f) => f && f.name));
        commit(() => state.materials.unshift({
            id: uid(),
            title,
            description,
            type: val(d, 'type'),
            classId: val(d, 'classId'),
            date: today(),
            files
        }));
        toast('Resource added to your library');
    });
}
function newAnnouncement() {
    modal('New announcement', form(field('Title', 'title', 'text', '', 'required maxlength="150"') +
        classField(true, 'all') +
        area('Announcement', 'body', '', 'required maxlength="5000"'), 'Post to local noticeboard'), (d) => {
        const title = required(d, 'title', 'Title'), body = required(d, 'body', 'Announcement');
        commit(() => state.announcements.unshift({
            id: uid(),
            title,
            body,
            classId: val(d, 'classId'),
            date: today()
        }));
        toast('Announcement saved to local noticeboard');
    });
}
function doubtDetail(id) {
    const d = state.doubts.find((x) => x.id === id);
    if (!d)
        return;
    const student = state.students.find((x) => x.id === d.studentId);
    if (!student)
        return;
    modal(esc(d.title), `${person(student)}<p class="resource-body" style="margin:20px 0">${esc(d.body)}</p>` +
        form(area('Your response', 'reply', d.reply, 'required maxlength="5000"'), 'Save response & resolve'), (data) => {
        const reply = required(data, 'reply', 'Response');
        commit(() => {
            const current = state.doubts.find((x) => x.id === id);
            current.reply = reply;
            current.status = 'Resolved';
        });
        toast('Response saved locally');
    });
}
function newMessage(studentId) {
    modal('Draft parent update', form(`<div class="form-group full"><label for="field-studentId">Student / parent</label><select id="field-studentId" name="studentId">${state.students
        .map((x) => `<option value="${x.id}" ${x.id === studentId ? 'selected' : ''}>${esc(x.name)} — ${esc(x.parent)}</option>`)
        .join('')}</select></div>` +
        field('Subject', 'subject', 'text', 'Student progress update', 'required maxlength="150"') +
        area('Message', 'body', studentId
            ? (() => {
                const x = state.students.find((x) => x.id === studentId);
                return `Dear ${x.parent},\n\nHere is a brief update on ${x.name}'s progress in ${className(state, x.classId)}.\n\nAcademic score: ${x.score}%\nAttendance: ${x.attendance}%\n\n${atRisk(x)
                    ? 'Let us work together to support consistent attendance and focused practice.'
                    : 'Your continued encouragement makes a difference. Thank you for your support.'}\n\nRegards,\n${state.profile.name}`;
            })()
            : '', 'required maxlength="10000"'), 'Save message draft'), (d) => {
        const subject = required(d, 'subject', 'Subject'), body = required(d, 'body', 'Message');
        commit(() => state.messages.unshift({
            id: uid(),
            studentId: val(d, 'studentId'),
            subject,
            body,
            date: today()
        }));
        toast('Draft saved. No message sent.');
    });
}
function newLeave() {
    modal('Apply for leave', form(`<div class="form-group full"><label for="field-type">Leave type</label><select name="type" id="field-type"><option>Casual leave</option><option>Medical leave</option><option>Academic duty</option><option>Personal leave</option></select></div>` +
        field('From', 'start', 'date', today(), 'required') +
        field('Until', 'end', 'date', today(), 'required') +
        area('Reason', 'reason', '', 'required maxlength="2000"') +
        field('Requested substitute (optional)', 'substitute', 'text', '', 'maxlength="100"'), 'Save leave request'), (d) => {
        if (val(d, 'end') < val(d, 'start'))
            throw new Error('End date must be on or after start date.');
        const reason = required(d, 'reason', 'Reason');
        commit(() => state.leaves.unshift({
            id: uid(),
            type: val(d, 'type'),
            start: val(d, 'start'),
            end: val(d, 'end'),
            reason,
            substitute: val(d, 'substitute'),
            status: 'Pending'
        }));
        toast('Leave request saved locally');
    });
}
function exportReport(type) {
    let rows;
    const students = state.students.filter((x) => filters.classId === 'all' || x.classId === filters.classId);
    switch (type) {
        case 'attendance':
            rows = [
                ['Date', 'Class', 'Student', 'Roll number', 'Status'],
                ...state.attendance
                    .filter((a) => filters.classId === 'all' || a.classId === filters.classId)
                    .flatMap((a) => Object.entries(a.records).map(([id, status]) => {
                    const x = state.students.find((x) => x.id === id);
                    return [a.date, className(state, a.classId), x?.name, x?.roll, status];
                }))
            ];
            break;
        case 'assignments':
            rows = [
                ['Assignment', 'Class', 'Due', 'Status', 'Maximum marks', 'Submissions', 'Graded'],
                ...state.assignments.map((a) => [
                    a.title,
                    className(state, a.classId),
                    a.due,
                    a.status,
                    a.maxMarks,
                    state.submissions.filter((x) => x.assignmentId === a.id).length,
                    state.submissions.filter((x) => x.assignmentId === a.id && x.marks !== null).length
                ])
            ];
            break;
        case 'examinations':
            rows = [
                ['Assessment', 'Class', 'Date', 'Type', 'Maximum marks', 'Questions'],
                ...state.assessments.map((a) => [a.title, className(state, a.classId), a.date, a.type, a.maxMarks, a.questions])
            ];
            break;
        case 'performance':
            rows = [
                ['Student', 'Roll number', 'Class', 'Score %', 'Term attendance %', 'Score change %', 'Needs support'],
                ...students.map((x) => [
                    x.name,
                    x.roll,
                    className(state, x.classId),
                    x.score,
                    x.attendance,
                    x.trend,
                    atRisk(x) ? 'Yes' : 'No'
                ])
            ];
            break;
        default:
            rows = [
                ['Student', 'Roll number', 'Class', 'Email', 'Term attendance %', 'Academic score %'],
                ...students.map((x) => [x.name, x.roll, className(state, x.classId), x.email, x.attendance, x.score])
            ];
    }
    download(`teacher-desk-${type}-${today()}.csv`, '\uFEFF' + toCSV(rows), 'text/csv;charset=utf-8');
    toast(rows.length > 1 ? 'Report downloaded' : 'Empty report downloaded. No saved records yet.');
}
function generateTemplate(d) {
    const topic = required(d, 'topic', 'Topic'), level = val(d, 'level'), duration = val(d, 'duration'), objectives = val(d, 'objectives');
    filters.topic = topic;
    const titles = {
        quiz: 'QUIZ DRAFT',
        questions: 'QUESTION BANK DRAFT',
        lesson: 'LESSON PLAN',
        notes: 'STUDY NOTES OUTLINE'
    };
    const intro = `${titles[aiType] || 'TEACHING OUTLINE'} — ${topic}\n${level} · ${duration}\n\nTemplate draft · Add topic-specific details and verify accuracy.\n\n`;
    const goals = objectives || `Explain key ideas in ${topic}; apply them to a worked example; identify common misconceptions.`;
    const bodies = {
        quiz: `Learning objectives\n${goals}\n\nInstructions\nAnswer all five questions. Suggested total: 20 marks.\n\n1. Define ${topic} in your own words. (2 marks)\n2. Identify two key properties of ${topic}. Explain why each matters. (4 marks)\n3. Construct a worked example involving ${topic}. Show each step. (6 marks)\n4. Describe a common error when applying ${topic}, and explain how to avoid it. (4 marks)\n5. Give a practical application of ${topic} and justify your choice. (4 marks)\n\nTeacher review\nPrepare a model answer and scoring rubric for each question before conducting the quiz.`,
        questions: `Learning objectives\n${goals}\n\nRemember\n• What does ${topic} mean?\n• What vocabulary is essential to understanding ${topic}?\n\nUnderstand\n• Explain ${topic} using an everyday analogy.\n• How do its main parts relate to one another?\n\nApply\n• Demonstrate ${topic} using an original example.\n• What changes if one constraint is removed?\n\nAnalyze & evaluate\n• Compare two approaches to a problem involving ${topic}.\n• Find a limitation and propose a way to address it.\n\nCreate\n• Design a small activity that teaches ${topic} to a peer.`,
        lesson: `Learning objectives\n${goals}\n\nOpening · First 10% of lesson\nAsk students what they already know about ${topic}. Use one simple diagnostic question.\n\nExplain · Next 25%\nIntroduce essential vocabulary and the central idea. Connect to prior learning. Add one accurate, topic-specific example.\n\nModel · Next 25%\nWork through a complete example of ${topic}. Think aloud at key decisions. Ask students to predict the next step.\n\nPractice · Next 30%\nStudents solve a related problem in pairs. Circulate and note misconceptions. Provide one extension challenge.\n\nReflect · Final 10%\nCollect an exit ticket: one key idea, one application, one remaining question.\n\nMaterials to prepare\nA worked example, a practice worksheet, a visual explanation and an exit ticket.\n\nFollow-up\nUse exit tickets to decide the next lesson's starting point.`,
        notes: `Learning objectives\n${goals}\n\n1. Big picture\nWrite a concise definition of ${topic}. Explain where it fits in the wider subject.\n\n2. Key vocabulary\nList and define the essential terms. Include a diagram where useful.\n\n3. Core ideas\nBreak ${topic} into three to five central ideas. For each, add an explanation and an example.\n\n4. Worked example\nState the problem, show each step, explain decisions and check the result.\n\n5. Common mistakes\nDescribe likely misconceptions and how to check for them.\n\n6. Self-check\n• Can I explain ${topic} without notes?\n• Can I solve a new example?\n• Can I identify an incorrect solution?\n\nTeacher review\nComplete this outline with verified subject content and course references before sharing.`
    };
    aiOutput = intro + (bodies[aiType] || '');
    render();
    toast('Teaching template created');
}
const handlers = {
    'toggle-sidebar': () => {
        const app = document.querySelector('#app');
        if (!app)
            return;
        const collapsed = app.classList.toggle('sidebar-collapsed');
        const b = document.querySelector('.collapse-sidebar');
        if (b) {
            b.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            b.setAttribute('aria-expanded', String(!collapsed));
            const span = b.querySelector('span');
            if (span)
                span.textContent = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        }
    },
    'close-dialog': () => dialog.close(),
    'open-menu': () => {
        document.querySelector('.sidebar')?.classList.add('open');
        document.querySelector('.menu-overlay')?.classList.add('show');
    },
    'close-menu': closeMenu,
    timetable: () => go('timetable'),
    'new-assignment': () => newAssignment(),
    'edit-assignment': (el) => newAssignment(el.dataset.id),
    'assignment-detail': (el) => assignmentDetail(el.dataset.id),
    'student-detail': (el) => studentDetail(el.dataset.id),
    'class-detail': (el) => classDetail(el.dataset.id),
    grade: (el) => grade(el.dataset.id),
    'class-attendance': (el) => {
        dialog.close();
        route = 'attendance';
        location.hash = 'attendance';
        setTimeout(() => {
            filters.classId = el.dataset.id;
            attendanceDraft = null;
            render();
        }, 0);
    },
    'class-students': (el) => {
        dialog.close();
        route = 'students';
        location.hash = 'students';
        setTimeout(() => {
            filters.classId = el.dataset.id;
            render();
        }, 0);
    },
    'edit-class': (el) => {
        const c = cls(state, el.dataset.id);
        if (!c)
            return;
        modal('Edit class details', form(field('Room', 'room', 'text', c.room, 'required maxlength="80"') +
            field('Start time', 'time', 'time', c.time, 'required') +
            `<div class="form-group full"><label>Teaching days</label><div class="pill-list">${[
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday'
            ]
                .map((day, i) => `<label class="switch"><input type="checkbox" name="days" value="${i + 1}" ${c.days.includes(i + 1) ? 'checked' : ''}>${day}</label>`)
                .join('')}</div><p class="field-note">Each lecture lasts 60 minutes. Timetable supports 09:00, 11:00, 14:00 and 15:00.</p></div>`), (d) => {
            const days = d.getAll('days').map(Number), time = val(d, 'time');
            if (!days.length)
                throw new Error('Select at least one teaching day.');
            if (!['09:00', '11:00', '14:00', '15:00'].includes(time)) {
                throw new Error('Choose 09:00, 11:00, 14:00 or 15:00.');
            }
            if (state.classes.some((x) => x.id !== c.id && x.time === time && x.days.some((day) => days.includes(day)))) {
                throw new Error('This teaching time overlaps another assigned class.');
            }
            const room = required(d, 'room', 'Room');
            commit(() => Object.assign(cls(state, c.id), { room, time, days }));
            toast('Class details updated');
        });
    },
    'new-assessment': newAssessment,
    'assessment-detail': (el) => assessmentDetail(el.dataset.id),
    'download-assessment': (el) => {
        const a = state.assessments.find((x) => x.id === el.dataset.id);
        if (!a)
            return;
        download('assessment.txt', `${a.title}\n${className(state, a.classId)}\n${a.date} · ${a.maxMarks} marks\n\n${a.questions}`);
    },
    conduct: (el) => {
        const a = state.assessments.find((x) => x.id === el.dataset.id);
        if (!a)
            return;
        const qs = a.questions.split('\n').filter((x) => x.trim());
        modal('Practice session · ' + esc(a.title), '<p class="description">Local practice only. Responses save on this device for teacher review.</p>' +
            form(field('Participant name', 'name', 'text', '', 'required maxlength="100"') +
                qs.map((q, i) => area(esc(q), 'answer' + i, '', 'required maxlength="3000"')).join(''), 'Finish & save responses'), (d) => {
            const name = required(d, 'name', 'Name'), answers = qs.map((_, i) => required(d, 'answer' + i, 'Answer ' + (i + 1)));
            commit(() => {
                const current = state.assessments.find((x) => x.id === a.id);
                current.responses = [...(current.responses || []), { name, answers, date: today() }];
            });
            toast('Practice responses saved');
        });
    },
    'new-material': newMaterial,
    'material-detail': (el) => {
        const m = state.materials.find((x) => x.id === el.dataset.id);
        if (!m)
            return;
        modal(esc(m.title), `<div class="pill-list">${badge(className(state, m.classId))}${badge(m.type, 'gray')}</div><div class="resource-body" style="margin-top:20px">${esc(m.description)}</div>${fileLinks(m.files)}<div class="form-actions">${button('Download notes', 'download-notes', `data-id="${m.id}"`)}</div>`);
    },
    'download-notes': (el) => {
        const m = state.materials.find((x) => x.id === el.dataset.id);
        if (!m)
            return;
        download('study-notes.txt', m.title + '\n\n' + m.description);
    },
    'download-file': async (el) => {
        const file = await getFile(el.dataset.id);
        download(el.dataset.name, file);
    },
    'new-announcement': newAnnouncement,
    'announcement-detail': (el) => {
        const a = state.announcements.find((x) => x.id === el.dataset.id);
        if (!a)
            return;
        modal(esc(a.title), `${badge(className(state, a.classId))}<div class="resource-body" style="margin-top:20px">${esc(a.body)}</div><p class="section-note">${esc(state.profile.name)} · ${fmt(a.date)} · Local noticeboard</p>`);
    },
    'doubt-detail': (el) => doubtDetail(el.dataset.id),
    'doubt-tab': (el) => {
        filters.status = el.dataset.id;
        render();
    },
    'progress-tab': (el) => {
        filters.status = el.dataset.id;
        render();
    },
    'new-message': () => newMessage(),
    'message-parent': (el) => newMessage(el.dataset.id),
    'message-detail': (el) => {
        const m = state.messages.find((x) => x.id === el.dataset.id);
        if (!m)
            return;
        modal(esc(m.subject), `${badge('Local draft', 'orange')}<p class="section-note">To: ${esc(state.students.find((x) => x.id === m.studentId)?.parent)}</p><div class="resource-body" style="margin-top:20px">${esc(m.body)}</div><div class="form-actions">${button('Download draft', 'download-message', `data-id="${m.id}"`)}</div>`);
    },
    'download-message': (el) => {
        const m = state.messages.find((x) => x.id === el.dataset.id);
        if (!m)
            return;
        download('parent-update.txt', m.subject + '\n\n' + m.body);
    },
    'new-leave': newLeave,
    export: (el) => exportReport(el.dataset.type),
    backup: () => {
        download('teacher-desk-backup-' + today() + '.json', JSON.stringify(state, null, 2), 'application/json');
        toast('Record backup downloaded. Attachments remain in this browser.');
    },
    'all-present': () => {
        const a = activeAttendance();
        attendanceDraft = Object.fromEntries(state.students.filter((x) => x.classId === a.classId).map((x) => [x.id, 'Present']));
        render();
    },
    'attendance-status': (el) => {
        const a = activeAttendance();
        attendanceDraft = { ...a.records, [el.dataset.id]: el.dataset.status };
        render();
    },
    'save-attendance': () => {
        const a = activeAttendance();
        if (state.students.filter((x) => x.classId === a.classId).some((x) => !a.records[x.id])) {
            toast('Mark every student before saving attendance.');
            return;
        }
        if (mutate(() => saveAttendance(state, a.classId, a.date, a.records), 'Attendance saved')) {
            attendanceDraft = null;
        }
    },
    'ai-type': (el) => {
        const formEl = document.querySelector('#ai-form');
        if (formEl) {
            const topicInput = formEl.elements.namedItem('topic');
            if (topicInput)
                filters.topic = topicInput.value;
        }
        aiType = el.dataset.id;
        render();
    },
    'download-ai': () => download('teaching-template.txt', aiOutput),
    'week-prev': () => shiftWeek(-7),
    'week-next': () => shiftWeek(7),
    'week-today': () => {
        filters.week = today();
        render();
    },
    'new-task': () => modal('Add a to-do', form(field('Task', 'text', 'text', '', 'required maxlength="150"') +
        `<div class="form-group"><label for="field-route">Related page</label><select name="route" id="field-route">${Object.entries(routes)
            .map(([id, label]) => `<option value="${id}">${label}</option>`)
            .join('')}</select></div>`), (d) => {
        const text = required(d, 'text', 'Task');
        commit(() => state.tasks.push({ id: uid(), text, done: false, route: val(d, 'route') }));
        toast('Task added');
    }),
    'open-task': (el) => {
        const t = state.tasks.find((x) => x.id === el.dataset.id);
        if (t)
            go(t.route);
    },
    notifications: () => {
        mutate(() => {
            state.notificationsRead = true;
        });
        const dot = document.querySelector('.notification-dot');
        if (dot)
            dot.hidden = true;
        modal('Your notifications', `<div class="notice-list">${state.announcements
            .map((a) => `<button data-action="announcement-detail" data-id="${a.id}"><strong>${esc(a.title)}</strong><p>${esc(className(state, a.classId))} · ${fmt(a.date)}</p></button>`)
            .join('')}${state.submissions
            .filter((x) => x.marks === null)
            .map((x) => `<button data-action="grade" data-id="${x.id}"><strong>Submission ready for feedback</strong><p>${esc(state.students.find((st) => st.id === x.studentId)?.name)} · ${esc(state.assignments.find((a) => a.id === x.assignmentId)?.title)}</p></button>`)
            .join('')}</div>`);
    }
};
function shiftWeek(n) {
    const d = new Date(filters.week + 'T12:00:00');
    d.setDate(d.getDate() + n);
    filters.week = d.toLocaleDateString('en-CA');
    render();
}
document.addEventListener('click', (e) => {
    const target = e.target;
    const summary = target.closest('.nav-group>summary');
    if (summary && document.querySelector('#app')?.classList.contains('sidebar-collapsed')) {
        e.preventDefault();
        handlers['toggle-sidebar'](summary);
        const parentDetails = summary.parentElement;
        if (parentDetails)
            parentDetails.open = true;
    }
});
document.addEventListener('click', async (e) => {
    const target = e.target;
    const el = target.closest('[data-action]');
    if (!el)
        return;
    const fn = handlers[el.dataset.action || ''];
    if (fn) {
        e.preventDefault();
        try {
            await fn(el);
        }
        catch (error) {
            toast(error instanceof Error ? error.message : String(error));
        }
    }
});
document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'class-filter') {
        filters.classId = el.value;
        render();
    }
    if (el.id === 'attendance-class') {
        filters.classId = el.value;
        attendanceDraft = null;
        render();
    }
    if (el.id === 'attendance-date') {
        filters.date = el.value || today();
        attendanceDraft = null;
        render();
    }
    if (el.dataset.task) {
        const taskEl = el;
        mutate(() => {
            const task = state.tasks.find((x) => x.id === taskEl.dataset.task);
            if (task)
                task.done = taskEl.checked;
        });
    }
});
document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.id === 'list-search') {
        const pos = target.selectionStart;
        filters.search = target.value;
        render();
        const input = document.querySelector('#list-search');
        if (input) {
            input.focus();
            if (pos !== null)
                input.setSelectionRange(pos, pos);
        }
    }
});
document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'global-search-form') {
        e.preventDefault();
        const input = f.querySelector('input');
        const q = (input?.value || '').trim().toLowerCase();
        const results = [
            ...state.students
                .filter((x) => `${x.name} ${x.roll}`.toLowerCase().includes(q))
                .map((x) => ({ title: x.name, sub: x.roll, action: 'student-detail', id: x.id, ico: 'users' })),
            ...state.classes
                .filter((x) => `${x.subject} ${x.code}`.toLowerCase().includes(q))
                .map((x) => ({ title: x.subject, sub: x.section, action: 'class-detail', id: x.id, ico: 'book' })),
            ...state.assignments
                .filter((x) => x.title.toLowerCase().includes(q))
                .map((x) => ({ title: x.title, sub: 'Assignment', action: 'assignment-detail', id: x.id, ico: 'file' }))
        ];
        modal('Search results', q
            ? `<p class="description">${results.length} results for “${esc(q)}”</p><div class="results">${results.length
                ? results
                    .map((x) => `<button class="result" data-action="${x.action}" data-id="${x.id}">${icon(x.ico)}<span><strong>${esc(x.title)}</strong><small>${esc(x.sub)}</small></span></button>`)
                    .join('')
                : empty('No results found', 'Try a student name, subject or assignment title.')}</div>`
            : empty('What are you looking for?', 'Enter a student, subject or assignment in the search box.'));
    }
    if (f.id === 'ai-form') {
        e.preventDefault();
        try {
            generateTemplate(new FormData(f));
        }
        catch (error) {
            toast(error instanceof Error ? error.message : String(error));
        }
    }
    if (f.id === 'profile-form') {
        e.preventDefault();
        const d = new FormData(f);
        try {
            const profile = {
                name: required(d, 'name', 'Name'),
                email: required(d, 'email', 'Email'),
                department: required(d, 'department', 'Department'),
                phone: val(d, 'phone'),
                bio: val(d, 'bio'),
                emailUpdates: d.has('emailUpdates')
            };
            if (mutate(() => {
                state.profile = profile;
            }, 'Profile updated')) {
                shell();
            }
        }
        catch (error) {
            toast(error instanceof Error ? error.message : String(error));
        }
    }
});
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('#global-search')?.focus();
    }
    if (e.key === 'Escape')
        closeMenu();
});
dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            dialog.close();
        }
    }
});
shell();
