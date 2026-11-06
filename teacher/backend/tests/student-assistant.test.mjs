import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import PDFDocument from "pdfkit";
import JSZip from "jszip";
import { createServer } from "../dist/index.js";
import { STUDENT_BEARER } from "./_auth.mjs";
import {
  runTool,
  screens,
  endpoints,
  validateCard,
} from "../dist/student-tools.js";

async function serve(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
const request = {
  messages: [{ role: "user", content: "Help me" }],
  currentScreen: "assistant",
};
const study = {
  kind: "study",
  source: "general",
  title: "Paxos",
  summary: "General study explanation",
  sections: [{ title: "Consensus", body: "Agreement among nodes" }],
  slides: [
    {
      title: "Agreement",
      bullets: ["A majority agrees"],
      notes: "General knowledge",
    },
  ],
  quiz: [{ question: "Why a majority?", answer: "Quorums intersect" }],
};
const report = {
  kind: "report",
  title: "Attendance",
  report: "attendance",
  columns: ["Subject", "Percentage"],
  rows: [{ Subject: "CS602", Percentage: 88 }],
};
const post = (base, path, body, authorization) =>
  fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authorization ?? STUDENT_BEARER,
    },
    body: JSON.stringify(body),
  });

test("student validation, status and model configuration errors", async () => {
  const server = createServer({});
  const base = await serve(server);
  try {
    assert.deepEqual(
      await (await fetch(base + "/student-assistant/status")).json(),
      { configured: false, model: "" },
    );
    for (const body of [
      null,
      {},
      { ...request, messages: [] },
      { ...request, messages: Array(31).fill(request.messages[0]) },
      { ...request, messages: [{ role: "system", content: "x" }] },
      { ...request, messages: [{ role: "assistant", content: "x" }] },
      { ...request, messages: [null] },
      { ...request, messages: [{ role: "user", content: "x".repeat(30001) }] },
      ...["more", "__proto__", "constructor", "missing"].map(
        (currentScreen) => ({ ...request, currentScreen }),
      ),
    ]) {
      assert.equal(
        (await post(base, "/student-assistant/chat", body)).status,
        400,
      );
    }
    assert.equal(
      (await post(base, "/student-assistant/chat", request)).status,
      503,
    );
  } finally {
    server.close();
  }
});

test("fixed GET tools forward authorization, bound records, reject arbitrary paths and screen names", async () => {
  const seen = [];
  const flask = http.createServer((req, res) => {
    seen.push([req.method, req.url, req.headers.authorization]);
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        rows: Array.from({ length: 150 }, (_, i) => ({ id: i })),
      }),
    );
  });
  const base = await serve(flask);
  const out = { cards: [], actions: [] };
  try {
    for (const [key, path] of Object.entries(endpoints)) {
      const data = await runTool(
        `get_${key}`,
        {},
        { STUDENT_API_BASE: base + "/api" },
        "Bearer student-token",
        out,
      );
      assert.equal(data.data.rows.length, 100);
      assert.deepEqual(seen.at(-1), [
        "GET",
        "/api" + path,
        "Bearer student-token",
      ]);
    }
    const count = seen.length;
    for (const name of [
      "fetch",
      "get_/admin",
      "get___proto__",
      "get_constructor",
      "/auth/me",
    ])
      await assert.rejects(
        runTool(name, {}, { STUDENT_API_BASE: base }, undefined, out),
      );
    await assert.rejects(
      runTool(
        "get_profile",
        { path: "/admin" },
        { STUDENT_API_BASE: base },
        undefined,
        out,
      ),
    );
    assert.equal(seen.length, count);
    for (const screen of ["more", "__proto__", "javascript:alert(1)"])
      await assert.rejects(runTool("navigate", { screen }, {}, undefined, out));
    const { SCREENS } = await import("../../../student/frontend/src/nav.js");
    assert.deepEqual(
      Object.keys(screens).sort(),
      Object.keys(SCREENS)
        .filter((k) => k !== "more")
        .sort(),
    );
  } finally {
    flask.close();
  }
});

test("student model loop grounds results in Flask, returns navigation and export card", async () => {
  let calls = 0;
  const flask = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, STUDENT_BEARER);
    res.end(JSON.stringify({ subject: "CS602", percentage: 88 }));
  });
  const fb = await serve(flask);
  const model = http.createServer(async (req, res) => {
    let raw = "";
    for await (const part of req) raw += part;
    const body = JSON.parse(raw);
    calls++;
    assert.match(body.messages[0].content, /Never invent timetable/);
    if (calls === 2)
      assert.match(
        body.messages.find((m) => m.role === "tool").content,
        /CS602/,
      );
    const tool = (name, args) => ({
      id: name,
      type: "function",
      function: { name, arguments: JSON.stringify(args) },
    });
    res.end(
      JSON.stringify({
        choices: [
          {
            message:
              calls === 1
                ? {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      tool("get_attendance", {}),
                      tool("navigate", { screen: "attendance" }),
                      tool("show_card", { card: report }),
                    ],
                  }
                : { role: "assistant", content: "CS602 attendance is 88%." },
          },
        ],
      }),
    );
  });
  const mb = await serve(model);
  const server = createServer({
    AI_MODEL: "fake",
    AI_BASE_URL: mb,
    STUDENT_API_BASE: fb,
  });
  const base = await serve(server);
  try {
    const response = await post(
      base,
      "/student-assistant/chat",
      request,
      STUDENT_BEARER,
    );
    assert.equal(response.status, 200);
    const out = await response.json();
    assert.equal(out.message, "CS602 attendance is 88%.");
    assert.deepEqual(out.actions, [
      { type: "navigate", screen: "attendance", label: "Attendance" },
    ]);
    assert.deepEqual(out.cards, [report]);
    assert.deepEqual(out.trace, ["get_attendance", "navigate", "show_card"]);
    assert.deepEqual(out.warnings, []);
    assert.equal(calls, 2);
  } finally {
    server.close();
    model.close();
    flask.close();
  }
});

test("tool error surfaces as warning not invented data", async () => {
  for (const mode of ["http", "json", "redirect", "connection"]) {
    const flask = http.createServer((req, res) => {
      if (mode === "http") res.writeHead(500);
      if (mode === "redirect") res.writeHead(302, { location: "/admin" });
      res.end("invalid");
    });
    const fb = await serve(flask);
    const model = http.createServer(async (req, res) => {
      let raw = "";
      for await (const part of req) raw += part;
      const body = JSON.parse(raw);
      const result = body.messages.find((m) => m.role === "tool");
      if (result)
        assert.deepEqual(JSON.parse(result.content), {
          error: "Could not load attendance.",
        });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: result
                ? { role: "assistant", content: "Could not load attendance." }
                : {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: "1",
                        type: "function",
                        function: { name: "get_attendance", arguments: "{}" },
                      },
                    ],
                  },
            },
          ],
        }),
      );
    });
    const mb = await serve(model);
    const server = createServer({
      AI_MODEL: "fake",
      AI_BASE_URL: mb,
      STUDENT_API_BASE: mode === "connection" ? "http://127.0.0.1:1" : fb,
    });
    const base = await serve(server);
    try {
      const response = await post(base, "/student-assistant/chat", request);
      assert.equal(response.status, 200);
      const out = await response.json();
      assert.deepEqual(out.warnings, ["Could not load attendance."]);
      assert.equal(out.message, "Could not load attendance.");
      assert.deepEqual(out.cards, []);
    } finally {
      server.close();
      model.close();
      flask.close();
    }
  }
});

async function pdfBytes(text) {
  const doc = new PDFDocument();
  const parts = [];
  const done = new Promise((resolve, reject) => {
    doc.on("data", (part) => parts.push(part));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.on("error", reject);
  });
  doc.fontSize(12).text(text);
  doc.end();
  return done;
}
for (const [name, text] of [
  ["read_note extracts text", "Paxos uses ballots"],
  ["read_note caps at 30000 chars", "Paxos uses ballots. ".repeat(2000)],
  ["read_note no text", null],
]) {
  test(name, async () => {
    const bytes =
      text === null
        ? Buffer.from("%PDF-1.4\nDistributed Systems Academic Notes.\n")
        : await pdfBytes(text);
    const seen = [];
    const flask = http.createServer((req, res) => {
      seen.push([req.method, req.url, req.headers.authorization]);
      if (req.url === "/api/notes")
        res.end(
          JSON.stringify({ notes: [{ id: 7, title: "Distributed Systems" }] }),
        );
      else {
        res.setHeader("content-type", "application/pdf");
        res.end(bytes);
      }
    });
    const base = await serve(flask);
    try {
      const out = { cards: [], actions: [], warnings: [] };
      const result = await runTool(
        "read_note",
        { id: 7 },
        { STUDENT_API_BASE: base + "/api" },
        STUDENT_BEARER,
        out,
      );
      assert.equal(result.id, 7);
      assert.equal(typeof result.title, "string");
      assert.ok(result.title.length);
      assert.ok(seen.some((r) => r[1] === "/api/notes/7/download"));
      assert.ok(seen.every((r) => r[0] === "GET" && r[2] === STUDENT_BEARER));
      if (text === null) {
        assert.equal(result.text, "");
        assert.equal(result.note, "No extractable text in this file.");
      } else {
        assert.match(result.text, /Paxos uses ballots/);
        assert.equal(result.truncated, text.length > 30000);
        assert.ok(result.text.length <= 30000);
      }
    } finally {
      flask.close();
    }
  });
}
test("read_note rejects non-integer id", async () => {
  for (const id of [1.5, "7", "../admin", null, -1, 0])
    await assert.rejects(
      runTool("read_note", { id }, {}, undefined, { warnings: [] }),
      { status: 400 },
    );
});

test("study and report exports produce real PPTX and PDF files; invalid cards are rejected", async () => {
  const server = createServer({});
  const base = await serve(server);
  try {
    for (const card of [study, report])
      for (const format of card.kind === "report" ? ["pdf"] : ["pptx", "pdf"]) {
        const response = await post(base, "/student-assistant/export", {
          card,
          format,
        });
        assert.equal(response.status, 200);
        assert.match(
          response.headers.get("content-disposition"),
          new RegExp(`\\.${format}"$`),
        );
        const data = Buffer.from(await response.arrayBuffer());
        if (format === "pptx") {
          assert.match(response.headers.get("content-type"), /presentationml/);
          const zip = await JSZip.loadAsync(data);
          assert.ok(zip.file("ppt/presentation.xml"));
          const xml = await zip.file("ppt/slides/slide1.xml").async("string");
          assert.ok(xml.includes(card.title));
        } else {
          assert.equal(response.headers.get("content-type"), "application/pdf");
          assert.equal(data.subarray(0, 5).toString(), "%PDF-");
          assert.match(data.toString(), /%%EOF/);
        }
      }
    for (const body of [
      { format: "xlsx", card: study },
      { format: "pdf", card: null },
      { format: "pdf", card: { ...study, slides: [] } },
      { format: "pdf", card: { ...study, sections: [null] } },
      {
        format: "pdf",
        card: { ...report, rows: Array(201).fill(report.rows[0]) },
      },
      {
        format: "pdf",
        card: { ...report, rows: [{ Subject: {}, Percentage: 88 }] },
      },
      { format: "pdf", card: { ...report, columns: ["__proto__"] } },
    ])
      assert.equal(
        (await post(base, "/student-assistant/export", body)).status,
        400,
      );
  } finally {
    server.close();
  }
});

test("stat card validated", () => {
  for (const [value, expected] of [
    [120, 100],
    [-10, 0],
    [71.7, 71.7],
  ])
    assert.deepEqual(
      validateCard({
        kind: "stat",
        title: "Attendance",
        label: "CS603",
        value,
        unit: "%",
        threshold: 75,
        note: "On-duty included",
      }),
      {
        kind: "stat",
        title: "Attendance",
        label: "CS603",
        value: expected,
        unit: "%",
        threshold: 75,
        note: "On-duty included",
      },
    );
  for (const value of [null, "75", NaN, Infinity])
    assert.throws(
      () =>
        validateCard({
          kind: "stat",
          title: "Attendance",
          label: "CS603",
          value,
          unit: "%",
        }),
      { status: 400 },
    );
});
test("list card max 50 items", () => {
  const card = {
    kind: "list",
    title: "Exams",
    items: Array(50).fill({
      primary: "CS603",
      secondary: "Tomorrow",
      meta: "9 AM",
    }),
  };
  assert.deepEqual(validateCard(card), card);
  assert.throws(
    () => validateCard({ ...card, items: Array(51).fill(card.items[0]) }),
    { status: 400 },
  );
});
test("study card requires source", () => {
  const { source, ...missing } = study;
  assert.throws(() => validateCard(missing), { status: 400 });
  assert.throws(() => validateCard({ ...study, source: "invented" }), {
    status: 400,
  });
  assert.equal(validateCard({ ...study, source: "notes" }).source, "notes");
});
test("invalid card dropped with warning", async () => {
  let calls = 0;
  const model = http.createServer((req, res) => {
    req.resume();
    res.end(
      JSON.stringify({
        choices: [
          {
            message:
              ++calls === 1
                ? {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: "bad",
                        type: "function",
                        function: {
                          name: "show_card",
                          arguments: JSON.stringify({
                            card: { kind: "chart" },
                          }),
                        },
                      },
                    ],
                  }
                : { role: "assistant", content: "Here is your explanation." },
          },
        ],
      }),
    );
  });
  const mb = await serve(model);
  const server = createServer({ AI_MODEL: "fake", AI_BASE_URL: mb });
  const base = await serve(server);
  try {
    const response = await post(base, "/student-assistant/chat", request);
    assert.equal(response.status, 200);
    const out = await response.json();
    assert.deepEqual(out.cards, []);
    assert.deepEqual(out.warnings, ["Dropped an invalid card."]);
    assert.equal(out.message, "Here is your explanation.");
  } finally {
    server.close();
    model.close();
  }
});
for (const batchSize of [1, 3, 8])
  test(`tool budget 8 (batch size ${batchSize})`, async () => {
    let reads = 0,
      calls = 0;
    const flask = http.createServer((req, res) => {
      reads++;
      res.end(JSON.stringify({ attendance: [] }));
    });
    const fb = await serve(flask);
    const model = http.createServer((req, res) => {
      req.resume();
      calls++;
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: Array.from({ length: batchSize }, (_, i) => ({
                  id: `${calls}-${i}`,
                  type: "function",
                  function: { name: "get_attendance", arguments: "{}" },
                })),
              },
            },
          ],
        }),
      );
    });
    const mb = await serve(model);
    const server = createServer({
      AI_MODEL: "fake",
      AI_BASE_URL: mb,
      STUDENT_API_BASE: fb,
    });
    const base = await serve(server);
    try {
      const response = await post(base, "/student-assistant/chat", request);
      assert.equal(response.status, 200);
      const out = await response.json();
      assert.equal(reads, 8);
      assert.equal(out.trace.length, 8);
      assert.ok(out.warnings.some((w) => /tool budget/i.test(w)));
      assert.ok(out.message.length);
    } finally {
      server.close();
      model.close();
      flask.close();
    }
  });
test("status reports configured false without AI_MODEL", async () => {
  const server = createServer({
    AI_BASE_URL: "http://localhost:20128/v1",
    AI_API_KEY: "test",
  });
  const base = await serve(server);
  try {
    assert.deepEqual(
      await (await fetch(base + "/student-assistant/status")).json(),
      { configured: false, model: "" },
    );
  } finally {
    server.close();
  }
});
test("report pptx rejected", async () => {
  const server = createServer({});
  const base = await serve(server);
  try {
    const response = await post(base, "/student-assistant/export", {
      card: report,
      format: "pptx",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Reports export as PDF.",
    });
    for (const card of [
      { kind: "stat", title: "x", label: "x", value: 10, unit: "" },
      { kind: "list", title: "x", items: [] },
    ])
      assert.equal(
        (await post(base, "/student-assistant/export", { card, format: "pdf" }))
          .status,
        400,
      );
  } finally {
    server.close();
  }
});

test("calculator tools map Flask fields including on-duty hours and return valid stat candidates", async () => {
  const seen = [];
  const flask = http.createServer((req, res) => {
    seen.push([req.method, req.url, req.headers.authorization]);
    res.end(
      JSON.stringify(
        req.url === "/api/attendance"
          ? {
              attendance: [
                {
                  course_code: "CS603",
                  course_title: "Compiler Design",
                  attended_hours: 31,
                  od_hours: 2,
                  total_hours: 46,
                },
              ],
            }
          : {
              marks: [
                { course_code: "CS603", credits: 4 },
                { course_code: "CS604", credits: 3 },
              ],
            },
      ),
    );
  });
  const fb = await serve(flask);
  try {
    const out = { warnings: [], cards: [], actions: [] };
    const env = { STUDENT_API_BASE: fb + "/api" };
    const attendance = await runTool(
      "attendance_plan",
      { course: "compiler design" },
      env,
      STUDENT_BEARER,
      out,
    );
    assert.equal(attendance.attended, 33);
    assert.equal(attendance.mustAttend, 6);
    assert.equal(attendance.percent, 71.7);
    assert.deepEqual(validateCard(attendance.card), {
      kind: "stat",
      title: "Compiler Design",
      label: "CS603",
      value: 71.7,
      unit: "%",
      threshold: 75,
    });
    const gpa = await runTool(
      "sgpa_target",
      { target: 9.5 },
      env,
      STUDENT_BEARER,
      out,
    );
    assert.equal(gpa.requiredAverageGradePoint, 9.5);
    assert.equal(validateCard(gpa.card).unit, "");
    assert.deepEqual(seen, [
      ["GET", "/api/attendance", STUDENT_BEARER],
      ["GET", "/api/academics/performance", STUDENT_BEARER],
    ]);
  } finally {
    flask.close();
  }
});
test("calculator upstream failures return warnings without a candidate", async () => {
  for (const body of ["broken", "{}", null]) {
    const flask = http.createServer((req, res) => {
      if (body === null) res.writeHead(500);
      res.end(body ?? "");
    });
    const fb = await serve(flask);
    try {
      for (const [name, args, label] of [
        ["attendance_plan", { course: "CS603" }, "attendance"],
        ["sgpa_target", { target: 9.5 }, "academic performance"],
      ]) {
        const out = { warnings: [] };
        const result = await runTool(
          name,
          args,
          { STUDENT_API_BASE: fb },
          undefined,
          out,
        );
        assert.deepEqual(result, { error: `Could not load ${label}.` });
        assert.deepEqual(out.warnings, [result.error]);
      }
    } finally {
      flask.close();
    }
  }
});
test("unreachable student model returns 503 and provider HTTP failure returns 502", async () => {
  const model = http.createServer((req, res) => {
    req.resume();
    res.writeHead(500);
    res.end("unavailable");
  });
  const mb = await serve(model);
  try {
    for (const [AI_BASE_URL, status] of [
      ["http://127.0.0.1:1", 503],
      [mb, 502],
    ]) {
      const server = createServer({ AI_MODEL: "fake", AI_BASE_URL });
      const base = await serve(server);
      try {
        const response = await post(base, "/student-assistant/chat", request);
        assert.equal(response.status, status);
        assert.equal(typeof (await response.json()).error, "string");
      } finally {
        server.close();
      }
    }
  } finally {
    model.close();
  }
});
