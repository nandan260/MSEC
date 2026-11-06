import ExcelJS from "exceljs";
import { createRequire } from "node:module";
const PptxGenJS = createRequire(import.meta.url)("pptxgenjs");
import {
  ApiError,
  object,
  snapshot,
  ids,
  studentRows,
  lesson,
  type Obj,
} from "./tools.js";
export async function exportFile(body: unknown) {
  if (!object(body)) throw new ApiError(400, "Invalid export request.");
  const ctx = snapshot(body.context);
  const rows = studentRows(ctx, ids(body.studentIds, ctx));
  if (body.format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MSEC Teacher Desk";
    const ws = wb.addWorksheet("Student snapshot");
    ws.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Roll", key: "roll", width: 20 },
      { header: "Class", key: "className", width: 25 },
      { header: "Saved score (%)", key: "score", width: 20 },
      { header: "Attendance (%)", key: "attendance", width: 20 },
      { header: "Trend", key: "trend", width: 12 },
      { header: "Missing submissions", key: "missing", width: 22 },
    ];
    for (const row of rows) ws.addRow(row);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    const selected = new Set(rows.map((row: Obj) => row.id));
    const grades = wb.addWorksheet("Saved grades");
    grades.addRow([
      "Student",
      "Roll",
      "Assignment",
      "Marks",
      "Maximum marks",
      "Status",
    ]);
    for (const sub of ctx.submissions.filter((v: Obj) =>
      selected.has(v.studentId),
    )) {
      const student = ctx.students.find((v: Obj) => v.id === sub.studentId);
      const assignment = ctx.assignments.find(
        (v: Obj) => v.id === sub.assignmentId,
      );
      grades.addRow([
        student?.name ?? sub.studentId,
        student?.roll ?? "",
        assignment?.title ?? sub.assignmentId,
        sub.marks,
        assignment?.maxMarks ?? null,
        sub.status,
      ]);
    }
    const attendance = wb.addWorksheet("Attendance sessions");
    attendance.addRow(["Date", "Class", "Student", "Roll", "Status"]);
    for (const session of ctx.attendance)
      for (const [studentId, status] of Object.entries(session.records ?? {}))
        if (selected.has(studentId)) {
          const student = ctx.students.find((v: Obj) => v.id === studentId);
          attendance.addRow([
            session.date,
            ctx.classes.find((v: Obj) => v.id === session.classId)?.name ??
              session.classId,
            student?.name ?? studentId,
            student?.roll ?? "",
            status,
          ]);
        }
    for (const sheet of [grades, attendance]) {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column) => (column.width = 24));
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }
    const info = wb.addWorksheet("Source");
    info.addRow([
      "Source",
      "Browser snapshot · saved/sample academic percentages",
    ]);
    return {
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: "student-snapshot.xlsx",
    };
  }
  if (body.format === "pptx") {
    const content = lesson(body.lesson);
    const deck = new PptxGenJS();
    deck.layout = "LAYOUT_WIDE";
    deck.author = "MSEC Teacher Desk";
    deck.subject = content.summary;
    deck.title = content.title;
    deck.theme = {
      headFontFace: "Poppins",
      bodyFontFace: "Inter",
      lang: "en-IN",
    };
    for (const s of content.slides as Obj[]) {
      const slide = deck.addSlide();
      slide.background = { color: "FAF8FC" };
      slide.addText(s.title, {
        x: 0.6,
        y: 0.5,
        w: 12,
        h: 0.7,
        fontSize: 28,
        color: "4E2478",
        bold: true,
        fontFace: "Poppins",
      });
      slide.addText(
        s.bullets.map((b: string) => ({
          text: b,
          options: { bullet: true, breakLine: true },
        })),
        {
          x: 0.8,
          y: 1.6,
          w: 11.5,
          h: 4.8,
          fontSize: 22,
          fontFace: "Inter",
          color: "1A1523",
          paraSpaceAfterPt: 18,
          fit: "shrink",
        },
      );
      slide.addShape(deck.ShapeType.rect, {
        x: 0.6,
        y: 1.3,
        w: 0.8,
        h: 0.05,
        line: { color: "F30137" },
        fill: { color: "F30137" },
      });
      if (s.notes) slide.addNotes(s.notes);
    }
    if (content.diagram?.nodes.length) {
      const slide = deck.addSlide();
      slide.background = { color: "FAF8FC" };
      slide.addText(`${content.title} · Diagram`, {
        x: 0.6,
        y: 0.4,
        w: 12,
        h: 0.7,
        fontSize: 26,
        fontFace: "Poppins",
        color: "4E2478",
        bold: true,
      });
      const nodes = content.diagram.nodes;
      const cols = Math.min(nodes.length, 4);
      const positions = new Map<string, { x: number; y: number }>();
      nodes.forEach((node: Obj, index: number) =>
        positions.set(node.id, {
          x: 0.6 + (index % cols) * 3.1,
          y: 1.6 + Math.floor(index / cols) * 0.95,
        }),
      );
      for (const edge of content.diagram.edges) {
        const from = positions.get(edge.from)!;
        const to = positions.get(edge.to)!;
        const x1 = from.x + 1.3,
          y1 = from.y + 0.25,
          x2 = to.x + 1.3,
          y2 = to.y + 0.25;
        if (x1 !== x2 || y1 !== y2)
          slide.addShape(deck.ShapeType.line, {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.max(0.01, Math.abs(x2 - x1)),
            h: Math.max(0.01, Math.abs(y2 - y1)),
            flipH: x2 < x1,
            flipV: y2 < y1,
            line: {
              color: "F30137",
              width: 1.5,
              beginArrowType: "none",
              endArrowType: "triangle",
            },
          });
      }
      nodes.forEach((node: Obj) => {
        const p = positions.get(node.id)!;
        slide.addText(node.label, {
          x: p.x,
          y: p.y,
          w: 2.6,
          h: 0.6,
          fontFace: "Inter",
          fontSize: 13,
          align: "center",
          color: "4E2478",
          fill: { color: "EEE7F6" },
          line: { color: "4E2478" },
          fit: "shrink",
        });
      });
    }
    return {
      buffer: (await deck.write({ outputType: "nodebuffer" })) as Buffer,
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      name: "lesson.pptx",
    };
  }
  throw new ApiError(400, "Export format must be xlsx or pptx.");
}
