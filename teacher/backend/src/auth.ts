import { createHmac, timingSafeEqual } from "node:crypto";

export type Session = { sub: string; role: string };

const b64url = (buf: Buffer) => buf.toString("base64url");

/** Verify an MSEC HS256 JWT issued by the Flask auth server. Returns null when invalid or expired. */
export function verifyJwt(token: string | undefined, secret: string | undefined, now = Date.now() / 1000): Session | null {
  if (!token || !secret || secret.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  let header: { alg?: string; typ?: string };
  let claims: { sub?: unknown; role?: unknown; exp?: unknown };
  try {
    header = JSON.parse(Buffer.from(head, "base64url").toString());
    claims = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (header.alg !== "HS256") return null;
  const expected = Buffer.from(b64url(createHmac("sha256", secret).update(`${head}.${body}`).digest()));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (typeof claims.exp !== "number" || claims.exp <= now) return null;
  if (typeof claims.sub !== "string" || typeof claims.role !== "string") return null;
  return { sub: claims.sub, role: claims.role };
}

/** Test helper and reference implementation of the token format. */
export function signJwt(claims: Record<string, unknown>, secret: string): string {
  const head = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac("sha256", secret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

export function bearer(header: string | undefined): string | undefined {
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
}
