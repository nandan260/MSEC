import { ApiError } from "./tools.js";

type Attendance = {
  course_code: string;
  course_title: string;
  attended: number;
  total: number;
};
export function attendancePlan(
  rows: Attendance[],
  course: string,
  threshold = 75,
) {
  if (
    typeof course !== "string" ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    threshold >= 100
  )
    throw new ApiError(400, "Supply a course and threshold between 0 and 100.");
  const query = course.trim().toLowerCase();
  const row = rows.find(
    (r) =>
      r.course_code.toLowerCase() === query ||
      r.course_title.toLowerCase() === query,
  );
  if (!row) throw new ApiError(400, "Unknown course.");
  const { attended: a, total: t } = row;
  if (![a, t].every(Number.isFinite) || a < 0 || t < a)
    throw new ApiError(502, "Invalid attendance records.");
  const ratio = threshold / 100;
  return {
    ...row,
    percent: t ? Math.round((a / t) * 1000) / 10 : 0,
    canSkip: t ? Math.max(0, Math.floor(a / ratio - t + 1e-10)) : 0,
    mustAttend: t
      ? Math.max(0, Math.ceil((ratio * t - a) / (1 - ratio) - 1e-10))
      : 0,
  };
}
export function sgpaTarget(
  courses: { course_code: string; credits: number }[],
  target: number,
) {
  if (!Number.isFinite(target) || target < 0)
    throw new ApiError(400, "Invalid SGPA target.");
  if (
    !courses.length ||
    courses.some((c) => !Number.isFinite(c.credits) || c.credits <= 0)
  )
    throw new ApiError(502, "Invalid course credits.");
  return {
    reachable: target <= 10,
    requiredAverageGradePoint: target,
    maxGradePoint: 10 as const,
  };
}
