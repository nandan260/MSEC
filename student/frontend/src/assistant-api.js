import { getToken, NetworkError } from "./api";

const BASE = (import.meta.env.VITE_ASSISTANT_BASE || "/assistant-api").replace(
  /\/$/,
  "",
);

export async function assistantRequest(path, body) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${BASE}/student-assistant/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new NetworkError(
      "Cannot reach the AI server. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(
      data.error || `AI request failed (HTTP ${response.status}).`,
    );
    error.status = response.status;
    throw error;
  }
  return path === "export" ? response.blob() : response.json();
}

export async function downloadCard(card, format) {
  const blob = await assistantRequest("export", { card, format });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${card.title.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "student-export"}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
