const API_BASE = "/api";

function getBasicAuthHeader() {
  const user = localStorage.getItem("devAuthUser");
  const pass = localStorage.getItem("devAuthPass");
  if (!user || !pass) return null;
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

async function request(path, options = {}) {
  const authHeader = getBasicAuthHeader();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data?.error || data?.detail || JSON.stringify(data);
    } catch {
      // Keep default message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function getJson(path) {
  return request(path, { method: "GET" });
}

export function postJson(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchJson(path, body) {
  return request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteJson(path) {
  return request(path, { method: "DELETE" });
}
