import { ApiError, object, str, lesson, type Obj } from "./tools.js";
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
export const cardContract = `make_export requires {card: study|report}. Study: {kind:'study',title,summary,sections:[{title,body}],slides:[{title,bullets:string[],notes?:string}],quiz?:[{question,answer}]}. Report: {kind:'report',title,report:'attendance'|'exams'|'timetable'|'marks'|'assignments',rows:Record<string,string|number>[],columns:string[]}. Report rows must come from fetched records. Include at least one study slide.`;
export function validateCard(value: unknown): Obj {
  if (!object(value)) throw new ApiError(400, "Invalid card.");
  if (JSON.stringify(value).length > 250000)
    throw new ApiError(400, "Card too large.");
  if (value.kind === "study") {
    const { diagram: _diagram, ...validated } = lesson(value);
    return { ...validated, kind: "study" };
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
      name: "make_export",
      description: cardContract,
      parameters: schema(
        {
          card: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["study", "report"] },
              title: { type: "string" },
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
  if (name === "make_export") {
    const card = validateCard(args.card);
    output.cards.push(card);
    return card;
  }
  const key = name.startsWith("get_") ? name.slice(4) : "";
  if (!Object.hasOwn(endpoints, key))
    throw new ApiError(400, "Unknown student tool.");
  if (Object.keys(args).length)
    throw new ApiError(400, "Record tools take no arguments.");
  const path = endpoints[key as keyof typeof endpoints];
  try {
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
    return {
      data: trim(JSON.parse(await boundedText(response, 2_000_000))),
      limits:
        "Arrays limited to first 100 items; text limited to 6000 characters. Do not assume these are complete records.",
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      502,
      "Student API unavailable, timed out, or returned invalid JSON.",
    );
  }
}
