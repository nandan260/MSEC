import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import { ApiError, object } from "./tools.js";
import { validateCard } from "./student-tools.js";
const PptxGenJS = createRequire(import.meta.url)("pptxgenjs");

export async function studentExport(body: unknown) {
  if (!object(body) || !["pptx", "pdf"].includes(body.format))
    throw new ApiError(400, "Export format must be pptx or pdf.");
  const card = validateCard(body.card);
  if (!["study", "report"].includes(card.kind))
    throw new ApiError(400, "Only study and report cards can be exported.");
  if (card.kind === "report" && body.format === "pptx")
    throw new ApiError(400, "Reports export as PDF.");
  const name =
    (card.title.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) ||
      "student-export") + `.${body.format}`;
  if (body.format === "pdf") {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: { Title: card.title, Author: "MSEC Student Assistant" },
    });
    const chunks: Buffer[] = [];
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    const heading = (text: string) => {
      doc
        .moveDown(0.5)
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#4E2478")
        .text(text);
    };
    const text = (value: string) => {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#1A1523")
        .text(value, { lineGap: 4 });
    };
    heading(card.title);
    if (card.kind === "study") {
      text(card.summary);
      for (const section of card.sections) {
        heading(section.title);
        text(section.body);
      }
      for (const slide of card.slides) {
        heading(slide.title);
        for (const bullet of slide.bullets) text(`• ${bullet}`);
        if (slide.notes) text(slide.notes);
      }
      for (const quiz of card.quiz || []) {
        heading(quiz.question);
        text(quiz.answer);
      }
    } else {
      for (const [index, row] of card.rows.entries()) {
        heading(`Record ${index + 1}`);
        for (const column of card.columns) text(`${column}: ${row[column]}`);
      }
      if (!card.rows.length) text("No records supplied.");
    }
    doc.end();
    return { buffer: await complete, mime: "application/pdf", name };
  }
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_WIDE";
  deck.title = card.title;
  deck.author = "MSEC Student Assistant";
  const addSlide = (title: string, bullets: string[], notes?: string) => {
    const slide = deck.addSlide();
    slide.background = { color: "FAF8FC" };
    slide.addText(title, {
      x: 0.6,
      y: 0.5,
      w: 12,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: "4E2478",
      fit: "shrink",
    });
    slide.addText(bullets.join("\n"), {
      x: 0.8,
      y: 1.6,
      w: 11.6,
      h: 5.1,
      fontSize: 20,
      color: "1A1523",
      breakLine: false,
      fit: "shrink",
    });
    if (notes) slide.addNotes(notes);
  };
  if (card.kind === "study") {
    addSlide(card.title, [card.summary]);
    for (const section of card.sections)
      addSlide(section.title, [section.body]);
    for (const slide of card.slides)
      addSlide(slide.title, slide.bullets, slide.notes);
    for (const quiz of card.quiz || []) addSlide(quiz.question, [quiz.answer]);
  }

  return {
    buffer: (await deck.write({ outputType: "nodebuffer" })) as Buffer,
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    name,
  };
}
