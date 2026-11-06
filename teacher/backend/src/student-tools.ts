import { ApiError, object, str, lesson, type Obj } from "./tools.js";
import { extractText } from "unpdf";
import { attendancePlan, sgpaTarget } from "./student-calc.js";
import { boundedText } from "./agent.js";

// Keep in sync with student/frontend/src/nav.js (excluding More).
export const screens: Record<string, { label: string; description: string }> = {
  dashboard: {
    label: "Dashboard",
    description: "Daily overview and academic summary.",
  },
  academics: {
    label: "Academic Performance",
    description: "Subject marks and academic progress.",
  },
  attendance: {
    label: "Attendance",
    description: "Subject attendance records and percentages.",
  },
  attendance_calc: {
    label: "Attendance Calculator",
    description: "Estimate classes needed for attendance targets.",
  },
  timetable: { label: "Timetable", description: "Weekly class schedule." },
  assignments: {
    label: "Assignments",
    description: "Assignment deadlines and submissions.",
  },
  notes: {
    label: "Notes & Study Materials",
    description: "Find subject notes and learning materials.",
  },
  examinations: {
    label: "Examinations",
    description: "Exam dates and examination details.",
  },
  gpa_calc: {
    label: "SGPA & CGPA Calculator",
    description: "Calculate GPA and view GPA history.",
  },
  profile: {
    label: "Student Profile",
    description: "Personal and academic profile.",
  },
  placements: {
    label: "Placement & Career",
    description: "Career opportunities and placement applications.",
  },
  projects: {
    label: "Projects Hub",
    description: "Browse and manage student projects.",
  },
  events: {
    label: "Events & Clubs",
    description: "Campus events, clubs and registrations.",
  },
  library: {
    label: "Library",
    description: "Library books and current loans.",
  },
  services: {
    label: "Campus Services",
    description: "Campus facilities and services.",
  },
  notifications: {
    label: "Notifications",
    description: "Announcements and personal notifications.",
  },
  analytics: {
    label: "Performance Analytics",
    description: "Academic trends and insights.",
  },
  doubts: {
    label: "Faculty Doubt Portal",
    description: "Ask faculty questions and view replies.",
  },
  faculty_mentor: {
    label: "Faculty Mentor",
    description: "Assigned mentor and contact details.",
  },
  fees: {
    label: "Fees Management",
    description: "Student fees and payment details.",
  },
  assistant: {
    label: "Ask AI",
    description: "Chat, study explanations and downloadable reports.",
  },
};
export const endpoints = {
  dashboard_summary: "/dashboard/summary",
  timetable: "/timetable",
  examinations: "/examinations",
  assignments: "/assignments",
  notes: "/notes",
  academic_performance: "/academics/performance",
  attendance: "/attendance",
  gpa_history: "/gpa/history",
  analytics: "/analytics",
  notifications: "/notifications",
  event_registrations: "/events/my-registrations",
  library_books: "/library/my-books",
  services: "/services",
  placement_applications: "/placements/applications",
  fee_details: "/fees/student-details",
  mentor: "/mentor/my-mentor",
  doubts: "/doubts",
  profile: "/auth/me",
} as const;
export const cardContract = `show_card requires {card: stat|list|study|report}. Stat: {kind:'stat',title,label,value:number,unit:'%'|'',threshold?:number,note?:string}. List: {kind:'list',title,items:[{primary,secondary?,meta?}]} (at most 50 items). Study: {kind:'study',title,summary,sections:[{title,body}],slides:[{title,bullets:string[],notes?:string}],quiz?:[{question,answer}],source:'notes'|'general'}. Report: {kind:'report',title,report:'attendance'|'exams'|'timetable'|'marks'|'assignments',rows:Record<string,string|number>[],columns:string[]}. Report rows must come from fetched records. Include at least one study slide. Study cards export as PPTX or PDF; reports export as PDF only.`;
export function validateCard(value: unknown): Obj {
  if (!object(value)) throw new ApiError(400, "Invalid card.");
  if (JSON.stringify(value).length > 250000)
    throw new ApiError(400, "Card too large.");
  if (value.kind === "stat") {
    if (
      typeof value.value !== "number" ||
      !Number.isFinite(value.value) ||
      !["%", ""].includes(value.unit)
    )
      throw new ApiError(400, "Invalid stat value or unit.");
    const card: Obj = {
      kind: "stat",
      title: str(value.title, 200),
      label: str(value.label, 200),
      value:
        value.unit === "%"
          ? Math.min(100, Math.max(0, value.value))
          : value.value,
      unit: value.unit,
    };
    if (value.threshold !== undefined) {
      if (
        typeof value.threshold !== "number" ||
        !Number.isFinite(value.threshold) ||
        (value.unit === "%" && (value.threshold < 0 || value.threshold > 100))
      )
        throw new ApiError(400, "Invalid stat threshold.");
      card.threshold = value.threshold;
    }
    if (value.note !== undefined) card.note = str(value.note, 2000);
    return card;
  }
  if (value.kind === "list") {
    if (!Array.isArray(value.items) || value.items.length > 50)
      throw new ApiError(400, "Lists support at most 50 items.");
    return {
      kind: "list",
      title: str(value.title, 200),
      items: value.items.map((item: unknown) => {
        if (!object(item)) throw new ApiError(400, "Invalid list item.");
        const row: Obj = { primary: str(item.primary, 2000) };
        for (const key of ["secondary", "meta"])
          if (item[key] !== undefined) row[key] = str(item[key], 2000);
        return row;
      }),
    };
  }
  if (value.kind === "study") {
    if (!["notes", "general"].includes(value.source))
      throw new ApiError(400, "Study source must be notes or general.");
    const { diagram: _diagram, ...validated } = lesson(value);
    return { ...validated, kind: "study", source: value.source };
  }
  if (
    value.kind !== "report" ||
    !["attendance", "exams", "timetable", "marks", "assignments"].includes(
      value.report,
    )
  )
    throw new ApiError(400, "Invalid report kind.");
  if (
    !Array.isArray(value.columns) ||
    !value.columns.length ||
    value.columns.length > 12 ||
    !Array.isArray(value.rows) ||
    value.rows.length > 200
  )
    throw new ApiError(
      400,
      "Reports require 1–12 columns and at most 200 rows.",
    );
  const columns = value.columns.map((c: unknown) => str(c, 100));
  if (
    new Set(columns).size !== columns.length ||
    columns.some(
      (c: string) =>
        !c || ["__proto__", "constructor", "prototype"].includes(c),
    )
  )
    throw new ApiError(400, "Invalid report columns.");
  const rows = value.rows.map((row: unknown) => {
    if (!object(row) || Object.keys(row).some((k) => !columns.includes(k)))
      throw new ApiError(400, "Invalid report row.");
    return Object.fromEntries(
      columns.map((key: string) => {
        const cell = row[key];
        if (typeof cell === "number" && Number.isFinite(cell))
          return [key, cell];
        return [key, str(cell, 2000)];
      }),
    );
  });
  return {
    kind: "report",
    title: str(value.title, 200),
    report: value.report,
    columns,
    rows,
  };
}
const schema = (properties: Obj, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "read_note",
      description:
        "Read PDF note text, capped at 30000 characters. No extractable text means no summary is possible.",
      parameters: schema({ id: { type: "integer", minimum: 1 } }, ["id"]),
    },
  },
  {
    type: "function",
    function: {
      name: "attendance_plan",
      description:
        "Calculate attendance using course code or title, including on-duty credit.",
      parameters: schema(
        { course: { type: "string" }, threshold: { type: "number" } },
        ["course"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "sgpa_target",
      description:
        "Calculate the required average grade point from current course credits.",
      parameters: schema({ target: { type: "number" } }, ["target"]),
    },
  },
  ...Object.entries(endpoints).map(([name, path]) => ({
    type: "function",
    function: {
      name: `get_${name}`,
      description: `Read student records from ${path}. Results may be truncated to 100 array items.`,
      parameters: schema({}),
    },
  })),
  {
    type: "function",
    function: {
      name: "navigate",
      description: `Suggest an app screen: ${JSON.stringify(screens)}`,
      parameters: schema(
        { screen: { type: "string", enum: Object.keys(screens) } },
        ["screen"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "show_card",
      description: cardContract,
      parameters: schema(
        {
          card: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: ["stat", "list", "study", "report"],
              },
              title: { type: "string" },
              label: { type: "string" },
              value: { type: "number" },
              unit: { type: "string", enum: ["%", ""] },
              threshold: { type: "number" },
              note: { type: "string" },
              items: {
                type: "array",
                maxItems: 50,
                items: {
                  type: "object",
                  properties: {
                    primary: { type: "string" },
                    secondary: { type: "string" },
                    meta: { type: "string" },
                  },
                  required: ["primary"],
                },
              },
              source: { type: "string", enum: ["notes", "general"] },
              summary: { type: "string" },
              sections: { type: "array", items: { type: "object" } },
              slides: { type: "array", items: { type: "object" } },
              quiz: { type: "array", items: { type: "object" } },
              report: {
                type: "string",
                enum: [
                  "attendance",
                  "exams",
                  "timetable",
                  "marks",
                  "assignments",
                ],
              },
              rows: { type: "array", items: { type: "object" } },
              columns: { type: "array", items: { type: "string" } },
            },
            required: ["kind", "title"],
          },
        },
        ["card"],
      ),
    },
  },
];
function trim(value: unknown, depth = 0): unknown {
  if (depth > 12) return "[depth limit]";
  if (Array.isArray(value))
    return value.slice(0, 100).map((v) => trim(v, depth + 1));
  if (object(value))
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, trim(v, depth + 1)]),
    );
  return typeof value === "string" ? value.slice(0, 6000) : value;
}
export async function runTool(
  name: string,
  args: unknown,
  env: NodeJS.ProcessEnv,
  authorization: string | undefined,
  output: Obj,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!object(args))
    throw new ApiError(400, "Tool arguments must be an object.");
  if (name === "navigate") {
    if (typeof args.screen !== "string" || !Object.hasOwn(screens, args.screen))
      throw new ApiError(400, "Unknown screen.");
    const action = {
      type: "navigate",
      screen: args.screen,
      label: screens[args.screen].label,
    };
    output.actions.push(action);
    return action;
  }
  if (name === "show_card") {
    try {
      const card = validateCard(args.card);
      output.cards.push(card);
      return card;
    } catch {
      const error = "Dropped an invalid card.";
      (output.warnings ??= []).push(error);
      return { error };
    }
  }
  if (name === "read_note") {
    if (
      !Number.isSafeInteger(args.id) ||
      args.id <= 0 ||
      Object.keys(args).some((k) => k !== "id")
    )
      throw new ApiError(400, "Note id must be a positive integer.");
    const title = `Note ${args.id}`;
    try {
      const response = await studentGet(
        `/notes/${args.id}/download`,
        env,
        authorization,
        signal,
      );
      // Bound the binary response before passing it to the PDF parser.
      const reader = response.body?.getReader();
      const parts: Uint8Array[] = [];
      let size = 0;
      if (Number(response.headers.get("content-length")) > 10_000_000)
        throw new Error("PDF too large");
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 10_000_000) {
            await reader.cancel();
            throw new Error("PDF too large");
          }
          parts.push(value);
        }
      let text = "";
      try {
        const extracted = await extractText(
          new Uint8Array(Buffer.concat(parts)),
          { mergePages: true },
        );
        text = extracted.text;
      } catch {
        /* Seeded notes may contain stub PDF bytes without a text layer. */
      }
      if (!text.trim())
        return {
          id: args.id,
          title,
          text: "",
          note: "No extractable text in this file.",
        };
      return {
        id: args.id,
        title,
        text: text.slice(0, 30000),
        truncated: text.length > 30000,
      };
    } catch {
      return toolFailure("note", output);
    }
  }
  if (name === "attendance_plan" || name === "sgpa_target") {
    const attendance = name === "attendance_plan";
    const fetched = (await runTool(
      attendance ? "get_attendance" : "get_academic_performance",
      {},
      env,
      authorization,
      output,
      signal,
    )) as Obj;
    if (fetched.error) return fetched;
    const data = fetched.data;
    try {
      if (attendance) {
        if (!Array.isArray(data?.attendance))
          throw new ApiError(502, "Invalid attendance records.");
        const result = attendancePlan(
          data.attendance.map((r: Obj) => ({
            course_code: r.course_code,
            course_title: r.course_title,
            attended: r.attended_hours + (r.od_hours ?? 0),
            total: r.total_hours,
          })),
          args.course,
          args.threshold,
        );
        return {
          ...result,
          card: {
            kind: "stat",
            title: result.course_title,
            label: result.course_code,
            value: result.percent,
            unit: "%",
            threshold: args.threshold ?? 75,
          },
        };
      }
      if (!Array.isArray(data?.marks))
        throw new ApiError(502, "Invalid course credits.");
      const result = sgpaTarget(
        data.marks.map((r: Obj) => ({
          course_code: r.course_code,
          credits: r.credits,
        })),
        args.target,
      );
      return {
        ...result,
        card: {
          kind: "stat",
          title: "SGPA target",
          label: "Required average grade point",
          value: result.requiredAverageGradePoint,
          unit: "",
        },
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) throw err;
      return toolFailure(
        attendance ? "attendance" : "academic performance",
        output,
      );
    }
  }
  const key = name.startsWith("get_") ? name.slice(4) : "";
  if (!Object.hasOwn(endpoints, key))
    throw new ApiError(400, "Unknown student tool.");
  if (Object.keys(args).length)
    throw new ApiError(400, "Record tools take no arguments.");
  const path = endpoints[key as keyof typeof endpoints];
  try {
    const response = await studentGet(path, env, authorization, signal);
    return {
      data: trim(JSON.parse(await boundedText(response, 2_000_000))),
      limits:
        "Arrays limited to first 100 items; text limited to 6000 characters. Do not assume these are complete records.",
    };
  } catch {
    return toolFailure(key.replace(/_/g, " "), output);
  }
}
function toolFailure(label: string, output: Obj) {
  const error = `Could not load ${label}.`;
  (output.warnings ??= []).push(error);
  return { error };
}
async function studentGet(
  path: string,
  env: NodeJS.ProcessEnv,
  authorization?: string,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${(env.STUDENT_API_BASE || "http://127.0.0.1:5000/api").replace(/\/$/, "")}${path}`,
    {
      method: "GET",
      redirect: "error",
      headers: authorization ? { Authorization: authorization } : {},
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new ApiError(502, `Student API returned HTTP ${response.status}.`);
  return response;
}
