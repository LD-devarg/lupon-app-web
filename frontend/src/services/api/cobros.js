import { getJson, patchJson, postJson } from "./base";

export function createCobro(payload) {
  return postJson("/cobros/", payload);
}

export function getCobros() {
  return getJson("/cobros/");
}

export function getCobro(id) {
  return getJson(`/cobros/${id}/`);
}

export function addDetallesCobro(id, detalles) {
  return patchJson(`/cobros/${id}/`, { detalles });
}
