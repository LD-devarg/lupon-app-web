import { getJson, postJson } from "./base";

export function getCompras() {
  return getJson("/compras/");
}

export function getCompra(id) {
  return getJson(`/compras/${id}/`);
}

export function createCompra(payload) {
  return postJson("/compras/", payload);
}

export function cambiarEstadoCompra(id, payload) {
  return postJson(`/compras/${id}/cambiar_estado_compra/`, payload);
}
