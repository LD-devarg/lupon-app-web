import { deleteJson, getJson, patchJson, postJson } from "./base";
import { clearCache, getCache, setCache } from "./cache";

export async function getContactos(
  { tipo, nombre, useCache = false } = {}
) {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (nombre) params.set("nombre", nombre);
  const query = params.toString();
  const key = `contactos:${query}`;
  if (useCache) {
    const cached = getCache(key);
    if (cached) return cached;
  }
  const data = await getJson(`/contactos/${query ? `?${query}` : ""}`);
  setCache(key, data);
  return data;
}

export async function createContacto(payload) {
  const data = await postJson("/contactos/", payload);
  clearCache("contactos:");
  clearCache("clientes:");
  return data;
}

export async function updateContacto(id, payload) {
  const data = await patchJson(`/contactos/${id}/`, payload);
  clearCache("contactos:");
  clearCache("clientes:");
  return data;
}

export async function deleteContacto(id) {
  const data = await deleteJson(`/contactos/${id}/`);
  clearCache("contactos:");
  clearCache("clientes:");
  return data;
}
