import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { assistantRequest } from "../src/assistant-api";

beforeEach(() => {
  localStorage.setItem("auth_token", "student-token");
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});
it("assistant status, chat and export forward the bearer token to the separate service", async () => {
  const blob = new Blob(["%PDF-1.7"], { type: "application/pdf" });
  const fetch = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ configured: true }),
      blob: async () => blob,
    });
  vi.stubGlobal("fetch", fetch);
  await expect(assistantRequest("status")).resolves.toEqual({
    configured: true,
  });
  expect(fetch).toHaveBeenLastCalledWith(
    "/assistant-api/student-assistant/status",
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: "Bearer student-token",
      }),
    }),
  );
  const body = {
    messages: [{ role: "user", content: "Help" }],
    currentScreen: "assistant",
  };
  await assistantRequest("chat", body);
  expect(fetch).toHaveBeenLastCalledWith(
    "/assistant-api/student-assistant/chat",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify(body),
      headers: expect.objectContaining({
        Authorization: "Bearer student-token",
      }),
    }),
  );
  await expect(
    assistantRequest("export", { format: "pdf", card: {} }),
  ).resolves.toBe(blob);
});
it("reports JSON errors and connection failures honestly", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "Student API unavailable" }),
      }),
  );
  await expect(assistantRequest("chat", {})).rejects.toThrow(
    "Student API unavailable",
  );
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Offline")));
  await expect(assistantRequest("status")).rejects.toThrow(
    "Cannot reach the AI server",
  );
});
