import { getJson } from "./base";

export function getDashboard(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.fecha_desde) searchParams.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) searchParams.set("fecha_hasta", params.fecha_hasta);
  if (params.cliente) searchParams.set("cliente", params.cliente);
  if (params.proveedor) searchParams.set("proveedor", params.proveedor);
  if (params.forma_pago) searchParams.set("forma_pago", params.forma_pago);
  if (params.estado_cobro) searchParams.set("estado_cobro", params.estado_cobro);
  if (params.estado_pago) searchParams.set("estado_pago", params.estado_pago);
  if (params.medio_pago) searchParams.set("medio_pago", params.medio_pago);
  const query = searchParams.toString();
  return getJson(`/dashboard/${query ? `?${query}` : ""}`);
}
