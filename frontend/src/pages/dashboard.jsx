import { useEffect, useMemo, useState } from "react";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Button from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getClientes } from "../services/api/clientes";
import { getContactos } from "../services/api/contactos";
import { getDashboard } from "../services/api/dashboard";
import Logo from "../assets/logo-lupon.png";

const EMPTY_FILTERS = {
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

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatArs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? currencyFormatter.format(number) : "-";
}

function formatCompactArs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? compactCurrencyFormatter.format(number) : "-";
}

function formatRatio(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(digits)}%` : "-";
}

function safeRatio(value, total) {
  const parsedTotal = toNumber(total);
  if (!parsedTotal) return 0;
  return toNumber(value) / parsedTotal;
}

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

function FilterChip({ children }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, insight, accent, tone, progress }) {
  const toneClasses = {
    emerald:
      "border-emerald-400/50 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 text-white",
    blue: "border-blue-400/50 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white",
    amber: "border-amber-300/70 bg-gradient-to-br from-amber-100 via-white to-orange-100 text-slate-900",
    rose: "border-rose-300/70 bg-gradient-to-br from-rose-100 via-white to-red-100 text-slate-900",
  };

  const isDark = tone === "emerald" || tone === "blue";

  return (
    <article
      className={joinClasses(
        "rounded-[22px] border px-3.5 py-3 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1",
        toneClasses[tone]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={joinClasses("text-xs font-semibold uppercase tracking-[0.2em]", isDark ? "text-white/80" : "text-slate-500")}>
            {label}
          </p>
          <p className={joinClasses("mt-2 text-[1.35rem] font-semibold leading-none sm:text-[1.8rem]", isDark ? "text-white" : "text-slate-900")}>
            {value}
          </p>
        </div>
        <div className={joinClasses("flex h-8 w-8 items-center justify-center rounded-xl border", isDark ? "border-white/20 bg-white/10" : "border-slate-200 bg-white/75")}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={joinClasses("mt-2.5 h-px w-full", isDark ? "bg-white/15" : "bg-slate-200")} />
      <p className={joinClasses("mt-2 text-[11px] leading-4", isDark ? "text-white/90" : "text-slate-600")}>
        {insight}
      </p>
      <p className={joinClasses("mt-1 text-[11px] font-medium", isDark ? "text-white/80" : "text-slate-500")}>
        {accent}
      </p>
      <div className="mt-2 space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className={joinClasses(
              "h-full rounded-full",
              tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-500" : "bg-white/80"
            )}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <p className={joinClasses("text-[10px] font-medium", isDark ? "text-white/75" : "text-slate-500")}>
          {formatRatio(progress)} del nivel de referencia
        </p>
      </div>
    </article>
  );
}

function DetailCard({ icon: Icon, title, value, lines, footer, tone = "slate" }) {
  const toneClasses = {
    slate: "border-white/70 bg-white/80",
    rose: "border-rose-200 bg-rose-50/90",
    amber: "border-amber-200 bg-amber-50/90",
  };

  return (
    <article
      className={joinClasses(
        "h-fit self-start rounded-[20px] border p-3.5 text-left shadow-[0_16px_32px_-26px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1",
        toneClasses[tone]
      )}
    >
      <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-2 text-[1.15rem] font-semibold text-slate-900 lg:text-[1.3rem]">{value}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Icon className="h-4 w-4" />
          </div>
        <div className="">
          <p>
            {lines.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500">{line.label}</p>
                <p className="text-[11px] font-medium text-slate-700">{line.value}</p>
              </div>
            ))}
          </p>
        </div>
      </div>
      <p className={joinClasses("mt-3 text-[11px] font-medium", tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : "text-slate-500")}>
        {footer}
      </p>
    </article>
  );
}


function ListPanel({
  title,
  subtitle,
  items,
  emptyText,
  renderItem,
  tone = "slate",
  scrollable = false,
  maxBodyHeight = "auto",
  panelHeight = "auto",
}) {
  return (
    <section
      className={joinClasses(
        "flex h-full min-h-0 flex-col rounded-[22px] border p-3.5 text-left shadow-[0_16px_32px_-26px_rgba(15,23,42,0.3)]",
        tone === "rose" ? "border-rose-200 bg-rose-50/80" : "border-white/70 bg-white/80"
      )}
      style={panelHeight !== "auto" ? { height: panelHeight } : undefined}
    >
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      <div
        className={joinClasses(
          "min-h-0 flex-1 space-y-2.5",
          subtitle ? "mt-3" : "mt-2",
          scrollable ? "overflow-y-auto pr-1" : ""
        )}
        style={scrollable ? { maxHeight: maxBodyHeight } : undefined}
      >
        {items.length === 0 ? <p className="text-sm text-slate-500">{emptyText}</p> : null}
        {items.map(renderItem)}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-12">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className={joinClasses(
            "animate-pulse rounded-[28px] bg-white/70 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.25)]",
            index < 4 ? "h-48 lg:col-span-3" : "h-40 lg:col-span-4"
          )}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
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
    try {
      setIsLoading(true);
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
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = data?.cards || {};
  const clientesConDeuda = useMemo(() => data?.clientes_con_deuda || [], [data]);
  const comprasPendientes = useMemo(() => data?.compras_pendientes || [], [data]);
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

  const executiveCards = [
    {
      icon: ArrowsRightLeftIcon,
      label: "Flujo neto",
      value: formatArs(flujoNeto),
      insight: flujoNeto >= 0 ? "Caja positiva." : "Caja en tension.",
      accent: `${formatCompactArs(ingresosTotal)} / ${formatCompactArs(egresosTotal)}`,
      tone: flujoNeto >= 0 ? "emerald" : "rose",
      progress: safeRatio(Math.abs(flujoNeto), Math.max(ingresosTotal, egresosTotal, 1)),
    },
    {
      icon: ChartBarIcon,
      label: "Ganancia",
      value: formatArs(gananciaBruta),
      insight: margenBruto >= 0.3 ? `Margen ${formatRatio(margenBruto)}.` : `Margen bajo ${formatRatio(margenBruto)}.`,
      accent: `${formatCompactArs(ventasTotal)} / ${formatCompactArs(comprasTotal)}`,
      tone: gananciaBruta >= 0 ? "blue" : "rose",
      progress: safeRatio(Math.abs(gananciaBruta), Math.max(ventasTotal, 1)),
    },
    {
      icon: BanknotesIcon,
      label: "Ventas cobradas",
      value: formatArs(ventasCobradas),
      insight: `${formatRatio(safeRatio(ventasCobradas, ventasTotal))} cobrado.`,
      accent: `${formatCompactArs(ventasPendientes)} pendiente`,
      tone: "blue",
      progress: safeRatio(ventasCobradas, ventasTotal),
    },
    {
      icon: ExclamationTriangleIcon,
      label: "Deuda clientes",
      value: formatArs(deudaClientes),
      insight:
        deudaClientes > ventasCobradas
          ? "Riesgo alto."
          : `${formatRatio(safeRatio(deudaClientes, ventasTotal))} sobre ventas.`,
      accent: `${clientesConDeuda.length} clientes`,
      tone: deudaClientes > ventasCobradas ? "rose" : "amber",
      progress: safeRatio(deudaClientes, Math.max(ventasTotal, 1)),
    },
  ];

  const operationalCards = [
    {
      icon: ShoppingBagIcon,
      title: "Ventas totales",
      value: formatArs(ventasTotal),
      lines: [
        { label: "Cobradas", value: formatArs(ventasCobradas) },
        { label: "Parciales", value: formatArs(ventasParciales) },
        { label: "Pendientes", value: formatArs(ventasPendientes) },
      ],
      footer: `${formatRatio(safeRatio(ventasPendientes, ventasTotal))} pendiente`,
    },
    {
      icon: BuildingStorefrontIcon,
      title: "Compras totales",
      value: formatArs(comprasTotal),
      lines: [
        { label: "Pagadas", value: formatArs(comprasPagadas) },
        { label: "Parciales", value: formatArs(comprasParciales) },
        { label: "Pendientes", value: formatArs(comprasPendientesMonto) },
      ],
      footer: `${formatRatio(safeRatio(comprasPendientesMonto, comprasTotal))} pendiente`,
    },
    {
      icon: BanknotesIcon,
      title: "Ingresos en efectivo",
      value: formatArs(ingresosEfectivo),
      lines: [
        { label: "Peso sobre caja", value: formatRatio(safeRatio(ingresosEfectivo, ingresosTotal)) },
        { label: "Total ingresos", value: formatArs(ingresosTotal) },
      ],
      footer: "Liquidez inmediata",
    },
    {
      icon: ArrowsRightLeftIcon,
      title: "Transferencias",
      value: formatArs(ingresosTransferencia),
      lines: [
        { label: "Peso sobre caja", value: formatRatio(safeRatio(ingresosTransferencia, ingresosTotal)) },
        { label: "Total ingresos", value: formatArs(ingresosTotal) },
      ],
      footer: "Cobro bancario",
    },
  ];

  const riskCards = [
    {
      icon: UserGroupIcon,
      title: "Deuda clientes",
      value: formatArs(deudaClientes),
      lines: [
        { label: "Sobre ventas", value: formatRatio(safeRatio(deudaClientes, ventasTotal)) },
        { label: "Clientes expuestos", value: String(clientesConDeuda.length) },
        { label: "Documentos vencidos", value: String(documentosVencidos.cantidad || 0) },
      ],
      footer: `Vencido: ${formatArs(documentosVencidos.saldo)}`,
      tone: "rose",
    },
    {
      icon: ChartBarIcon,
      title: "Deuda proveedores",
      value: formatArs(deudaProveedores),
      lines: [
        { label: "Sobre compras", value: formatRatio(safeRatio(deudaProveedores, comprasTotal)) },
        { label: "Compras pendientes", value: String(comprasPendientes.length) },
        { label: "Pendiente informado", value: formatArs(comprasPendientesMonto) },
      ],
      footer: "Seguir pagos",
      tone: "amber",
    },
  ];

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    loadDashboard(filters);
    setIsFilterOpen(false);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    loadDashboard(EMPTY_FILTERS);
    setIsFilterOpen(false);
  };

  return (
    <div className="h-[calc(100vh-1rem)] overflow-hidden bg-[radial-gradient(circle_at_top,#f8fafc_0%,#eef2ff_30%,#e2e8f0_100%)]">
      <div className="mx-auto flex h-full w-full max-w-none flex-col px-3 pb-2 pt-2 sm:px-4 lg:px-5">
        <div className="rounded-[22px] border border-white/70 bg-white/80 px-5 py-3 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-28 items-center justify-center rounded-2xl bg-slate-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.55)]">
                <img className="h-7 w-7" src={Logo} alt="Lupon Logo" />
              </div>
              <h2 className="text-[1.15rem] font-semibold text-slate-950 lg:text-[1.5rem]">
                Dashboard financiero
              </h2>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {appliedFilters.length === 0 ? <FilterChip>Sin filtros activos</FilterChip> : null}
                {appliedFilters.map((item) => (
                  <FilterChip key={item}>{item}</FilterChip>
                ))}
              </div>
              <Button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.6)]"
                whileHover={{ scale: 1.01, y: -1 }}
                onClick={() => setIsFilterOpen(true)}
              >
                <FunnelIcon className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {isLoading && !data ? <LoadingSkeleton /> : null}

        {data ? (
          <div className="mt-2 grid min-h-0 flex-1 content-start auto-rows-min gap-2.5 overflow-hidden xl:grid-cols-12">
            <section className="h-fit self-start xl:col-span-12">
              <div className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-4">
                {executiveCards.map((card) => (
                  <StatCard key={card.label} {...card} />
                ))}
              </div>
            </section>

            <section className="grid min-h-0 gap-2 xl:col-span-12 xl:grid-cols-12">
              <div className="grid auto-rows-min items-start gap-2.5 md:grid-cols-2 xl:col-span-6">
                {operationalCards.map((card) => (
                  <DetailCard key={card.title} {...card} />
                ))}
                {riskCards.map((card) => (
                  <DetailCard key={card.title} {...card} />
                ))}
              </div>

              <div className="min-h-0 xl:col-span-3">
                <ListPanel
                  title="Vencimientos"
                  subtitle=""
                  scrollable
                  panelHeight="calc(100vh - 24rem)"
                  maxBodyHeight="calc(100vh - 28rem)"
                  items={[
                    {
                      id: "hoy",
                      label: "Hoy",
                      cantidad: documentosPorVencer.hoy?.cantidad || 0,
                      saldo: formatArs(documentosPorVencer.hoy?.saldo),
                    },
                    {
                      id: "7dias",
                      label: "Proximos 7 dias",
                      cantidad: documentosPorVencer.proximos_7_dias?.cantidad || 0,
                      saldo: formatArs(documentosPorVencer.proximos_7_dias?.saldo),
                    },
                    {
                      id: "30dias",
                      label: "Proximos 30 dias",
                      cantidad: documentosPorVencer.proximos_30_dias?.cantidad || 0,
                      saldo: formatArs(documentosPorVencer.proximos_30_dias?.saldo),
                    },
                    {
                      id: "vencidos",
                      label: "Vencidos",
                      cantidad: documentosVencidos.cantidad || 0,
                      saldo: formatArs(documentosVencidos.saldo),
                    },
                  ]}
                  emptyText="No hay vencimientos para mostrar."
                  renderItem={(item) => (
                    <div key={item.id} className="rounded-[18px] border border-slate-200 bg-white/85 p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-[11px] text-slate-500">{item.cantidad} documentos</p>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">{item.saldo}</p>
                      </div>
                    </div>
                  )}
                />
              </div>

              <div className="min-h-0 xl:col-span-3">
                <ListPanel
                  title="Clientes con deuda"
                  subtitle=""
                  items={clientesConDeuda}
                  emptyText="Sin clientes con deuda."
                  tone="rose"
                  scrollable
                  panelHeight="calc(100vh - 24rem)"
                  maxBodyHeight="calc(100vh - 28rem)"
                  renderItem={(item) => (
                    <div key={item.id} className="rounded-[18px] border border-rose-100 bg-white/90 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.nombre}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{item.ventas_pendientes} ventas pendientes</p>
                        </div>
                        <p className="text-xs font-semibold text-rose-700">{formatArs(item.deuda)}</p>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">Ultimo cobro: {item.ultimo_cobro || "-"}</p>
                    </div>
                  )}
                />
              </div>
            </section>
          </div>
        ) : null}
        {isFilterOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.65)]">
              <Button
                type="button"
                className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500"
                whileHover={{ scale: 1.04 }}
                onClick={() => setIsFilterOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
              <div className="pr-10 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Filtros
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                  Ajusta el periodo y los focos del dashboard
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Usa filtros activos y deja una lectura mas limpia para la decision.
                </p>
              </div>
              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Fecha desde</label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                    <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="date"
                      className="w-full bg-transparent py-3 text-sm text-slate-700 outline-none"
                      value={filters.fechaDesde}
                      onChange={(event) => handleChange("fechaDesde", event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Fecha hasta</label>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                    <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="date"
                      className="w-full bg-transparent py-3 text-sm text-slate-700 outline-none"
                      value={filters.fechaHasta}
                      onChange={(event) => handleChange("fechaHasta", event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Cliente</label>
                  <SearchableSelect
                    options={clienteOptions}
                    value={filters.cliente}
                    onChange={(value) => handleChange("cliente", value)}
                    placeholder="Todos"
                    wrapperClassName="mt-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Proveedor</label>
                  <SearchableSelect
                    options={proveedorOptions}
                    value={filters.proveedor}
                    onChange={(value) => handleChange("proveedor", value)}
                    placeholder="Todos"
                    wrapperClassName="mt-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Forma de pago</label>
                  <select
                    className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none"
                    value={filters.formaPago}
                    onChange={(event) => handleChange("formaPago", event.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="contado">Contado</option>
                    <option value="contado pendiente">Contado pendiente</option>
                    <option value="cuenta corriente">Cuenta corriente</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Estado cobro</label>
                  <select
                    className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none"
                    value={filters.estadoCobro}
                    onChange={(event) => handleChange("estadoCobro", event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="cobrado">Cobrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Estado pago</label>
                  <select
                    className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none"
                    value={filters.estadoPago}
                    onChange={(event) => handleChange("estadoPago", event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="pagado">Pagado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700">Medio de pago</label>
                  <select
                    className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none"
                    value={filters.medioPago}
                    onChange={(event) => handleChange("medioPago", event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.6)]"
                    whileHover={{ scale: 1.01, y: -1 }}
                  >
                    <FunnelIcon className="h-4 w-4" />
                    Aplicar filtros
                  </Button>
                  <Button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                    whileHover={{ scale: 1.01, y: -1 }}
                    onClick={handleClear}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
