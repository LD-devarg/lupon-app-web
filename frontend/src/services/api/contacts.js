// src/services/contactos.js

const BASE_URL = "/api/contactos/";

/* ============================
   GET - Todos los contactos
   ============================ */
export async function getContactos() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Error obteniendo contactos");
  return res.json();
}

/* ============================
   GET - Solo clientes
   ============================ */
export async function getClientes() {
  const res = await fetch(`${BASE_URL}?clientes=1`);
  if (!res.ok) throw new Error("Error obteniendo clientes");
  return res.json();
}

/* ============================
   GET - Solo proveedores
   ============================ */
export async function getProveedores() {
  const res = await fetch(`${BASE_URL}?proveedores=1`);
  if (!res.ok) throw new Error("Error obteniendo proveedores");
  return res.json();
}

/* ============================
   GET - Un contacto por ID
   ============================ */
export async function getContacto(id) {
  const res = await fetch(`${BASE_URL}${id}/`);
  if (!res.ok) throw new Error("Error obteniendo contacto");
  return res.json();
}

/* ============================
   POST - Crear contacto
   ============================ */
export async function crearContacto(payload) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error creando contacto");
  return res.json();
}

/* ============================
   PATCH - Actualizar contacto
   ============================ */
export async function actualizarContacto(id, payload) {
  const res = await fetch(`${BASE_URL}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error actualizando contacto");
  return res.json();
}

/* ============================
   DELETE - Eliminar contacto
   ============================ */
export async function eliminarContacto(id) {
  const res = await fetch(`${BASE_URL}${id}/`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Error eliminando contacto");
  return true;
}
