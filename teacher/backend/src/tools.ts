export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type Obj = Record<string, any>;
export const routes: Record<string, string> = {
  overview: "Overview",
  classes: "My classes",
  students: "Students",
  attendance: "Attendance",
  assignments: "Assignments",
  assessments: "Assessments",
  analytics: "Performance analytics",
  ai: "AI assistant",
  materials: "Study materials",
  timetable: "Timetable",
  announcements: "Announcements",
  progress: "Student progress",
  doubts: "Student doubts",
  parents: "Parent communication",
  leave: "Leave & substitutions",
  reports: "Reports",
  profile: "Profile & settings",
};
export const object = (x: unknown): x is Obj =>
  !!x && typeof x === "object" && !Array.isArray(x);
export function str(x: unknown, max = 4000): string {
  if (typeof x !== "string" || x.length > max)
    throw new ApiError(400, "Invalid or oversized text.");
  return x;
}
export function snapshot(x: unknown): Obj {
  if (!object(x) || !Number.isInteger(x.version) || !object(x.profile))
    throw new ApiError(400, "Invalid dashboard snapshot.");
  for (const key of [
    "classes",
    "students",
    "attendance",
    "assignments",
    "submissions",
    "assessments",
    "materials",
    "announcements",
    "doubts",
    "messages",
    "leaves",
    "tasks",
  ]) {
    if (
      !Array.isArray(x[key]) ||
      x[key].length > 3000 ||
      x[key].some((r: unknown) => !object(r))
    )
      throw new ApiError(400, `Invalid snapshot ${key}.`);
  }
  for (const key of [
    "classes",
    "students",
    "assignments",
    "submissions",
    "assessments",
    "materials",
    "announcements",
    "doubts",
    "messages",
    "leaves",
    "tasks",
  ]) {
    const ids = new Set();
    for (const row of x[key]) {
      str(row.id, 150);
      if (ids.has(row.id)) throw new ApiError(400, "Duplicate record ID.");
      ids.add(row.id);
    }
  }
  for (const row of x.classes) {
    str(row.name, 300);
    str(row.subject, 300);
  }
  for (const s of x.students) {
    for (const k of ["name", "roll", "classId"]) str(s[k], 300);
    for (const k of ["score", "attendance", "trend"])
      if (
        typeof s[k] !== "number" ||
        !Number.isFinite(s[k]) ||
        (k !== "trend" && (s[k] < 0 || s[k] > 100))
      )
        throw new ApiError(400, "Invalid student percentages.");
    if (!x.classes.some((c: Obj) => c.id === s.classId))
      throw new ApiError(400, "Unknown student class.");
  }
  for (const a of x.assignments) {
    str(a.classId, 150);
    str(a.title, 500);
    str(a.status, 100);
  }
  for (const s of x.submissions) {
    str(s.assignmentId, 150);
    str(s.studentId, 150);
    if (
      s.marks !== null &&
      (typeof s.marks !== "number" || !Number.isFinite(s.marks))
    )
      throw new ApiError(400, "Invalid submission marks.");
  }
  for (const a of x.attendance) {
    str(a.classId, 150);
    str(a.date, 20);
    if (
      !object(a.records) ||
      Object.entries(a.records).some(
        ([id, status]) =>
          !x.students.some((v: Obj) => v.id === id) ||
          !["Present", "Absent", "Late", "Excused"].includes(status as string),
      )
    )
      throw new ApiError(400, "Invalid attendance records.");
  }
  return x;
}
export function ids(arg: unknown, ctx: Obj): string[] | undefined {
  if (arg === undefined) return undefined;
  if (
    !Array.isArray(arg) ||
    arg.length > 3000 ||
    arg.some(
      (x) =>
        typeof x !== "string" || !ctx.students.some((s: Obj) => s.id === x),
    )
  )
    throw new ApiError(400, "Unknown or invalid studentIds.");
  return [...new Set(arg)] as string[];
}
export function studentRows(ctx: Obj, filter?: string[]) {
  return ctx.students
    .filter((s: Obj) => !filter || filter.includes(s.id))
    .map((s: Obj) => ({
      id: s.id,
      name: s.name,
      roll: s.roll,
      score: s.score,
      attendance: s.attendance,
      trend: s.trend,
      className:
        ctx.classes.find((c: Obj) => c.id === s.classId)?.name ?? s.classId,
      missing: ctx.assignments.filter(
        (a: Obj) =>
          a.classId === s.classId &&
          a.status !== "Draft" &&
          typeof a.due === "string" &&
          a.due < new Date().toLocaleDateString("en-CA") &&
          !ctx.submissions.some(
            (sub: Obj) => sub.studentId === s.id && sub.assignmentId === a.id,
          ),
      ).length,
    }));
}
export const lessonContract =
  "create_lesson requires {title:string,summary:string,sections:[{title:string,body:string}],slides:[{title:string,bullets:string[],notes?:string}],diagram?:{nodes:[{id:string,label:string}],edges:[{from:string,to:string,label?:string}]},quiz?:[{question:string,answer:string}]}. sections is always an array (empty allowed); every section uses body, never content. Include at least one slide. Diagram IDs and all text values are strings.";
function lessonText(value: unknown, path: string, max: number): string {
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(
      400,
      `${path} must be a string with at most ${max} characters.`,
    );
  return value;
}
export function lesson(x: unknown): Obj {
  if (!object(x)) throw new ApiError(400, "Invalid lesson.");
  const out: Obj = {
    kind: "lesson",
    title: lessonText(x.title, "title", 200),
    summary: lessonText(x.summary, "summary", 6000),
  };
  for (const key of ["sections", "slides"]) {
    if (
      !Array.isArray(x[key]) ||
      x[key].length > 24 ||
      (key === "slides" && !x[key].length)
    )
      throw new ApiError(
        400,
        `${key} must be an array of at most 24 objects${key === "slides" ? ", including at least one slide" : " (empty sections allowed)"}. ${lessonContract}`,
      );
    out[key] = x[key].map((r: Obj, index: number) => {
      if (!object(r))
        throw new ApiError(400, `${key}[${index}] must be an object.`);
      const item: Obj = {
        title: lessonText(r.title, `${key}[${index}].title`, 200),
      };
      if (key === "sections")
        item.body = lessonText(r.body, `sections[${index}].body`, 6000);
      else {
        if (!Array.isArray(r.bullets) || r.bullets.length > 12)
          throw new ApiError(
            400,
            `slides[${index}].bullets must be an array of at most 12 strings.`,
          );
        item.bullets = r.bullets.map((b: unknown, j: number) =>
          lessonText(b, `slides[${index}].bullets[${j}]`, 1000),
        );
        if (r.notes !== undefined)
          item.notes = lessonText(r.notes, `slides[${index}].notes`, 3000);
      }
      return item;
    });
  }
  if (x.diagram !== undefined) {
    const d = x.diagram;
    if (
      !object(d) ||
      !Array.isArray(d.nodes) ||
      !Array.isArray(d.edges) ||
      d.nodes.length > 20 ||
      d.edges.length > 30
    )
      throw new ApiError(400, "Invalid diagram.");
    const nodes = d.nodes.map((n: Obj) => {
      if (!object(n)) throw new ApiError(400, "Invalid diagram node.");
      return { id: str(n.id, 60), label: str(n.label, 150) };
    });
    if (new Set(nodes.map((n: Obj) => n.id)).size !== nodes.length)
      throw new ApiError(400, "Duplicate diagram node.");
    const edges = d.edges.map((e: Obj) => {
      if (!object(e)) throw new ApiError(400, "Invalid diagram edge.");
      if (
        !nodes.some((n: Obj) => n.id === e.from) ||
        !nodes.some((n: Obj) => n.id === e.to)
      )
        throw new ApiError(400, "Unknown diagram node.");
      return {
        from: e.from,
        to: e.to,
        ...(e.label === undefined ? {} : { label: str(e.label, 150) }),
      };
    });
    out.diagram = { nodes, edges };
  }
  if (x.quiz !== undefined) {
    if (!Array.isArray(x.quiz) || x.quiz.length > 20)
      throw new ApiError(400, "Invalid quiz.");
    out.quiz = x.quiz.map((q: Obj) => {
      if (!object(q)) throw new ApiError(400, "Invalid quiz item.");
      return { question: str(q.question, 1500), answer: str(q.answer, 3000) };
    });
  }
  return out;
}
const schema = (properties: Obj, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const text = { type: "string" };
const studentIds = { type: "array", items: text };
export const toolDefinitions = [
  [
    "search_dashboard",
    "Search all dashboard routes, feature descriptions and saved records.",
    schema({ query: text }, ["query"]),
  ],
  [
    "student_insights",
    "Return saved score/attendance/trend and calculated missing submissions. Never supply student values yourself.",
    schema({ studentIds, query: text, atRisk: { type: "boolean" } }),
  ],
  [
    "query_student_records",
    "Get exact student records, attendance sessions, assignments and submissions from browser snapshot.",
    schema({ studentIds, query: text }),
  ],
  [
    "navigate",
    "Offer a clickable dashboard navigation action using an allowed route.",
    schema({ route: { type: "string", enum: Object.keys(routes) } }, ["route"]),
  ],
  [
    "create_lesson",
    "Create a structured lesson with diagram, presentation slides and optional quiz. Supply all educational content. No student records. " +
      lessonContract,
    schema(
      {
        title: text,
        summary: text,
        sections: {
          type: "array",
          items: schema({ title: text, body: text }, ["title", "body"]),
        },
        slides: {
          type: "array",
          items: schema(
            {
              title: text,
              bullets: { type: "array", items: text },
              notes: text,
            },
            ["title", "bullets"],
          ),
        },
        diagram: schema(
          {
            nodes: {
              type: "array",
              items: schema({ id: text, label: text }, ["id", "label"]),
            },
            edges: {
              type: "array",
              items: schema({ from: text, to: text, label: text }, [
                "from",
                "to",
              ]),
            },
          },
          ["nodes", "edges"],
        ),
        quiz: {
          type: "array",
          items: schema({ question: text, answer: text }, [
            "question",
            "answer",
          ]),
        },
      },
      ["title", "summary", "sections", "slides"],
    ),
  ],
  [
    "youtube_resources",
    "Find YouTube resources. Without API key returns honestly labeled search URLs, never invented videos.",
    schema({ query: text }, ["query"]),
  ],
].map(([name, description, parameters]) => ({
  type: "function",
  function: { name, description, parameters },
}));
export async function runTool(
  name: string,
  args: unknown,
  ctx: Obj,
  env: NodeJS.ProcessEnv,
  output: Obj,
  signal: AbortSignal,
) {
  if (!object(args))
    throw new ApiError(400, "Tool arguments must be an object.");
  if (name === "navigate") {
    const route = str(args.route, 100);
    if (!Object.hasOwn(routes, route))
      throw new ApiError(400, "Navigation route is not allowed.");
    const a = { type: "navigate", route, label: routes[route] };
    output.actions.push(a);
    return a;
  }
  if (name === "student_insights" || name === "query_student_records") {
    const requestedIds = ids(args.studentIds, ctx);
    let rows = studentRows(
      ctx,
      requestedIds?.length ? requestedIds : undefined,
    );
    if (args.query !== undefined) {
      const normalize = (v: string) =>
        v
          .normalize("NFKC")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();
      const q = normalize(str(args.query, 200));
      rows = rows.filter((s: Obj) => {
        const fields = normalize(`${s.id} ${s.name} ${s.roll} ${s.className}`);
        return (
          fields.includes(q) ||
          q.split(" ").every((token) => fields.split(" ").includes(token)) ||
          ` ${q} `.includes(` ${normalize(s.name)} `) ||
          ` ${q} `.includes(` ${normalize(s.roll)} `)
        );
      });
    }
    if (args.atRisk !== undefined && typeof args.atRisk !== "boolean")
      throw new ApiError(400, "Invalid atRisk.");
    if (args.atRisk)
      rows = rows.filter(
        (s: Obj) =>
          s.score < 60 || s.attendance < 75 || s.missing > 0 || s.trend < 0,
      );
    const card = {
      kind: "students",
      title: "Student records · browser snapshot",
      rows,
    };
    output.cards.push(card);
    output.actions.push(
      ...rows.slice(0, 100).map((s: Obj) => ({
        type: "student",
        id: s.id,
        label: `Open ${s.name}`,
      })),
    );
    const selected = new Set(rows.map((s: Obj) => s.id));
    const rawSubmissions = ctx.submissions.filter((s: Obj) =>
      selected.has(s.studentId),
    );
    const rawAttendance = ctx.attendance
      .map((a: Obj) => ({
        ...a,
        records: Object.fromEntries(
          Object.entries(a.records ?? {}).filter(([id]) => selected.has(id)),
        ),
      }))
      .filter((a: Obj) => Object.keys(a.records).length);
    const classIds = new Set(
      ctx.students
        .filter((s: Obj) => selected.has(s.id))
        .map((s: Obj) => s.classId),
    );
    const rawAssignments = ctx.assignments.filter((a: Obj) =>
      classIds.has(a.classId),
    );
    return {
      source: "Browser snapshot; sample academic percentages",
      ...(rows.length
        ? {}
        : {
            guidance:
              "No matches for this filter. Search all students without query/studentIds before claiming a student is absent.",
          }),
      ...card,
      rows: rows.slice(0, 100),
      total: rows.length,
      truncated: rows.length > 100,
      ...(rows.length > 100
        ? {
            guidance:
              "Preview shows the first 100 matching students. The complete student card and its export contain all matches. Query individual students or class names for more detail; do not infer unseen values.",
          }
        : {}),
      ...(name === "query_student_records"
        ? {
            submissions: rawSubmissions.slice(0, 100),
            attendance: rawAttendance.slice(0, 100),
            assignments: rawAssignments.slice(0, 100),
            recordTotals: {
              submissions: rawSubmissions.length,
              attendance: rawAttendance.length,
              assignments: rawAssignments.length,
            },
            recordsTruncated:
              rawSubmissions.length > 100 ||
              rawAttendance.length > 100 ||
              rawAssignments.length > 100,
          }
        : {}),
    };
  }
  if (name === "search_dashboard") {
    const q = str(args.query, 200).toLowerCase();
    const found = Object.entries(routes)
      .filter(([id, label]) => `${id} ${label}`.toLowerCase().includes(q))
      .map(([route, label]) => ({ type: "navigate", route, label }));
    output.actions.push(...found);
    const records: Obj[] = [];
    for (const key of [
      "classes",
      "students",
      "assignments",
      "submissions",
      "assessments",
      "materials",
      "announcements",
      "doubts",
      "messages",
      "leaves",
      "tasks",
      "attendance",
    ])
      for (const r of ctx[key])
        if (JSON.stringify(r).toLowerCase().includes(q) && records.length < 60)
          records.push({ collection: key, record: r });
    const matchedStudents = records
      .filter((r) => r.collection === "students")
      .map((r) => r.record);
    output.actions.push(
      ...matchedStudents.map((s) => ({
        type: "student",
        id: s.id,
        label: `Open ${s.name}`,
      })),
    );
    if (matchedStudents.length)
      output.cards.push({
        kind: "students",
        title: "Matching students · browser snapshot",
        rows: studentRows(
          ctx,
          matchedStudents.map((s) => s.id),
        ),
      });
    return {
      routes: found,
      allFeatures: routes,
      records,
      source: "Browser snapshot",
    };
  }
  if (name === "create_lesson") {
    const card = lesson(args);
    output.cards.push(card);
    return card;
  }
  if (name === "youtube_resources") {
    const q = str(args.query, 200);
    let card: Obj = {
      kind: "resources",
      title: "YouTube search links · videos not verified",
      verified: false,
      items: [
        {
          title: `Search YouTube: ${q}`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
          description:
            "Search link only. No video has been watched or summarized.",
        },
      ],
    };
    if (env.YOUTUBE_API_KEY) {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.search = new URLSearchParams({
        key: env.YOUTUBE_API_KEY,
        part: "snippet",
        q,
        type: "video",
        maxResults: "5",
      }).toString();
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error("YouTube search unavailable.");
      const data = (await r.json()) as Obj;
      card = {
        kind: "resources",
        title: "YouTube API search results",
        verified: true,
        items: (data.items ?? [])
          .filter((v: Obj) => /^[\w-]{11}$/.test(v.id?.videoId))
          .map((v: Obj) => ({
            title: String(v.snippet.title).slice(0, 300),
            url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
            description: String(v.snippet.description).slice(0, 500),
          })),
      };
    }
    output.cards.push(card);
    return card;
  }
  throw new ApiError(400, "Unknown tool.");
}
