import { getJson, patchJson, postJson } from "./base";

export function getPedidosCompras() {
  return getJson("/pedidos-compras/");
}

export function getPedidoCompra(id) {
  return getJson(`/pedidos-compras/${id}/`);
}

export function createPedidoCompra(payload) {
  return postJson("/pedidos-compras/", payload);
}

export function updatePedidoCompra(id, payload) {
  return patchJson(`/pedidos-compras/${id}/`, payload);
}
