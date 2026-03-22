import { getJson, postJson } from "./base";

export function createVenta(payload) {
  return postJson("/ventas/", payload);
}

export function getVentas({ clienteId, fechaEntrega, fechaDesde, fechaHasta } = {}) {
  const params = new URLSearchParams();
  if (clienteId) params.set("cliente_id", String(clienteId));
  if (fechaEntrega) params.set("fecha_entrega", fechaEntrega);
  if (fechaDesde) params.set("fecha_desde", fechaDesde);
  if (fechaHasta) params.set("fecha_hasta", fechaHasta);
  const query = params.toString();
  return getJson(`/ventas/${query ? `?${query}` : ""}`);
}

export function getVenta(id) {
  return getJson(`/ventas/${id}/`);
}

export function cambiarEstadoEntrega(id, estadoEntrega) {
  return postJson(`/ventas/${id}/cambiar_estado_entrega/`, {
    estado_entrega: estadoEntrega,
  });
}

export function reprogramarEntrega(id, nuevaFecha) {
  return postJson(`/ventas/${id}/reprogramar_entrega/`, {
    nueva_fecha: nuevaFecha,
  });
}

export function cancelarVenta(id, motivo) {
  return postJson(`/ventas/${id}/cancelar_venta/`, {
    motivo_cancelacion: motivo,
  });
}

export function reordenarEntregas(fechaEntrega, ventasIds) {
  return postJson("/ventas/reordenar_entregas/", {
    fecha_entrega: fechaEntrega,
    ventas_ids: ventasIds,
  });
}
