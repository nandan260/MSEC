import http from "node:http";
import { pathToFileURL } from "node:url";
import { chat, configuration } from "./assistant.js";
import { exportFile } from "./exports.js";
import { studentChat } from "./student-assistant.js";
import { studentExport } from "./student-exports.js";
import { ApiError } from "./tools.js";
export function createServer(env: NodeJS.ProcessEnv = process.env) {
  return http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    try {
      const path = req.url?.split("?")[0];
      if (req.method === "GET" && path === "/health") {
        json(200, { status: "ok" });
        return;
      }
      if (req.method === "GET" && path === "/assistant/status") {
        const { configured, model, tools } = configuration(env);
        json(200, { configured, model, tools });
        return;
      }
      if (req.method === "GET" && path === "/student-assistant/status") {
        const { configured, model } = configuration(env);
        json(200, { configured, model });
        return;
      }
      if (req.method === "GET" && path === "/") {
        json(200, {
          service: "teacher-backend",
          status: "running",
          runtime: "node-typescript",
          endpoints: [
            "/health",
            "/assistant/status",
            "/assistant/chat",
            "/assistant/export",
          ],
        });
        return;
      }
      if (
        req.method !== "POST" ||
        ![
          "/assistant/chat",
          "/assistant/export",
          "/student-assistant/chat",
          "/student-assistant/export",
        ].includes(path ?? "")
      ) {
        json(404, { error: "Not found." });
        return;
      }
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw new ApiError(400, "Content-Type must be application/json.");
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1_500_000)
          throw new ApiError(400, "Request exceeds 1.5 MB limit.");
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        throw new ApiError(400, "Invalid JSON request.");
      }
      if (path === "/assistant/chat") {
        json(200, await chat(body, env));
        return;
      }
      if (path === "/student-assistant/chat") {
        json(200, await studentChat(body, env, req.headers.authorization));
        return;
      }
      const file =
        path === "/student-assistant/export"
          ? await studentExport(body)
          : await exportFile(body);
      res.writeHead(200, {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.name}"`,
      });
      res.end(file.buffer);
    } catch (e) {
      json(e instanceof ApiError ? e.status : 500, {
        error: e instanceof ApiError ? e.message : "Unable to process request.",
      });
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createServer();
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  const port = Number(process.env.PORT) || 8000;
  const host = process.env.HOST || "127.0.0.1";
  server.listen(port, host, () =>
    console.log(`Teacher backend listening on http://${host}:${port}`),
  );
}
