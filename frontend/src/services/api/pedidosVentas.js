// src/services/api/pedidosVentas.js

const BASE = "/api/pedidos_ventas/";
const BASE_DETALLE = "/api/pedidos_ventas_detalle/";

/* ============================
   🟦 PEDIDOS
============================= */

export async function getPedidosVentas() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error cargando pedidos de venta");
  return res.json();
}

export async function getPedidoVenta(id) {
  const res = await fetch(`${BASE}${id}/`);
  if (!res.ok) throw new Error("Error cargando el pedido");
  return res.json();
}

export async function crearPedidoVenta(payload) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error creando el pedido");
  return res.json();
}

export async function actualizarPedidoVenta(id, payload) {
  const res = await fetch(`${BASE}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error actualizando pedido");
  return res.json();
}

export async function eliminarPedidoVenta(id) {
  const res = await fetch(`${BASE}${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando pedido");
  return true;
}

/* ============================
   🟧 ESTADOS
============================= */

export async function cambiarEstadoPedidoVenta(id, estado) {
  return actualizarPedidoVenta(id, { estado });
}

/* ============================
   🟩 DETALLES (líneas)
============================= */

export async function getDetallesPedido(idPedido) {
  const res = await fetch(`${BASE_DETALLE}?pedido=${idPedido}`);
  if (!res.ok) throw new Error("Error cargando detalles del pedido");
  return res.json();
}

export async function crearDetallePedido(payload) {
  const res = await fetch(BASE_DETALLE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error creando detalle");
  return res.json();
}

export async function actualizarDetallePedido(id, payload) {
  const res = await fetch(`${BASE_DETALLE}${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error actualizando detalle");
  return res.json();
}

export async function eliminarDetallePedido(id) {
  const res = await fetch(`${BASE_DETALLE}${id}/`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Error eliminando detalle");
  return true;
}
