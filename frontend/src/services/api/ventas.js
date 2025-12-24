import { getJson, postJson } from "./base";

export function createVenta(payload) {
  return postJson("/ventas/", payload);
}

export function getVentas() {
  return getJson("/ventas/");
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
