import { deleteJson, getJson, patchJson, postJson } from "./base";
import { clearCache, getCache, setCache } from "./cache";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getProductos({ nombre, useCache = true } = {}) {
  const params = new URLSearchParams();
  if (nombre) params.set("nombre", nombre);
  const query = params.toString();
  const key = `productos:${query}`;
  if (useCache) {
    const cached = getCache(key, { persist: true });
    if (cached) return cached;
  }
  const data = await getJson(`/productos/${query ? `?${query}` : ""}`);
  setCache(key, data, { persist: true, ttlMs: DAY_MS });
  return data;
}

export async function createProducto(payload) {
  const data = await postJson("/productos/", payload);
  clearCache("productos:");
  return data;
}

export async function updateProducto(id, payload) {
  const data = await patchJson(`/productos/${id}/`, payload);
  clearCache("productos:");
  return data;
}

export async function deleteProducto(id) {
  const data = await deleteJson(`/productos/${id}/`);
  clearCache("productos:");
  return data;
}
