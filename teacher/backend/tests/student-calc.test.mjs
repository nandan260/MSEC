import test from "node:test";
import assert from "node:assert/strict";
import { attendancePlan, sgpaTarget } from "../dist/student-calc.js";
const row = (attended, total) => [
  { course_code: "CS603", course_title: "Compiler Design", attended, total },
];
test("33/46 needs 6 more", () => {
  const result = attendancePlan(row(33, 46), "CS603");
  assert.equal(result.mustAttend, 6);
  assert.equal(result.canSkip, 0);
  assert.equal(result.percent, 71.7);
});
test("exactly 75% can skip 0", () => {
  assert.equal(attendancePlan(row(30, 40), "CS603").canSkip, 0);
  assert.equal(attendancePlan(row(30, 40), "CS603").mustAttend, 0);
});
test("above threshold", () =>
  assert.equal(attendancePlan(row(46, 50), "CS603").canSkip, 11));
test("zero classes held", () => {
  const result = attendancePlan(row(0, 0), "CS603");
  assert.deepEqual(
    [result.percent, result.canSkip, result.mustAttend],
    [0, 0, 0],
  );
});
test("matches course by title or code case-insensitively", () => {
  for (const course of ["compiler design", "cs603"])
    assert.equal(attendancePlan(row(33, 46), course).course_code, "CS603");
  assert.throws(() => attendancePlan(row(33, 46), "unknown"), {
    status: 400,
    message: "Unknown course.",
  });
});
const courses = [4, 4, 3, 3].map((credits, i) => ({
  course_code: `CS${i}`,
  credits,
}));
test("sgpa target unreachable above 10", () =>
  assert.equal(sgpaTarget(courses, 10.5).reachable, false));
test("sgpa target average", () =>
  assert.equal(sgpaTarget(courses, 9.5).requiredAverageGradePoint, 9.5));
