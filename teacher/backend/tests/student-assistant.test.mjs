import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import JSZip from "jszip";
import { createServer } from "../dist/index.js";
import { runTool, screens, endpoints } from "../dist/student-tools.js";

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
      ...(authorization ? { authorization } : {}),
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
    assert.equal(req.headers.authorization, "Bearer token");
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
                      tool("make_export", { card: report }),
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
      "Bearer token",
    );
    assert.equal(response.status, 200);
    const out = await response.json();
    assert.equal(out.message, "CS602 attendance is 88%.");
    assert.deepEqual(out.actions, [
      { type: "navigate", screen: "attendance", label: "Attendance" },
    ]);
    assert.deepEqual(out.cards, [report]);
    assert.deepEqual(out.trace, ["get_attendance", "navigate", "make_export"]);
    assert.deepEqual(out.warnings, []);
    assert.equal(calls, 2);
  } finally {
    server.close();
    model.close();
    flask.close();
  }
});

test("Flask HTTP, JSON, connection and redirect failures return 502", async () => {
  for (const mode of ["http", "json", "redirect", "connection"]) {
    const flask = http.createServer((req, res) => {
      if (mode === "http") res.writeHead(500);
      if (mode === "redirect") res.writeHead(302, { location: "/admin" });
      res.end("invalid");
    });
    const fb = await serve(flask);
    const model = http.createServer((req, res) => {
      req.resume();
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "1",
                    type: "function",
                    function: { name: "get_profile", arguments: "{}" },
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
      assert.equal(
        (await post(base, "/student-assistant/chat", request)).status,
        502,
      );
    } finally {
      server.close();
      model.close();
      flask.close();
    }
  }
});

test("study and report exports produce real PPTX and PDF files; invalid cards are rejected", async () => {
  const server = createServer({});
  const base = await serve(server);
  try {
    for (const card of [study, report])
      for (const format of ["pptx", "pdf"]) {
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
