import { useEffect, useMemo, useState } from "react";
import { getClientes } from "../services/api/clientes";
import { getContactos } from "../services/api/contactos";
import { getDashboard } from "../services/api/dashboard";

export const EMPTY_FILTERS = {
  fechaDesde: "",
  fechaHasta: "",
  cliente: "",
  proveedor: "",
  formaPago: "",
  estadoCobro: "",
  estadoPago: "",
  medioPago: "",
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatArs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? currencyFormatter.format(number) : "-";
}

export function formatCompactArs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? compactCurrencyFormatter.format(number) : "-";
}

export function formatRatio(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(digits)}%` : "-";
}

export function safeRatio(value, total) {
  const parsedTotal = toNumber(total);
  if (!parsedTotal) return 0;
  return toNumber(value) / parsedTotal;
}

export function useDashboardData(initialFilters = EMPTY_FILTERS) {
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (isFilterOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isFilterOpen]);

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [clientesData, proveedoresData] = await Promise.all([
          getClientes(),
          getContactos({ tipo: "proveedor" }),
        ]);
        setClientes(clientesData || []);
        setProveedores(proveedoresData || []);
      } catch (err) {
        setError(err?.message || "No se pudieron cargar los filtros.");
      }
    };
    loadCombos();
  }, []);

  const loadDashboard = async (nextFilters = filters) => {
    setError("");
    setIsLoading(true);
    try {
      const response = await getDashboard({
        fecha_desde: nextFilters.fechaDesde,
        fecha_hasta: nextFilters.fechaHasta,
        cliente: nextFilters.cliente,
        proveedor: nextFilters.proveedor,
        forma_pago: nextFilters.formaPago,
        estado_cobro: nextFilters.estadoCobro,
        estado_pago: nextFilters.estadoPago,
        medio_pago: nextFilters.medioPago,
      });
      setData(response);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    loadDashboard(EMPTY_FILTERS);
    setIsFilterOpen(false);
  };

  const appliedFilters = useMemo(() => {
    const current = data?.filters || {};
    const chips = [];
    if (current.fecha_desde || current.fecha_hasta) {
      chips.push(`Periodo: ${current.fecha_desde || "..."} a ${current.fecha_hasta || "..."}`);
    }
    if (current.cliente) {
      const cliente = clientes.find((item) => String(item.id) === String(current.cliente));
      chips.push(`Cliente: ${cliente?.nombre || `#${current.cliente}`}`);
    }
    if (current.proveedor) {
      const proveedor = proveedores.find((item) => String(item.id) === String(current.proveedor));
      chips.push(`Proveedor: ${proveedor?.nombre || `#${current.proveedor}`}`);
    }
    if (current.forma_pago) chips.push(`Forma: ${current.forma_pago}`);
    if (current.estado_cobro) chips.push(`Cobro: ${current.estado_cobro}`);
    if (current.estado_pago) chips.push(`Pago: ${current.estado_pago}`);
    if (current.medio_pago) chips.push(`Medio: ${current.medio_pago}`);
    return chips;
  }, [clientes, data?.filters, proveedores]);

  const clienteOptions = useMemo(
    () => clientes.map((item) => ({ value: String(item.id), label: item.nombre })),
    [clientes]
  );

  const proveedorOptions = useMemo(
    () => proveedores.map((item) => ({ value: String(item.id), label: item.nombre })),
    [proveedores]
  );

  const computedMetrics = useMemo(() => {
    const cards = data?.cards || {};
    const clientesConDeuda = data?.clientes_con_deuda || [];
    const comprasPendientes = data?.compras_pendientes || [];
    const documentosPorVencer = data?.documentos_por_vencer || {};
    const documentosVencidos = data?.documentos_vencidos || {};

    const ventasTotal = toNumber(cards.ventas_totales?.total);
    const ventasCobradas = toNumber(cards.ventas_totales?.cobradas);
    const ventasParciales = toNumber(cards.ventas_totales?.parciales);
    const ventasPendientes = toNumber(cards.ventas_totales?.pendientes);
    const comprasTotal = toNumber(cards.compras_totales?.total);
    const comprasPagadas = toNumber(cards.compras_totales?.pagadas);
    const comprasParciales = toNumber(cards.compras_totales?.parciales);
    const comprasPendientesMonto = toNumber(cards.compras_totales?.pendientes);
    const flujoNeto = toNumber(cards.flujo_neto);
    const gananciaBruta = toNumber(cards.ganancia_bruta);
    const margenBruto = toNumber(cards.margen_bruto);
    const deudaClientes = toNumber(cards.deuda_clientes);
    const deudaProveedores = toNumber(cards.deuda_proveedores);
    const ingresosTotal = toNumber(cards.ingresos_caja?.total);
    const ingresosEfectivo = toNumber(cards.ingresos_caja?.por_medio_pago?.efectivo);
    const ingresosTransferencia = toNumber(cards.ingresos_caja?.por_medio_pago?.transferencia);
    const egresosTotal = toNumber(cards.egresos_caja?.total);

    return {
      ventasTotal,
      ventasCobradas,
      ventasParciales,
      ventasPendientes,
      comprasTotal,
      comprasPagadas,
      comprasParciales,
      comprasPendientesMonto,
      flujoNeto,
      gananciaBruta,
      margenBruto,
      deudaClientes,
      deudaProveedores,
      ingresosTotal,
      ingresosEfectivo,
      ingresosTransferencia,
      egresosTotal,
      clientesConDeuda,
      comprasPendientes,
      documentosPorVencer,
      documentosVencidos,
    };
  }, [data]);

  return {
    data,
    isLoading,
    error,
    clientes,
    proveedores,
    filters,
    setFilters,
    isFilterOpen,
    setIsFilterOpen,
    handleChange,
    handleClear,
    loadDashboard,
    appliedFilters,
    clienteOptions,
    proveedorOptions,
    computedMetrics,
    formatArs,
    formatCompactArs,
    formatRatio,
    safeRatio,
  };
}
