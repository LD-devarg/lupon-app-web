import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { API_BASE } from "../services/api/base";
import { cambiarEstadoVenta, getVenta, getVentas } from "../services/api/ventas";
import { geocodeAddress, getCoordsForVenta } from "../services/api/logistica";
import RouteMap from "../components/logistica/RouteMap";
import { useHeaderTitle } from "../layouts/DesktopLayout";
import { FunnelIcon } from "@heroicons/react/24/outline";

const ESTADO_BADGE = {
    pendiente: "bg-stone-800 text-stone-400 border border-stone-700/50",
    confirmada: "bg-blue-950/40 text-blue-300 border border-blue-800/40",
    en_camino: "bg-amber-950/40 text-amber-300 border border-amber-800/40",
    entregada: "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40",
    cancelada: "bg-rose-950/40 text-rose-300 border border-rose-800/40",
};

const ESTADO_LABEL = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    en_camino: "En Camino",
    entregada: "Entregada",
    cancelada: "Cancelada",
};

export default function Logistica() {
    const { setTitle } = useHeaderTitle();
    const documentosBase = API_BASE.replace(/\/api\/?$/, "");
    const [ventas, setVentas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [coordsByVentaId, setCoordsByVentaId] = useState({});
    const [viewMode, setViewMode] = useState("lista");
    const [isLoading, setIsLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [error, setError] = useState("");
    const [geoError, setGeoError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalError, setModalError] = useState("");
    const [modalOk, setModalOk] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState(null);

    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [clienteFilter, setClienteFilter] = useState("");
    const [fechaFilter, setFechaFilter] = useState("");

    // Set page header title
    useEffect(() => {
        setTitle("Logística");
    }, [setTitle]);

    const loadData = async () => {
        setError("");
        try {
            setIsLoading(true);
            const [ventasData, clientesData, productosData] = await Promise.all([
                getVentas(),
                getClientes(),
                getProductos(),
            ]);
            // Filter to show active logistics sales (confirmada or en_camino)
            const activeVentas = (ventasData || []).filter(
                v => v.estado_venta === "confirmada" || v.estado_venta === "en_camino"
            );
            setVentas(activeVentas);
            setClientes(clientesData || []);
            setProductos(productosData || []);
        } catch (err) {
            setError(err?.message || "No se pudieron cargar las ventas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const clientesById = useMemo(() => clientes.reduce((a, c) => ({ ...a, [String(c.id)]: c }), {}), [clientes]);
    const productosById = useMemo(() => productos.reduce((a, p) => ({ ...a, [String(p.id)]: p }), {}), [productos]);

    const sortedClientes = useMemo(() => {
        return [...clientes].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    }, [clientes]);

    const filteredVentas = useMemo(() => {
        return ventas.filter(venta => {
            if (clienteFilter && String(venta.cliente) !== String(clienteFilter)) {
                return false;
            }
            if (fechaFilter) {
                const ventaDate = venta.fecha_venta ? String(venta.fecha_venta).split("T")[0] : "";
                if (ventaDate !== fechaFilter) {
                    return false;
                }
            }
            return true;
        });
    }, [ventas, clienteFilter, fechaFilter]);

    // Resolve coordinates for address geolocation
    useEffect(() => {
        let cancelled = false;
        async function resolveCoords() {
            setGeoError("");
            const missing = ventas.filter(v => !Object.prototype.hasOwnProperty.call(coordsByVentaId, String(v.id)));
            if (missing.length === 0) return;
            setIsGeocoding(true);
            const nextState = {};
            try {
                for (const venta of missing) {
                    const cli = clientesById[String(venta.cliente)];
                    const addr = venta.direccion_entrega || cli?.direccion || "";
                    nextState[String(venta.id)] = addr.trim() ? await geocodeAddress(addr) : null;
                }
                if (!cancelled) setCoordsByVentaId(prev => ({ ...prev, ...nextState }));
            } catch (err) {
                if (!cancelled) setGeoError(err?.message || "Error al geocodificar.");
            } finally {
                if (!cancelled) setIsGeocoding(false);
            }
        }
        resolveCoords();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ventas, clientesById]);

    const handleVer = async (ventaId) => {
        setModalError("");
        setModalOk("");
        try {
            const data = await getVenta(ventaId);
            setSelectedVenta(data);
            setIsModalOpen(true);
        } catch (err) {
            setError(err?.message || "No se pudo cargar la venta.");
        }
    };

    const handleEntregar = async (ventaId) => {
        setError("");
        try {
            await cambiarEstadoVenta(ventaId, "entregada");
            await loadData();
        } catch (err) {
            setError(err?.message || "No se pudo marcar como entregada.");
        }
    };

    const handleCambiarEstadoModal = async (nuevoEstado) => {
        if (!selectedVenta) return;
        setModalError("");
        setModalOk("");
        try {
            setIsSaving(true);
            await cambiarEstadoVenta(selectedVenta.id, nuevoEstado);
            setModalOk(`Estado cambiado a: ${ESTADO_LABEL[nuevoEstado]}`);
            await loadData();
        } catch (err) {
            setModalError(err?.message || "No se pudo cambiar el estado.");
        } finally {
            setIsSaving(false);
        }
    };

    const formatArs = (v) => {
        if (v == null || v === "") return "-";
        return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(v));
    };

    return (
        <div className="mx-auto w-full max-w-[1400px] p-2 text-left text-white">
            {/* View Mode Switcher Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <p className="text-sm text-stone-400 font-medium">Vista operativa de ventas en reparto.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${isFilterOpen || clienteFilter || fechaFilter
                            ? "bg-[#CAED4E] text-black border-transparent shadow-md"
                            : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
                            }`}
                    >
                        <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
                        Filtros {(clienteFilter || fechaFilter) && "(Activo)"}
                    </Button>
                    <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800">
                        <button
                            type="button"
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${viewMode === "lista"
                                ? "bg-[#CAED4E] text-black shadow-md"
                                : "text-stone-400 hover:text-white"
                                }`}
                            onClick={() => setViewMode("lista")}
                        >
                            Listado
                        </button>
                        <button
                            type="button"
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${viewMode === "mapa"
                                ? "bg-[#CAED4E] text-black shadow-md"
                                : "text-stone-400 hover:text-white"
                                }`}
                            onClick={() => setViewMode("mapa")}
                        >
                            Mapa de Reparto
                        </button>
                    </div>
                </div>
            </div>

            {/* Toggleable Filters Panel */}
            {isFilterOpen && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-stone-800 bg-[#111111] p-5 shadow-lg items-end">
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Cliente</label>
                        <select
                            value={clienteFilter}
                            onChange={e => setClienteFilter(e.target.value)}
                            className="w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
                        >
                            <option value="">Todos los clientes</option>
                            {sortedClientes.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Fecha</label>
                        <input
                            type="date"
                            value={fechaFilter}
                            onChange={e => setFechaFilter(e.target.value)}
                            className="w-8/10 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-stone-850 text-stone-300 hover:bg-stone-800 border border-stone-800 transition duration-200 flex-1 h-[42px]"
                            onClick={() => {
                                setClienteFilter("");
                                setFechaFilter("");
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                </div>
            )}

            {/* Info and Status Alerts */}
            {isGeocoding && (
                <div className="mb-4 rounded-xl border border-blue-900/30 bg-blue-950/20 px-4 py-3 text-xs text-blue-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    Geocodificando direcciones en segundo plano...
                </div>
            )}
            {error && (
                <div className="mb-4 rounded-xl border border-rose-900/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
                    {error}
                </div>
            )}
            {geoError && (
                <div className="mb-4 rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-300">
                    {geoError}
                </div>
            )}
            {isLoading && (
                <div className="text-center py-12 text-stone-400">
                    <span className="inline-block w-6 h-6 border-2 border-[#CAED4E] border-t-transparent rounded-full animate-spin mr-2" />
                    Cargando ventas...
                </div>
            )}
            {!isLoading && ventas.length === 0 && (
                <div className="text-center py-12 rounded-2xl border border-dashed border-stone-800 text-stone-500">
                    No hay ventas activas en reparto.
                </div>
            )}
            {!isLoading && ventas.length > 0 && filteredVentas.length === 0 && (
                <div className="text-center py-12 rounded-2xl border border-dashed border-stone-800 text-stone-500">
                    No se encontraron ventas que coincidan con los filtros aplicados.
                </div>
            )}

            {/* List View */}
            {!isLoading && filteredVentas.length > 0 && viewMode === "lista" && (
                <div className="overflow-x-auto rounded-2xl border border-stone-800/80 bg-stone-900/10 shadow-xl">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-stone-800 bg-stone-950/50 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                <th className="px-5 py-4">Venta</th>
                                <th className="px-5 py-4">Cliente</th>
                                <th className="px-5 py-4">Dirección de Entrega</th>
                                <th className="px-5 py-4">Total</th>
                                <th className="px-5 py-4">Estado</th>
                                <th className="px-5 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-900 text-sm">
                            {filteredVentas.map(venta => {
                                const cli = clientesById[String(venta.cliente)];
                                const puedeEntregar = venta.estado_venta === "en_camino";
                                const puedeSalir = venta.estado_venta === "confirmada";
                                return (
                                    <tr key={venta.id} className="hover:bg-stone-900/30 transition duration-150">
                                        <td className="px-5 py-4 font-bold text-stone-200">#{venta.id}</td>
                                        <td className="px-5 py-4 text-stone-300 font-medium">{cli?.nombre || venta.cliente}</td>
                                        <td className="px-5 py-4 text-stone-400">
                                            <div className="flex flex-col">
                                                <span>{venta.direccion_entrega || cli?.direccion || "-"}</span>
                                                {getCoordsForVenta(coordsByVentaId, venta.id) && (
                                                    <span className="text-[10px] text-emerald-400/80 mt-0.5">✓ Geolocalizada</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-stone-200 font-semibold">{formatArs(venta.total)}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[venta.estado_venta] || "bg-stone-800 text-stone-400"}`}>
                                                {ESTADO_LABEL[venta.estado_venta] || venta.estado_venta}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end items-center gap-2">
                                                {puedeSalir && (
                                                    <Button
                                                        type="button"
                                                        className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition"
                                                        onClick={() => cambiarEstadoVenta(venta.id, "en_camino").then(() => loadData()).catch(e => setError(e?.message))}
                                                    >
                                                        Salir
                                                    </Button>
                                                )}
                                                {puedeEntregar && (
                                                    <Button
                                                        type="button"
                                                        className="rounded-lg bg-[#CAED4E] text-black hover:opacity-90 px-3 py-1.5 text-xs font-semibold transition"
                                                        onClick={() => handleEntregar(venta.id)}
                                                    >
                                                        Entregar
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    className="rounded-lg bg-stone-800 hover:bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-200 transition"
                                                    onClick={() => handleVer(venta.id)}
                                                >
                                                    Ver
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="rounded-lg bg-stone-800 hover:bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-200 transition"
                                                    onClick={() => window.open(`${documentosBase}/documentos/ventas/${venta.id}/pdf/`, "_blank", "noopener")}
                                                >
                                                    PDF
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Map View */}
            {!isLoading && filteredVentas.length > 0 && viewMode === "mapa" && (
                <RouteMap
                    ventas={filteredVentas}
                    coordsByVentaId={coordsByVentaId}
                    clientesById={clientesById}
                />
            )}

            {/* Sale Details Modal */}
            {isModalOpen && selectedVenta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-stone-900 border border-stone-800 p-6 text-left shadow-2xl text-white">
                        <button
                            type="button"
                            className="absolute right-4 top-4 rounded-md p-1 text-stone-400 hover:text-white hover:bg-stone-800 transition"
                            onClick={() => { setIsModalOpen(false); setSelectedVenta(null); }}
                        >
                            ✕
                        </button>

                        <h3 className="text-lg font-bold text-white mb-1">Venta #{selectedVenta.id}</h3>
                        <p className="text-sm text-stone-400">Cliente: <span className="text-stone-200 font-medium">{clientesById[String(selectedVenta.cliente)]?.nombre || selectedVenta.cliente}</span></p>

                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-sm text-stone-400">Estado de entrega:</span>
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[selectedVenta.estado_venta] || "bg-stone-800 text-stone-400"}`}>
                                {ESTADO_LABEL[selectedVenta.estado_venta] || selectedVenta.estado_venta}
                            </span>
                        </div>

                        {modalError && <p className="mt-3 text-xs text-rose-400">{modalError}</p>}
                        {modalOk && <p className="mt-3 text-xs text-emerald-400">{modalOk}</p>}

                        <div className="mt-6 space-y-3">
                            <p className="text-sm font-semibold text-stone-300 border-b border-stone-800 pb-2">Artículos del Pedido</p>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {selectedVenta.detalles?.map(d => (
                                    <div key={d.id} className="rounded-xl border border-stone-800 bg-stone-950/40 p-3 text-sm flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-stone-200">{productosById[String(d.producto)]?.nombre || `Producto #${d.producto}`}</p>
                                            <p className="text-xs text-stone-500 mt-0.5">Precio Unitario: {formatArs(d.precio_unitario)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-[#CAED4E] bg-[#CAED4E]/10 px-2 py-1 rounded-md">x{d.cantidad}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 border-t border-stone-800 pt-4">
                            {selectedVenta.estado_venta === "confirmada" && (
                                <Button
                                    type="button"
                                    className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition"
                                    onClick={() => handleCambiarEstadoModal("en_camino")}
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Guardando..." : "Marcar En Camino"}
                                </Button>
                            )}
                            {selectedVenta.estado_venta === "en_camino" && (
                                <Button
                                    type="button"
                                    className="rounded-xl bg-[#CAED4E] text-black hover:opacity-90 px-4 py-2.5 text-sm font-semibold transition"
                                    onClick={() => handleCambiarEstadoModal("entregada")}
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Guardando..." : "Marcar Entregada"}
                                </Button>
                            )}
                            <button
                                type="button"
                                className="rounded-xl bg-stone-800 hover:bg-stone-700 px-4 py-2.5 text-sm font-semibold text-stone-300 transition"
                                onClick={() => { setIsModalOpen(false); setSelectedVenta(null); }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
