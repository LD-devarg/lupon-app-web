import { getJson, patchJson, postJson } from "./base";

export function createCobro(payload) {
  return postJson("/cobros/", payload);
}

export function getCobros({ clienteId } = {}) {
  const params = new URLSearchParams();
  if (clienteId) params.set("cliente_id", String(clienteId));
  const query = params.toString();
  return getJson(`/cobros/${query ? `?${query}` : ""}`);
}

export function getCobro(id) {
  return getJson(`/cobros/${id}/`);
}

export function addDetallesCobro(id, detalles) {
  return patchJson(`/cobros/${id}/`, { detalles });
}
