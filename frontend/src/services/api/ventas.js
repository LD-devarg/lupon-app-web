import { getJson, postJson } from "./base";

export function createVenta(payload) {
  return postJson("/ventas/", payload);
}

export function getVentas({ clienteId, estadoVenta, fechaDesde, fechaHasta } = {}) {
  const params = new URLSearchParams();
  if (clienteId) params.set("cliente_id", String(clienteId));
  if (estadoVenta) params.set("estado_venta", estadoVenta);
  if (fechaDesde) params.set("fecha_desde", fechaDesde);
  if (fechaHasta) params.set("fecha_hasta", fechaHasta);
  const query = params.toString();
  return getJson(`/ventas/${query ? `?${query}` : ""}`);
}

export function getVenta(id) {
  return getJson(`/ventas/${id}/`);
}

export function cambiarEstadoVenta(id, estadoVenta) {
  return postJson(`/ventas/${id}/cambiar_estado/`, { estado_venta: estadoVenta });
}

export function cancelarVenta(id, motivo) {
  return postJson(`/ventas/${id}/cancelar_venta/`, { motivo_cancelacion: motivo || "" });
}
