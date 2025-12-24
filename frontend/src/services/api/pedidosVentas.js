import { getJson, postJson, patchJson } from "./base";
import { clearCache, getCache, setCache } from "./cache";

export async function createPedidoVenta(payload) {
  const data = await postJson("/pedidos-ventas/", payload);
  clearCache("pedidos:");
  clearCache("pedido:");
  return data;
}

export async function getPedidosVentas({ estado, cliente, useCache = true } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (cliente) params.set("cliente", cliente);
  const query = params.toString();
  const key = `pedidos:${query}`;
  if (useCache) {
    const cached = getCache(key);
    if (cached) return cached;
  }
  const data = await getJson(`/pedidos-ventas/${query ? `?${query}` : ""}`);
  setCache(key, data);
  return data;
}

export async function cancelarPedidoVenta(id, motivo) {
  const data = await postJson(`/pedidos-ventas/${id}/cancelar_pedido/`, {
    motivo_cancelacion: motivo,
  });
  clearCache("pedidos:");
  clearCache("pedido:");
  return data;
}

export async function getPedidoVenta(id, { useCache = true } = {}) {
  const key = `pedido:${id}`;
  if (useCache) {
    const cached = getCache(key);
    if (cached) return cached;
  }
  const data = await getJson(`/pedidos-ventas/${id}/`);
  setCache(key, data);
  return data;
}

export async function updatePedidoVenta(id, payload) {
  const data = await patchJson(`/pedidos-ventas/${id}/`, payload);
  clearCache("pedidos:");
  clearCache("pedido:");
  return data;
}
