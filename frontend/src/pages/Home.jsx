import { useEffect } from "react";
import { useHeaderTitle } from "../layouts/DesktopLayout";
import CardData from "../components/ui/CardData";
import {
    ArrowsRightLeftIcon,
    ChartBarIcon,
    BanknotesIcon,
    ExclamationTriangleIcon,
    ShoppingBagIcon,
    BuildingStorefrontIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useDashboardData } from "../hooks/useDashboardData";

function DetailCard({ icon: Icon, title, value, lines, footer, tone = "slate" }) {
    const toneClasses = {
        slate: "border-stone-850 bg-stone-900/30 hover:border-stone-750",
        rose: "border-rose-950/40 bg-rose-950/10 hover:border-rose-900/40 text-rose-200",
        amber: "border-amber-950/40 bg-amber-950/10 hover:border-amber-900/40 text-amber-200",
    };

    return (
        <article
            className={`h-fit min-h-[200px] self-start rounded-2xl border p-5 text-left transition duration-300 hover:-translate-y-1 ${toneClasses[tone] || toneClasses.slate}`}
        >
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{title}</p>
                    <p className="mt-1 text-2xl font-bold text-white tracking-tight">{value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-850/50 text-stone-400 border border-white/5 flex-shrink-0">
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
            </div>

            {lines && lines.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                    {lines.map((line) => (
                        <div key={line.label} className="flex items-center justify-between gap-3 text-xs">
                            <p className="text-stone-400">{line.label}</p>
                            <p className="font-semibold text-white">{line.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {footer && (
                <p className={`mt-3 text-xs font-medium ${tone === "rose" ? "text-rose-400" : tone === "amber" ? "text-amber-400" : "text-stone-400"}`}>
                    {footer}
                </p>
            )}
        </article>
    );
}

function ListPanel({ title, subtitle, items, emptyText, renderItem, tone = "slate", scrollable = false, maxBodyHeight = "auto" }) {
    const toneClasses = {
        slate: "border-stone-850 bg-stone-900/30",
        rose: "border-rose-950/40 bg-rose-950/10",
    };

    return (
        <section
            className={`flex flex-col rounded-2xl border p-5 text-left ${toneClasses[tone] || toneClasses.slate}`}
        >
            <h4 className="text-base font-bold text-white">{title}</h4>
            {subtitle ? <p className="mt-1 text-xs text-stone-400">{subtitle}</p> : null}
            <div
                className={`mt-4 space-y-3 ${scrollable ? "overflow-y-auto no-scrollbar" : ""}`}
                style={scrollable && maxBodyHeight !== "auto" ? { maxHeight: maxBodyHeight } : undefined}
            >
                {items.length === 0 ? <p className="text-sm text-stone-500">{emptyText}</p> : null}
                {items.map(renderItem)}
            </div>
        </section>
    );
}

export default function Home() {
    const { setTitle } = useHeaderTitle();
    const {
        data,
        isLoading,
        error,
        computedMetrics,
        formatArs,
        formatCompactArs,
        formatRatio,
        safeRatio,
    } = useDashboardData();

    useEffect(() => {
        setTitle("Inicio");
    }, [setTitle]);

    const {
        flujoNeto,
        gananciaBruta,
        margenBruto,
        ventasTotal,
        ventasCobradas,
        ventasParciales,
        ventasPendientes,
        comprasTotal,
        comprasPagadas,
        comprasParciales,
        comprasPendientesMonto,
        deudaClientes,
        deudaProveedores,
        ingresosTotal,
        ingresosEfectivo,
        ingresosTransferencia,
        egresosTotal,
        clientesConDeuda = [],
        comprasPendientes = [],
        documentosPorVencer = {},
        documentosVencidos = {},
    } = computedMetrics || {};

    const metricsData = [
        {
            title: "Flujo neto",
            value: data ? formatArs(flujoNeto) : "...",
            description: data
                ? `${flujoNeto >= 0 ? "Caja positiva" : "Caja en tensión"} (${formatCompactArs(ingresosTotal)} / ${formatCompactArs(egresosTotal)})`
                : "Cargando...",
            icon: ArrowsRightLeftIcon,
        },
        {
            title: "Ganancia",
            value: data ? formatArs(gananciaBruta) : "...",
            description: data
                ? `${margenBruto >= 0.3 ? "Margen alto" : "Margen bajo"} (${formatRatio(margenBruto)})`
                : "Cargando...",
            icon: ChartBarIcon,
        },
        {
            title: "Ventas cobradas",
            value: data ? formatArs(ventasCobradas) : "...",
            description: data
                ? `${formatRatio(ventasTotal ? (ventasCobradas / ventasTotal) : 0)} cobrado (${formatCompactArs(ventasPendientes)} pendiente)`
                : "Cargando...",
            icon: BanknotesIcon,
        },
        {
            title: "Deuda clientes",
            value: data ? formatArs(deudaClientes) : "...",
            description: data
                ? `${clientesConDeuda.length} clientes con deuda activa`
                : "Cargando...",
            icon: ExclamationTriangleIcon,
        },
    ];

    const operationalCards = [
        {
            icon: ShoppingBagIcon,
            title: "Ventas totales",
            value: data ? formatArs(ventasTotal) : "...",
            lines: [
                { label: "Cobradas", value: formatArs(ventasCobradas) },
                { label: "Parciales", value: formatArs(ventasParciales) },
                { label: "Pendientes", value: formatArs(ventasPendientes) },
            ],
            footer: data ? `${formatRatio(safeRatio(ventasPendientes, ventasTotal))} pendiente` : "",
        },
        {
            icon: BuildingStorefrontIcon,
            title: "Compras totales",
            value: data ? formatArs(comprasTotal) : "...",
            lines: [
                { label: "Pagadas", value: formatArs(comprasPagadas) },
                { label: "Parciales", value: formatArs(comprasParciales) },
                { label: "Pendientes", value: formatArs(comprasPendientesMonto) },
            ],
            footer: data ? `${formatRatio(safeRatio(comprasPendientesMonto, comprasTotal))} pendiente` : "",
        },
        {
            icon: BanknotesIcon,
            title: "Ingresos en efectivo",
            value: data ? formatArs(ingresosEfectivo) : "...",
            lines: [
                { label: "Peso sobre caja", value: formatRatio(safeRatio(ingresosEfectivo, ingresosTotal)) },
                { label: "Total ingresos", value: formatArs(ingresosTotal) },
            ],
            footer: "Liquidez inmediata",
        },
        {
            icon: ArrowsRightLeftIcon,
            title: "Transferencias",
            value: data ? formatArs(ingresosTransferencia) : "...",
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
            value: data ? formatArs(deudaClientes) : "...",
            lines: [
                { label: "Sobre ventas", value: formatRatio(safeRatio(deudaClientes, ventasTotal)) },
                { label: "Clientes expuestos", value: String(clientesConDeuda.length) },
                { label: "Documentos vencidos", value: String(documentosVencidos.cantidad || 0) },
            ],
            footer: data ? `Vencido: ${formatArs(documentosVencidos.saldo)}` : "",
            tone: "rose",
        },
        {
            icon: ChartBarIcon,
            title: "Deuda proveedores",
            value: data ? formatArs(deudaProveedores) : "...",
            lines: [
                { label: "Sobre compras", value: formatRatio(safeRatio(deudaProveedores, comprasTotal)) },
                { label: "Compras pendientes", value: String(comprasPendientes.length) },
                { label: "Pendiente informado", value: formatArs(comprasPendientesMonto) },
            ],
            footer: "Seguir pagos",
            tone: "amber",
        },
    ];

    const vencimientosItems = [
        {
            id: "hoy",
            label: "Hoy",
            cantidad: documentosPorVencer?.hoy?.cantidad || 0,
            saldo: formatArs(documentosPorVencer?.hoy?.saldo),
        },
        {
            id: "7dias",
            label: "Próximos 7 días",
            cantidad: documentosPorVencer?.proximos_7_dias?.cantidad || 0,
            saldo: formatArs(documentosPorVencer?.proximos_7_dias?.saldo),
        },
        {
            id: "30dias",
            label: "Próximos 30 días",
            cantidad: documentosPorVencer?.proximos_30_dias?.cantidad || 0,
            saldo: formatArs(documentosPorVencer?.proximos_30_dias?.saldo),
        },
        {
            id: "vencidos",
            label: "Vencidos",
            cantidad: documentosVencidos?.cantidad || 0,
            saldo: formatArs(documentosVencidos?.saldo),
        },
    ];

    return (
        <div className="space-y-4 text-white px-2">
            {error && (
                <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-left text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {isLoading && !data
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="animate-pulse rounded-2xl bg-stone-900/40 border border-stone-800 h-32"
                        />
                    ))
                    : metricsData.map((item, index) => (
                        <CardData key={index} {...item} />
                    ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Detailed operational and risk cards column (2fr width on desktop) */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
                    {isLoading && !data
                        ? Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="animate-pulse rounded-2xl bg-stone-900/40 border border-stone-800 h-48"
                            />
                        ))
                        : [
                            ...operationalCards.map((card) => (
                                <DetailCard key={card.title} {...card} />
                            )),
                            ...riskCards.map((card) => (
                                <DetailCard key={card.title} {...card} />
                            )),
                        ]}
                </div>

                {/* Lists and Panels column (1fr width on desktop) */}
                <div className="lg:col-span-1 space-y-2 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto no-scrollbar">
                    {isLoading && !data
                        ? Array.from({ length: 2 }).map((_, index) => (
                            <div
                                key={index}
                                className="animate-pulse rounded-2xl bg-stone-900/40 border border-stone-800 h-64"
                            />
                        ))
                        : (
                            <>
                                <ListPanel
                                    title="Clientes con deuda"
                                    items={clientesConDeuda}
                                    emptyText="Sin clientes con deuda."
                                    tone="rose"
                                    scrollable={true}
                                    maxBodyHeight="300px"
                                    renderItem={(item) => (
                                        <div key={item.id} className="rounded-xl border border-rose-950/40 bg-stone-950/40 p-4 shadow-md">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{item.nombre}</p>
                                                    <p className="mt-1 text-xs text-stone-500">{item.ventas_pendientes} ventas pendientes</p>
                                                </div>
                                                <p className="text-sm font-bold text-rose-400">{formatArs(item.deuda)}</p>
                                            </div>
                                            <p className="mt-2 text-xs text-stone-500">Último cobro: {item.ultimo_cobro || "-"}</p>
                                        </div>
                                    )}
                                />
                                <ListPanel
                                    title="Vencimientos"
                                    items={vencimientosItems}
                                    emptyText="No hay vencimientos para mostrar."
                                    scrollable={true}
                                    maxBodyHeight="200px"
                                    renderItem={(item) => (
                                        <div key={item.id} className="rounded-xl border border-stone-800 bg-stone-950/40 p-4 shadow-md">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{item.label}</p>
                                                    <p className="text-xs text-stone-500">{item.cantidad} documentos</p>
                                                </div>
                                                <p className="text-sm font-bold text-white">{item.saldo}</p>
                                            </div>
                                        </div>
                                    )}
                                />
                            </>
                        )}
                </div>
            </div>
        </div>
    );
}