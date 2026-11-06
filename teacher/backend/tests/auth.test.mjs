import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../dist/index.js";
import { verifyJwt, signJwt } from "../dist/auth.js";
import { SECRET, token } from "./_auth.mjs";

async function serve(server) {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, path, authorization) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], currentScreen: "assistant" }),
  });

test("verifyJwt accepts valid tokens and rejects bad signature, expiry and alg", () => {
  assert.deepEqual(verifyJwt(token("student"), SECRET), { sub: "1", role: "student" });
  assert.equal(verifyJwt(token("student"), SECRET.replace("t", "x")), null);
  const expired = signJwt({ sub: "1", role: "student", exp: 10 }, SECRET);
  assert.equal(verifyJwt(expired, SECRET), null);
  const [, body, sig] = token("student").split(".");
  const none = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  assert.equal(verifyJwt(`${none}.${body}.${sig}`, SECRET), null);
  assert.equal(verifyJwt("garbage", SECRET), null);
  assert.equal(verifyJwt(token("student"), "short"), null);
});

test("assistant routes require a valid MSEC token with the right role", async () => {
  const server = createServer({ AUTH_SECRET: SECRET });
  const base = await serve(server);
  try {
    assert.equal((await post(base, "/student-assistant/chat")).status, 401);
    assert.equal((await post(base, "/student-assistant/chat", "Bearer nope.nope.nope")).status, 401);
    const forged = `Bearer ${signJwt({ sub: "1", role: "student", exp: 9999999999 }, "x".repeat(40))}`;
    assert.equal((await post(base, "/student-assistant/chat", forged)).status, 401);
    // Right role gets past auth (then 503: model not configured).
    assert.equal((await post(base, "/student-assistant/chat", `Bearer ${token("student")}`)).status, 503);
    assert.equal((await post(base, "/assistant/chat", `Bearer ${token("student")}`)).status, 403);
    assert.equal((await post(base, "/student-assistant/chat", `Bearer ${token("faculty")}`)).status, 403);
    assert.notEqual((await post(base, "/assistant/chat", `Bearer ${token("faculty")}`)).status, 401);
    assert.equal((await fetch(base + "/health")).status, 200);
  } finally {
    server.close();
  }
});
