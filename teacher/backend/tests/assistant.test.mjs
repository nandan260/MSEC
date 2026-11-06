import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { createServer } from "../dist/index.js";
const context = {
  version: 1,
  profile: { name: "Teacher" },
  classes: [{ id: "c1", name: "CS", subject: "Algorithms" }],
  students: [
    {
      id: "s1",
      name: "Ada",
      roll: "R1",
      classId: "c1",
      score: 54,
      attendance: 72,
      trend: -3,
    },
  ],
  assignments: [
    {
      id: "a1",
      classId: "c1",
      title: "Trees",
      status: "Published",
      due: "2020-01-01",
    },
    { id: "a2", classId: "c1", title: "Draft", status: "Draft" },
  ],
  submissions: [],
  attendance: [],
  assessments: [],
  materials: [],
  announcements: [],
  doubts: [],
  messages: [],
  leaves: [],
  tasks: [],
  notificationsRead: false,
};
async function serve(server) {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, path, body) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("unconfigured model and invalid conversation are explicit", async () => {
  const s = createServer({});
  const b = await serve(s);
  try {
    assert.equal(
      (await (await fetch(b + "/assistant/status")).json()).configured,
      false,
    );
    assert.equal(
      (
        await post(b, "/assistant/chat", {
          messages: [{ role: "system", content: "x" }],
          context,
          currentRoute: "ai",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(b, "/assistant/chat", {
          messages: [{ role: "user", content: "help" }],
          context,
          currentRoute: "ai",
        })
      ).status,
      503,
    );
  } finally {
    s.close();
  }
});
test("model HTTP tool loop uses saved student values, blocks unsafe navigation, and ends", async () => {
  let calls = 0;
  let grounding;
  const model = http.createServer(async (req, res) => {
    let text = "";
    for await (const p of req) text += p;
    const input = JSON.parse(text);
    calls++;
    grounding = input.messages.find((x) => x.role === "tool");
    res.setHeader("content-type", "application/json");
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
                      {
                        id: "1",
                        type: "function",
                        function: {
                          name: "student_insights",
                          arguments: JSON.stringify({
                            studentIds: [],
                            query: "Ada",
                            score: 100,
                          }),
                        },
                      },
                      {
                        id: "2",
                        type: "function",
                        function: {
                          name: "navigate",
                          arguments: '{"route":"javascript:alert(1)"}',
                        },
                      },
                    ],
                  }
                : {
                    role: "assistant",
                    content:
                      "Ada needs support based on this browser snapshot.",
                  },
          },
        ],
      }),
    );
  });
  const mb = await serve(model);
  const server = createServer({ AI_MODEL: "test", AI_BASE_URL: mb });
  const b = await serve(server);
  try {
    const res = await post(b, "/assistant/chat", {
      messages: [{ role: "user", content: "Who needs help?" }],
      context,
      currentRoute: "ai",
    });
    assert.equal(res.status, 200);
    const output = await res.json();
    assert.equal(calls, 2);
    assert.equal(output.cards[0].rows[0].score, 54);
    assert.equal(output.cards[0].rows[0].missing, 1);
    assert.deepEqual(output.actions, [
      { type: "student", id: "s1", label: "Open Ada" },
    ]);
    assert.ok(grounding.content.includes("54"));
    assert.deepEqual(output.trace, ["student_insights", "navigate"]);
    assert.ok(output.warnings.length);
  } finally {
    server.close();
    model.close();
  }
});
test("exports produce typed workbook and real slide ZIP; unknown student rejected", async () => {
  const server = createServer({});
  const b = await serve(server);
  try {
    assert.equal(
      (
        await post(b, "/assistant/export", {
          format: "xlsx",
          context,
          studentIds: ["missing"],
        })
      ).status,
      400,
    );
    let r = await post(b, "/assistant/export", {
      format: "xlsx",
      context: {
        ...context,
        submissions: [
          {
            id: "sub1",
            studentId: "s1",
            assignmentId: "a1",
            marks: 31,
            status: "Graded",
          },
        ],
        attendance: [
          { classId: "c1", date: "2026-01-01", records: { s1: "Absent" } },
        ],
      },
      studentIds: ["s1"],
    });
    assert.equal(r.status, 200);
    const data = Buffer.from(await r.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data);
    assert.equal(wb.worksheets[0].getCell("D2").value, 54);
    assert.equal(wb.getWorksheet("Saved grades").getCell("D2").value, 31);
    assert.equal(
      wb.getWorksheet("Attendance sessions").getCell("E2").value,
      "Absent",
    );
    r = await post(b, "/assistant/export", {
      format: "pptx",
      context,
      lesson: {
        kind: "lesson",
        title: "Trees",
        summary: "Tree lesson",
        sections: [],
        slides: [{ title: "Root", bullets: ["A tree has a root"] }],
        diagram: {
          nodes: [
            { id: "a", label: "Root" },
            { id: "b", label: "Child" },
          ],
          edges: [{ from: "a", to: "b" }],
        },
      },
    });
    assert.equal(r.status, 200);
    const ppt = Buffer.from(await r.arrayBuffer());
    assert.equal(ppt.subarray(0, 2).toString(), "PK");
    const zip = await JSZip.loadAsync(ppt);
    assert.match(
      await zip.file("ppt/slides/slide1.xml").async("string"),
      /A tree has a root/,
    );
    assert.match(
      await zip.file("ppt/slides/slide1.xml").async("string"),
      /4E2478/,
    );
    assert.match(
      await zip.file("ppt/slides/slide2.xml").async("string"),
      /Child/,
    );
  } finally {
    server.close();
  }
});
test("provider failures and unbounded tool requests are constrained", async () => {
  let calls = 0;
  const model = http.createServer((req, res) => {
    calls++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: String(calls),
                  type: "function",
                  function: {
                    name: "search_dashboard",
                    arguments: '{"query":"attendance"}',
                  },
                },
              ],
            },
          },
        ],
      }),
    );
  });
  const mb = await serve(model);
  const s = createServer({ AI_MODEL: "test", AI_BASE_URL: mb });
  const b = await serve(s);
  try {
    const r = await post(b, "/assistant/chat", {
      messages: [{ role: "user", content: "search" }],
      context,
      currentRoute: "ai",
    });
    assert.equal(r.status, 502);
    assert.ok(calls <= 7);
  } finally {
    s.close();
    model.close();
  }
  const broken = createServer({
    AI_MODEL: "test",
    AI_BASE_URL: "http://127.0.0.1:1",
  });
  const bb = await serve(broken);
  try {
    assert.equal(
      (
        await post(bb, "/assistant/chat", {
          messages: [{ role: "user", content: "hello" }],
          context,
          currentRoute: "ai",
        })
      ).status,
      502,
    );
  } finally {
    broken.close();
  }
});
test("rejects malformed snapshots, attachment, slides and oversized messages", async () => {
  const s = createServer({});
  const b = await serve(s);
  try {
    for (const body of [
      {
        messages: [{ role: "user", content: "x" }],
        currentRoute: "ai",
        context: {
          ...context,
          students: [{ ...context.students[0], score: "54" }],
        },
      },
      {
        messages: [{ role: "user", content: "x" }],
        currentRoute: "ai",
        context,
        attachment: { name: "x", text: 5 },
      },
      {
        messages: [{ role: "user", content: "x".repeat(30001) }],
        currentRoute: "ai",
        context,
      },
    ])
      assert.equal((await post(b, "/assistant/chat", body)).status, 400);
    assert.equal(
      (
        await post(b, "/assistant/export", {
          format: "pptx",
          context,
          lesson: {
            title: "X",
            summary: "X",
            sections: [],
            slides: [],
            diagram: { nodes: [], edges: [] },
          },
        })
      ).status,
      400,
    );
    assert.equal((await fetch(b + "/unknown")).status, 404);
  } finally {
    s.close();
  }
});
test("lesson validation rejects invalid edges and unsupported video requests return honest search links", async () => {
  const { runTool } = await import("../dist/tools.js");
  const result = { actions: [], cards: [] };
  await assert.rejects(
    runTool(
      "create_lesson",
      {
        title: "X",
        summary: "X",
        sections: [],
        slides: [{ title: "X", bullets: ["Y"] }],
        diagram: {
          nodes: [{ id: "a", label: "A" }],
          edges: [{ from: "a", to: "unknown" }],
        },
      },
      context,
      {},
      result,
      new AbortController().signal,
    ),
  );
  await runTool(
    "youtube_resources",
    { query: "binary tree & graphs" },
    context,
    {},
    result,
    new AbortController().signal,
  );
  assert.equal(result.cards[0].verified, false);
  assert.equal(
    new URL(result.cards[0].items[0].url).hostname,
    "www.youtube.com",
  );
  assert.equal(new URL(result.cards[0].items[0].url).pathname, "/results");
});
test("prototype names are rejected by the route allowlist", async () => {
  const { runTool } = await import("../dist/tools.js");
  for (const route of ["__proto__", "constructor", "toString"])
    await assert.rejects(
      runTool(
        "navigate",
        { route },
        context,
        {},
        { actions: [], cards: [] },
        new AbortController().signal,
      ),
    );
});
test("invalid nested lesson and attendance data returns validation errors", async () => {
  const s = createServer({});
  const b = await serve(s);
  try {
    for (const lesson of [
      {
        title: "X",
        summary: "X",
        sections: [],
        slides: [{ title: "A", bullets: [] }],
        diagram: { nodes: [null], edges: [] },
      },
      {
        title: "X",
        summary: "X",
        sections: [],
        slides: [{ title: "A", bullets: [] }],
        quiz: [null],
      },
    ])
      assert.equal(
        (
          await post(b, "/assistant/export", {
            format: "pptx",
            context,
            lesson,
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await post(b, "/assistant/export", {
          format: "xlsx",
          context: {
            ...context,
            attendance: [
              { classId: "c1", date: "2026-01-01", records: "invalid" },
            ],
          },
        })
      ).status,
      400,
    );
  } finally {
    s.close();
  }
});
test("student names match Unicode whitespace and natural record queries", async () => {
  const { runTool } = await import("../dist/tools.js");
  const ctx = {
    ...context,
    students: [{ ...context.students[0], name: "Aditya Nair" }],
  };
  for (const query of [
    "Aditya\u202fNair",
    "Aditya Nair (s1), attendance and score",
    "ADITYA NAIR",
  ]) {
    const output = { cards: [], actions: [] };
    await runTool(
      "student_insights",
      { query },
      ctx,
      {},
      output,
      new AbortController().signal,
    );
    assert.equal(output.cards[0].rows[0]?.id, "s1");
  }
});
test("empty optional studentIds preserves record lookup and dashboard search opens matched students", async () => {
  const { runTool } = await import("../dist/tools.js");
  const out = { cards: [], actions: [] };
  await runTool(
    "query_student_records",
    { studentIds: [], query: "Ada" },
    context,
    {},
    out,
    new AbortController().signal,
  );
  assert.equal(out.cards[0].rows[0]?.id, "s1");
  assert.ok(out.actions.some((a) => a.type === "student" && a.id === "s1"));
  const search = { cards: [], actions: [] };
  await runTool(
    "search_dashboard",
    { query: "Ada" },
    context,
    {},
    search,
    new AbortController().signal,
  );
  assert.ok(search.actions.some((a) => a.type === "student" && a.id === "s1"));
});
test("declining students receive support and complete card selection survives model preview bounds", async () => {
  const { runTool } = await import("../dist/tools.js");
  const students = Array.from({ length: 125 }, (_, i) => ({
    ...context.students[0],
    id: `student${i}`,
    name: `Student ${i}`,
    roll: `R${i}`,
    score: 90,
    attendance: 95,
    trend: -1,
  }));
  const ctx = { ...context, students, assignments: [] };
  for (const tool of ["student_insights", "query_student_records"]) {
    const out = { cards: [], actions: [] };
    const result = await runTool(
      tool,
      { atRisk: true },
      ctx,
      {},
      out,
      new AbortController().signal,
    );
    assert.equal(out.cards[0].rows.length, 125);
    assert.equal(out.cards[0].rows.at(-1).id, "student124");
    assert.equal(result.total, 125);
    assert.equal(result.truncated, true);
    assert.equal(result.rows.length, 100);
    const server = createServer({});
    const b = await serve(server);
    try {
      const response = await post(b, "/assistant/export", {
        format: "xlsx",
        context: ctx,
        studentIds: out.cards[0].rows.map((s) => s.id),
      });
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(await response.arrayBuffer()));
      assert.equal(wb.getWorksheet("Student snapshot").rowCount, 126);
    } finally {
      server.close();
    }
  }
});
test("provider token truncation reports an actionable error and requests a sufficient bounded token budget", async () => {
  let sent;
  const provider = http.createServer(async (req, res) => {
    let raw = "";
    for await (const p of req) raw += p;
    sent = JSON.parse(raw);
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "length",
            message: { role: "assistant", content: "Partial" },
          },
        ],
      }),
    );
  });
  const p = await serve(provider);
  const server = createServer({ AI_MODEL: "test", AI_BASE_URL: p });
  const b = await serve(server);
  try {
    const response = await post(b, "/assistant/chat", {
      context,
      currentRoute: "ai",
      messages: [{ role: "user", content: "Explain a lesson" }],
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /token limit.*AI_MAX_TOKENS/i);
    assert.equal(sent.max_tokens, 8000);
  } finally {
    server.close();
    provider.close();
  }
});
test("identical successful lesson calls reuse the artifact and request a final answer", async () => {
  let calls = 0;
  const artifact = {
    title: "Trees",
    summary: "A short lesson",
    sections: [],
    slides: [{ title: "Root", bullets: ["A root begins a tree"] }],
  };
  const provider = http.createServer(async (req, res) => {
    let raw = "";
    for await (const p of req) raw += p;
    const request = JSON.parse(raw);
    calls++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message:
              calls <= 2
                ? {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: `tool${calls}`,
                        type: "function",
                        function: {
                          name: "create_lesson",
                          arguments: JSON.stringify(artifact),
                        },
                      },
                    ],
                  }
                : {
                    role: "assistant",
                    content:
                      request.tool_choice === "none"
                        ? "Your lesson is ready."
                        : "Unexpected tool state.",
                  },
          },
        ],
      }),
    );
  });
  const p = await serve(provider);
  const server = createServer({ AI_MODEL: "test", AI_BASE_URL: p });
  const b = await serve(server);
  try {
    const response = await post(b, "/assistant/chat", {
      context,
      currentRoute: "ai",
      messages: [{ role: "user", content: "Create a tree lesson" }],
    });
    assert.equal(response.status, 200);
    const out = await response.json();
    assert.equal(out.cards.length, 1);
    assert.deepEqual(out.trace, ["create_lesson"]);
    assert.equal(out.message, "Your lesson is ready.");
  } finally {
    server.close();
    provider.close();
  }
});
test("lesson validation identifies the exact missing body field for provider repair", async () => {
  const { runTool } = await import("../dist/tools.js");
  await assert.rejects(
    runTool(
      "create_lesson",
      {
        title: "Trees",
        summary: "Short",
        sections: [{ title: "Root", content: "A root begins a tree" }],
        slides: [{ title: "Root", bullets: ["A root begins a tree"] }],
      },
      context,
      {},
      { cards: [], actions: [] },
      new AbortController().signal,
    ),
    /sections\[0\]\.body.*string/i,
  );
});
