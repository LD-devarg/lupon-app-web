import { getJson } from "./base";
import { getCache, setCache } from "./cache";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getClientes({ nombre, useCache = true } = {}) {
  const params = new URLSearchParams({ tipo: "cliente" });
  if (nombre) params.set("nombre", nombre);
  const key = `clientes:${params.toString()}`;
  if (useCache) {
    const cached = getCache(key, { persist: true });
    if (cached) return cached;
  }
  const data = await getJson(`/contactos/?${params.toString()}`);
  setCache(key, data, { persist: true, ttlMs: DAY_MS });
  return data;
}
