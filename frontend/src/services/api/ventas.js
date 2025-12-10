// src/services/api/ventas.js

const BASE = "/api/ventas/";
const BASE_DETALLE = "/api/pedidos_ventas_detalle/";

/* ============================
   🟦 VENTAS
============================= */

export async function getVentas() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error obteniendo ventas");
  return res.json();
}

export async function getVenta(id) {
  const res = await fetch(`${BASE}${id}/`);
  if (!res.ok) throw new Error("Error obteniendo venta");
  return res.json();
}

export async function eliminarVenta(id) {
  const res = await fetch(`${BASE}${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando venta");
  return true;
}

/* ============================
   🟩 DETALLES DE LA VENTA
   (son los mismos del pedido)
============================= */

export async function getDetallesVenta(idPedido) {
  // una venta se genera SIEMPRE desde un pedido
  const res = await fetch(`/api/pedidos_ventas_detalle/?pedido=${idPedido}`);
  if (!res.ok) throw new Error("Error cargando detalles de la venta");
  return res.json();
}

export async function createVentaFromPedido(idPedido, forma_pago, medio_pago) {
  const res = await fetch(`/api/pedidos_ventas/${idPedido}/generar_venta/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forma_pago, medio_pago }),
  });

  if (!res.ok) throw new Error("Error generando venta desde pedido");
  return res.json();
}