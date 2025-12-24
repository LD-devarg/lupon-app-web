import { getJson, postJson } from "./base";

export function getNotasCredito(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.contacto) searchParams.set("contacto", params.contacto);
  if (params.tipo) searchParams.set("tipo", params.tipo);
  const query = searchParams.toString();
  return getJson(`/notas-credito/${query ? `?${query}` : ""}`);
}

export function getNotaCredito(id) {
  return getJson(`/notas-credito/${id}/`);
}

export function createNotaCredito(payload) {
  return postJson("/notas-credito/", payload);
}
