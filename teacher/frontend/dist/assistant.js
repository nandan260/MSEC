const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const routes = new Set(['overview', 'classes', 'students', 'attendance', 'assignments', 'assessments', 'analytics', 'ai', 'materials', 'timetable', 'announcements', 'progress', 'doubts', 'parents', 'leave', 'reports', 'profile']);
export function safeRoute(value) { return routes.has(value) ? value : null; }
export function safeResourceURL(value) {
    try {
        const u = new URL(value);
        return u.protocol === 'https:' && !u.username && !u.password && ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(u.hostname) ? u.href : null;
    }
    catch {
        return null;
    }
}
/** A deliberately small Markdown subset: all content is escaped before fixed markup is added. */
export function formatMessage(value) {
    const bold = (text) => {
        let result = '', from = 0;
        for (const match of text.matchAll(/\*\*([^*\n]{1,2000})\*\*/g)) {
            result += escape(text.slice(from, match.index)) + `<strong>${escape(match[1])}</strong>`;
            from = match.index + match[0].length;
        }
        return result + escape(text.slice(from));
    };
    const prose = (text) => {
        let result = '', from = 0;
        for (const match of text.matchAll(/\[([^\]\n]{1,500})\]\(([^\s()]*(?:\([^()\s]*\)[^\s()]*)?)\)/g)) {
            result += bold(text.slice(from, match.index));
            const route = match[2].startsWith('#') ? safeRoute(match[2].slice(1)) : null;
            result += route ? `<a href="#${escape(route)}">${escape(match[1])}</a>` : escape(match[1]);
            from = match.index + match[0].length;
        }
        return result + bold(text.slice(from));
    };
    const text = String(value).slice(0, 100000);
    let result = '', from = 0;
    for (const match of text.matchAll(/```(?:[^\n`]*\n)?([\s\S]*?)```|`([^`\n]+)`/g)) {
        result += prose(text.slice(from, match.index));
        result += match[1] !== undefined ? `<pre><code>${escape(match[1])}</code></pre>` : `<code>${escape(match[2])}</code>`;
        from = match.index + match[0].length;
    }
    return result + prose(text.slice(from));
}
export function insights(s) {
    const date = new Date().toLocaleDateString('en-CA');
    return s.students.map(student => {
        const assignments = s.assignments.filter(a => a.classId === student.classId && a.status !== 'Draft' && a.due < date);
        const grades = s.submissions.filter(sub => sub.studentId === student.id && sub.marks !== null).flatMap(sub => {
            const a = s.assignments.find(a => a.id === sub.assignmentId);
            return a ? [{ title: a.title, marks: sub.marks, maxMarks: a.maxMarks }] : [];
        });
        return { ...student, className: s.classes.find(c => c.id === student.classId)?.name || student.classId, grades,
            missing: assignments.filter(a => !s.submissions.some(sub => sub.assignmentId === a.id && sub.studentId === student.id)).length };
    });
}
export function studentNotifications(s) {
    return insights(s).flatMap(student => {
        const flags = [student.score < 60 ? `Sample score ${student.score}%` : '', student.attendance < 75 ? `sample attendance ${student.attendance}%` : '', student.missing > 0 ? `${student.missing} overdue missing` : '', student.trend < 0 ? `Declining trend ${student.trend}` : ''].filter(Boolean);
        const entries = flags.length ? [{ kind: 'support', studentId: student.id, title: `Check in with ${student.name}`, detail: `${student.roll} · ${flags.join(' · ')}` }] : [];
        for (const grade of student.grades)
            entries.push({ kind: 'grade', studentId: student.id, title: `Saved grade · ${student.name}`, detail: `${grade.title} · Actual saved marks: ${grade.marks}/${grade.maxMarks}` });
        return entries;
    });
}
/** Academic records only; contact details and unrelated private drafts stay in the browser. */
export function snapshot(s) {
    return { ...s, profile: { name: s.profile.name, department: s.profile.department, email: '', phone: '', bio: '', emailUpdates: false },
        students: s.students.map(x => ({ ...x, email: '', parent: '' })),
        assignments: s.assignments.map(x => ({ ...x, files: [] })), submissions: s.submissions.map(x => ({ ...x, text: '', history: undefined })),
        materials: s.materials.map(x => ({ ...x, files: [] })), messages: [], leaves: [], tasks: s.tasks.map(x => ({ ...x })) };
}
const session = { turns: [], draft: '', status: 'checking', model: '', busy: false, error: '', exporting: false };
let notify = () => { };
let checked = false;
let getState;
function diagramHTML(d) {
    const nodes = [...new Map((Array.isArray(d.nodes) ? d.nodes : []).slice(0, 24).map(node => [String(node.id), node])).values()];
    const ids = new Set(nodes.map(n => String(n.id)));
    const links = (Array.isArray(d.edges) ? d.edges : []).slice(0, 48).filter(e => ids.has(String(e.from)) && ids.has(String(e.to)));
    const incoming = new Map(nodes.map(n => [String(n.id), 0]));
    const depth = new Map(nodes.map(n => [String(n.id), 0]));
    for (const edge of links)
        incoming.set(String(edge.to), incoming.get(String(edge.to)) + 1);
    const queue = nodes.map(n => String(n.id)).filter(id => incoming.get(id) === 0);
    const visited = new Set();
    // Kahn's bounded traversal layers acyclic components; remaining cycles use a fixed grid.
    for (let cursor = 0; cursor < queue.length && cursor < 24; cursor++) {
        const id = queue[cursor];
        visited.add(id);
        for (const edge of links.filter(e => String(e.from) === id)) {
            const target = String(edge.to);
            depth.set(target, Math.max(depth.get(target), depth.get(id) + 1));
            incoming.set(target, incoming.get(target) - 1);
            if (incoming.get(target) === 0)
                queue.push(target);
        }
    }
    const fallbackStart = visited.size ? Math.max(...[...visited].map(id => depth.get(id))) + 1 : 0;
    let fallbackIndex = 0;
    for (const node of nodes)
        if (!visited.has(String(node.id)))
            depth.set(String(node.id), fallbackStart + Math.floor(fallbackIndex++ / 3));
    const layers = new Map();
    for (const node of nodes) {
        const id = String(node.id), level = depth.get(id);
        layers.set(level, [...(layers.get(level) || []), id]);
    }
    const width = Math.max(660, ...[...layers.values()].map(layer => layer.length * 220));
    const height = Math.max(120, (Math.max(0, ...layers.keys()) + 1) * 110);
    const positions = new Map();
    for (const [level, layer] of layers)
        layer.forEach((id, index) => positions.set(id, { x: width / 2 + (index - (layer.length - 1) / 2) * 220, y: 50 + level * 110 }));
    const edges = links.map(edge => {
        const a = positions.get(String(edge.from)), b = positions.get(String(edge.to));
        const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
        if (length === 0)
            return '';
        const offset = Math.min(dx === 0 ? Infinity : 95 / Math.abs(dx), dy === 0 ? Infinity : 22 / Math.abs(dy));
        const start = { x: a.x + dx * offset, y: a.y + dy * offset }, tip = { x: b.x - dx * offset, y: b.y - dy * offset };
        const ux = dx / length, uy = dy / length, base = { x: tip.x - ux * 10, y: tip.y - uy * 10 };
        return `<g><line x1="${start.x}" y1="${start.y}" x2="${tip.x}" y2="${tip.y}" stroke="#8d79a7" stroke-width="2"/><polygon points="${tip.x},${tip.y} ${base.x - uy * 5},${base.y + ux * 5} ${base.x + uy * 5},${base.y - ux * 5}" fill="#8d79a7"/><title>${escape(edge.from)} to ${escape(edge.to)} ${escape(edge.label)}</title>${edge.label ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 8}" text-anchor="middle">${escape(String(edge.label).slice(0, 24))}</text>` : ''}</g>`;
    }).join('');
    return `<figure class="assistant-diagram"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Lesson concept diagram"><title>Lesson concept diagram</title>${edges}${nodes.map(n => { const p = positions.get(String(n.id)); return `<g><rect x="${p.x - 95}" y="${p.y - 22}" width="190" height="44" rx="12" fill="#f0eafa" stroke="#694598"/><text x="${p.x}" y="${p.y + 5}" text-anchor="middle">${escape(String(n.label).slice(0, 24))}</text><title>${escape(n.label)}</title></g>`; }).join('')}</svg><figcaption>${nodes.map(n => escape(n.label)).join(' · ')}</figcaption></figure>`;
}
export function renderCard(card, index) {
    if (!card || typeof card !== 'object')
        return '';
    const title = `<h3>${escape(card.title)}</h3>`;
    if (card.kind === 'lesson')
        return `<section class="assistant-card">${title}<p>${escape(card.summary)}</p>${(card.sections || []).slice(0, 20).map(x => `<h4>${escape(x.title)}</h4><p>${escape(x.body)}</p>`).join('')}${card.diagram ? diagramHTML(card.diagram) : ''}${(card.quiz || []).slice(0, 20).map(x => `<details class="assistant-quiz"><summary>${escape(x.question)}</summary><p>${escape(x.answer)}</p></details>`).join('')}${(card.slides || []).length ? `<details><summary>Preview ${card.slides.length} slides</summary><div class="assistant-slides">${card.slides.slice(0, 30).map((x, i) => `<article><small>SLIDE ${i + 1}</small><h4>${escape(x.title)}</h4><ul>${(x.bullets || []).slice(0, 12).map(b => `<li>${escape(b)}</li>`).join('')}</ul></article>`).join('')}</div></details><button class="btn" data-assistant="export" data-format="pptx" data-card="${index}" ${session.exporting ? 'disabled' : ''}>Download PowerPoint</button>` : ''}</section>`;
    if (card.kind === 'students')
        return `<section class="assistant-card">${title}<p class="assistant-note">Browser records · Academic score and attendance are sample percentages.</p>${card.rows.length > 100 ? `<p class="assistant-note">Showing 100 of ${card.rows.length} students. Download the spreadsheet for all students.</p>` : ''}${(card.rows || []).slice(0, 100).map(x => `<button class="assistant-student" data-action="student-detail" data-id="${escape(x.id)}"><strong>${escape(x.name)}</strong><span>${escape(x.roll)} · ${escape(x.className)}</span><span>Score ${escape(x.score)}% · Attendance ${escape(x.attendance)}% · Missing ${escape(x.missing)}</span></button>`).join('')}<button class="btn" data-assistant="export" data-format="xlsx" data-card="${index}" ${session.exporting ? 'disabled' : ''}>Download spreadsheet</button></section>`;
    if (card.kind === 'resources')
        return `<section class="assistant-card">${title}<p class="assistant-note">${card.verified ? 'Verified YouTube results' : 'YouTube search links · Results not verified'}</p>${(card.items || []).slice(0, 12).map(x => { const url = safeResourceURL(x.url); return url ? `<a class="assistant-resource" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(x.title)} ↗<small>${escape(x.description)}</small></a>` : ''; }).join('')}</section>`;
    return '';
}
function actionsHTML(actions) { return (actions || []).slice(0, 12).map(a => a.type === 'navigate' && safeRoute(a.route) ? `<a class="btn" href="#${escape(a.route)}">${escape(a.label)}</a>` : a.type === 'student' && getState?.().students.some(s => s.id === a.id) ? `<button class="btn" data-action="student-detail" data-id="${escape(a.id)}">${escape(a.label)}</button>` : '').join(''); }
const suggestions = [['Students needing support', 'Which students need support? Use saved grades and attendance.'], ['Find attendance', 'Show me where to mark attendance.'], ['Explain BST visually', 'Explain binary search trees visually, with a diagram and a short quiz.'], ['Summarize my text', 'Summarize the text I paste below or attach.'], ['Create lesson slides', 'Create a lesson about binary search trees with presentation slides.'], ['Student spreadsheet', 'Show all students in a student card so I can export their spreadsheet.']];
export function assistantView(s) {
    const risks = insights(s).filter(x => x.score < 60 || x.attendance < 75 || x.trend < 0 || x.missing > 0).sort((a, b) => b.missing - a.missing || a.score - b.score);
    const status = { checking: 'Checking connection', connected: 'Connected', unconfigured: 'Model setup required', unreachable: 'Server unreachable' }[session.status];
    const setup = session.status === 'unconfigured' || session.status === 'unreachable';
    return `<div class="page-heading"><div><h1>Teaching assistant</h1><p>One conversation. More room to teach.</p></div><span class="assistant-status ${session.status}" role="status">${escape(status)}${session.model ? ` · ${escape(session.model)}` : ''}</span></div><div class="assistant-workspace"><aside class="assistant-rail"><section><span class="assistant-eyebrow">YOUR TEACHING PARTNER</span><h2>From insight<br>to understanding.</h2><p>Explore records, explain ideas, prepare lessons and take the next step.</p><div class="assistant-capabilities"><span>Student insights</span><span>Visual lessons & quizzes</span><span>PowerPoint & spreadsheets</span><span>Text summaries & resources</span></div></section><section><h3>Students to check in with <span>${risks.length}</span></h3><p class="assistant-note">Calculated from this browser. Sample academic percentages; saved grades remain actual marks.</p>${risks.slice(0, 3).map(x => `<button class="assistant-student" data-action="student-detail" data-id="${escape(x.id)}"><strong>${escape(x.name)}</strong><span>${x.score}% score · ${x.attendance}% attendance</span><span>${x.missing} overdue missing · ${x.grades.length} saved grades</span></button>`).join('') || '<p>No support flags in current browser records.</p>'}<a href="#students" class="text-link">Open all students →</a></section><section><h3>Connected to your workspace</h3><p class="assistant-note">Browser records are sent with each message. Contact details and private parent drafts stay here. Review generated teaching content.</p><a href="#attendance" class="text-link">Attendance</a> · <a href="#assignments" class="text-link">Assignments</a></section></aside><section class="assistant-chat" aria-label="Assistant conversation"><div class="assistant-transcript" id="assistant-transcript" tabindex="0" role="log" aria-label="Conversation messages" aria-live="polite">${setup ? `<section class="assistant-setup"><h2>${session.status === 'unconfigured' ? 'Connect a model to begin' : 'Reconnect the assistant server'}</h2><p>${session.status === 'unconfigured' ? 'Your assistant is ready for a server-side model connection. Ask your administrator to configure the backend environment and restart it.' : 'The assistant API could not be reached. Start the backend and check the /api proxy, then retry.'}</p><code>AI_BASE_URL=https://api.openai.com/v1<br>AI_MODEL=your-tool-capable-model<br>AI_API_KEY=your-server-key</code><p>Use an OpenAI-compatible hosted or local provider. Keep credentials in the backend environment.</p><button class="btn" data-assistant="retry">Check connection</button></section>` : ''}${!session.turns.length ? `<div class="assistant-welcome"><span class="assistant-spark" aria-hidden="true">✦</span><h2>What would make today easier?</h2><p>Ask about your students or turn a teaching idea into something useful.</p><div class="assistant-suggestions">${suggestions.map(([label, prompt]) => `<button data-assistant="suggest" data-prompt="${escape(prompt)}">${label}<span aria-hidden="true">↗</span></button>`).join('')}</div></div>` : ''}${session.turns.map((turn, i) => `<article class="assistant-turn ${turn.role}"><span class="assistant-eyebrow">${turn.role === 'user' ? 'YOU' : 'TEACHING ASSISTANT'}</span><div class="assistant-message">${turn.role === 'assistant' ? formatMessage(turn.content) : escape(turn.content)}</div>${turn.response ? `${turn.response.cards.map((card, j) => renderCard(card, i * 100 + j)).join('')}<div class="assistant-actions">${actionsHTML(turn.response.actions)}</div>${turn.response.warnings.map(w => `<p class="assistant-warning">${escape(w)}</p>`).join('')}${turn.response.trace.length ? `<details class="assistant-trace"><summary>Activity · ${turn.response.trace.length} steps</summary>${turn.response.trace.map(t => `<p>${escape(t)}</p>`).join('')}</details>` : ''}` : ''}</article>`).join('')}${session.busy ? '<p class="assistant-working" role="status">Working with your browser records and teaching tools…</p>' : ''}</div><form id="assistant-form" class="assistant-composer"><div id="assistant-error" role="alert">${escape(session.error)}</div>${session.attachment ? `<div class="assistant-attachment">${escape(session.attachment.name)} · ${Math.ceil(new TextEncoder().encode(session.attachment.text).length / 1000)} KB <button type="button" data-assistant="remove-file" aria-label="Remove attachment" ${session.busy ? 'disabled' : ''}>×</button></div>` : ''}<label for="assistant-input" class="assistant-input-label">Message your teaching assistant</label><textarea id="assistant-input" name="message" maxlength="30000" rows="2" placeholder="Ask a question, follow up, or paste text to summarize…" ${session.busy ? 'readonly' : ''}>${escape(session.draft)}</textarea><div class="assistant-compose-actions"><label class="assistant-upload" for="assistant-file">＋ Attach text<input id="assistant-file" type="file" accept=".txt,.md,.csv,.json" ${session.busy ? 'disabled' : ''}></label><small>TXT, MD, CSV, JSON · 100 KB</small>${session.busy ? '<button type="button" class="btn" data-assistant="cancel">Cancel</button>' : `<button type="submit" class="btn primary" ${session.status === 'checking' ? 'disabled' : ''}>Send ↑</button>`}</div><p class="assistant-note">Enter for a new line · Ctrl / ⌘ + Enter to send. Your marks are never changed by the assistant.</p></form></section></div>`;
}
function refresh() { notify(); }
async function checkStatus() {
    session.status = 'checking';
    refresh();
    try {
        const response = await fetch('/api/assistant/status', { signal: AbortSignal.timeout(10000) });
        if (!response.ok)
            throw new Error('Status unavailable');
        const data = await response.json();
        session.status = data.configured ? 'connected' : 'unconfigured';
        session.model = String(data.model || '');
    }
    catch {
        session.status = 'unreachable';
    }
    refresh();
}
async function send() {
    if (session.busy || (!session.draft.trim() && !session.attachment))
        return;
    session.error = '';
    session.busy = true;
    session.controller = new AbortController();
    const content = session.draft.trim() || 'Summarize the attached text.';
    const attachment = session.attachment ? { ...session.attachment } : undefined;
    let reachedServer = false;
    const messages = [...session.turns.slice(-20).map(turn => ({ role: turn.role, content: turn.historyContent || turn.content })), { role: 'user', content }];
    refresh();
    try {
        const response = await fetch('/api/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: session.controller.signal, body: JSON.stringify({ messages, context: snapshot(getState()), currentRoute: 'ai', ...(attachment ? { attachment } : {}) }) });
        reachedServer = true;
        const data = await response.json();
        if (!response.ok) {
            if (response.status === 503)
                await checkStatus();
            throw new Error(data.error || 'The assistant could not respond. Try again.');
        }
        if (typeof data.message !== 'string' || !Array.isArray(data.cards) || !Array.isArray(data.actions))
            throw new Error('The assistant returned an invalid response. Please retry.');
        const result = { message: data.message, cards: data.cards, actions: data.actions, trace: Array.isArray(data.trace) ? data.trace : [], warnings: Array.isArray(data.warnings) ? data.warnings : [] };
        const source = attachment ? `\nAttached source (${attachment.name}):\n${attachment.text.slice(0, 10000)}${attachment.text.length > 10000 ? '\n[Source excerpt truncated for follow-up context]' : ''}` : '';
        session.turns.push({ role: 'user', content: content + (attachment ? `\nAttached: ${attachment.name}` : ''), historyContent: (content + source).slice(0, 29000) }, { role: 'assistant', content: result.message, historyContent: (result.message + '\nStructured teaching content from this response:\n' + JSON.stringify(result.cards)).slice(0, 29000), response: result });
        session.draft = '';
        session.attachment = undefined;
        session.status = 'connected';
    }
    catch (error) {
        if (!reachedServer && !(error instanceof Error && error.name === 'AbortError'))
            session.status = 'unreachable';
        session.error = error instanceof Error && error.name === 'AbortError' ? 'Request cancelled. Your message is still here.' : error instanceof Error ? error.message : 'Unable to connect. Your message is still here.';
    }
    finally {
        session.busy = false;
        session.controller = undefined;
        refresh();
    }
}
async function exportFile(format, cardIndex) {
    if (session.exporting)
        return;
    const card = session.turns[Math.floor(cardIndex / 100)]?.response?.cards[cardIndex % 100];
    session.exporting = true;
    session.error = '';
    refresh();
    try {
        const response = await fetch('/api/assistant/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format, context: snapshot(getState()), ...(card?.kind === 'lesson' ? { lesson: card } : {}), ...(card?.kind === 'students' ? { studentIds: card.rows.map(s => s.id) } : {}) }) });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Export failed.');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = format === 'pptx' ? 'teaching-lesson.pptx' : 'student-records.xlsx';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    catch (error) {
        session.error = error instanceof Error ? error.message : 'Export failed.';
    }
    finally {
        session.exporting = false;
        refresh();
    }
}
let bound = false;
export function bindAssistant(readState, rerender) {
    getState = readState;
    notify = rerender;
    if (!checked) {
        checked = true;
        void checkStatus();
    }
    if (bound)
        return;
    bound = true;
    document.addEventListener('input', e => { const el = e.target; if (el.id === 'assistant-input')
        session.draft = el.value; });
    document.addEventListener('submit', e => { if (e.target.id === 'assistant-form') {
        e.preventDefault();
        void send();
    } });
    document.addEventListener('keydown', e => { if (e.target.id === 'assistant-input' && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void send();
    } });
    document.addEventListener('click', e => {
        const el = e.target.closest('[data-assistant]');
        if (!el)
            return;
        e.preventDefault();
        switch (el.dataset.assistant) {
            case 'retry':
                void checkStatus();
                break;
            case 'cancel':
                session.controller?.abort();
                break;
            case 'suggest':
                if (session.busy)
                    return;
                session.draft = el.dataset.prompt || '';
                refresh();
                document.querySelector('#assistant-input')?.focus();
                break;
            case 'remove-file':
                if (session.busy)
                    return;
                session.attachment = undefined;
                refresh();
                break;
            case 'export':
                void exportFile(el.dataset.format || '', Number(el.dataset.card));
                break;
        }
    });
    document.addEventListener('change', async (e) => {
        const el = e.target;
        if (el.id !== 'assistant-file' || !el.files?.[0])
            return;
        const file = el.files[0];
        session.error = '';
        if (!/\.(txt|md|csv|json)$/i.test(file.name) || file.size > 100000) {
            session.error = 'Attach a TXT, MD, CSV or JSON text file up to 100 KB. PDF, images and binary files are not supported.';
            refresh();
            return;
        }
        try {
            const text = await file.text();
            if (text.includes('\0'))
                throw new Error('This file contains binary data. Attach a plain text file.');
            session.attachment = { name: file.name, text };
        }
        catch (error) {
            session.error = error instanceof Error ? error.message : 'Could not read the file.';
        }
        refresh();
    });
}
export function scrollAssistant() { const el = document.querySelector('#assistant-transcript'); if (el)
    el.scrollTop = el.scrollHeight; }
