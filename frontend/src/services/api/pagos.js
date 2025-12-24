import { getJson, patchJson, postJson } from "./base";

export function createPago(payload) {
  return postJson("/pagos/", payload);
}

export function getPagos() {
  return getJson("/pagos/");
}

export function getPago(id) {
  return getJson(`/pagos/${id}/`);
}

export function addDetallesPago(id, detalles) {
  return patchJson(`/pagos/${id}/`, { detalles });
}
