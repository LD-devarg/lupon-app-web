import { useEffect, useMemo, useState } from "react";
import {
    CircleMarker,
    MapContainer,
    Polyline,
    Popup,
    TileLayer,
    Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import Button from "../components/ui/Button";
import ButtonDef from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { API_BASE } from "../services/api/base";
import { cambiarEstadoVenta, getVenta, getVentas } from "../services/api/ventas";

const DEFAULT_CENTER = [-34.6037, -58.3816];
const GEOCODE_CACHE_KEY = "lupon-logistica-geocode-v2";

const ESTADO_BADGE = {
    pendiente:  "bg-yellow-100 text-yellow-800",
    confirmada: "bg-blue-100 text-blue-800",
    en_camino:  "bg-orange-100 text-orange-800",
    entregada:  "bg-green-200 text-green-800",
    cancelada:  "bg-red-200 text-red-800",
};

const ESTADO_LABEL = {
    pendiente:  "Pendiente",
    confirmada: "Confirmada",
    en_camino:  "En Camino",
    entregada:  "Entregada",
    cancelada:  "Cancelada",
};

function readGeocodeCache() {
    try {
        const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function writeGeocodeCache(cache) {
    try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)); } catch { }
}

function buildAddress(value) {
    const base = String(value || "").trim();
    if (!base) return "";
    const lowered = base.toLowerCase();
    if (lowered.includes("argentina")) return base;
    if (lowered.includes("buenos aires")) return `${base}, Argentina`;
    return `${base}, Buenos Aires, Argentina`;
}

async function geocodeAddress(rawAddress) {
    const address = buildAddress(rawAddress);
    if (!address) return null;
    const cache = readGeocodeCache();
    if (cache[address]) return cache[address];
    const query = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ar", q: address });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${query}`);
    if (!res.ok) throw new Error("No se pudo geocodificar.");
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
        cache[address] = null;
        writeGeocodeCache(cache);
        return null;
    }
    const first = results[0];
    const payload = { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name || address };
    cache[address] = payload;
    writeGeocodeCache(cache);
    return payload;
}

function getCoordsForVenta(coordsByVentaId, ventaId) {
    const item = coordsByVentaId[String(ventaId)];
    if (!item || typeof item.lat !== "number") return null;
    return item;
}

function RouteMap({ ventas, coordsByVentaId, clientesById }) {
    const routePoints = ventas
        .map(venta => ({ venta, coords: getCoordsForVenta(coordsByVentaId, venta.id), cliente: clientesById[String(venta.cliente)] }))
        .filter(item => item.coords);
    const center = routePoints[0] ? [routePoints[0].coords.lat, routePoints[0].coords.lng] : DEFAULT_CENTER;
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: "560px", width: "100%" }}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {routePoints.length > 1 && (
                        <Polyline positions={routePoints.map(i => [i.coords.lat, i.coords.lng])} pathOptions={{ color: "#0f766e", weight: 4 }} />
                    )}
                    {routePoints.map((item, index) => (
                        <CircleMarker key={item.venta.id} center={[item.coords.lat, item.coords.lng]} radius={12} pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.9 }}>
                            <Tooltip permanent direction="center" opacity={1}><span className="text-xs font-bold text-white">{index + 1}</span></Tooltip>
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-semibold">Venta #{item.venta.id}</p>
                                    <p>{item.cliente?.nombre || item.venta.cliente}</p>
                                    <p>{item.venta.direccion_entrega || item.cliente?.direccion || "-"}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>
            <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800">Paso a paso</h3>
                <div className="mt-3 space-y-3">
                    {ventas.map((venta, index) => {
                        const cliente = clientesById[String(venta.cliente)];
                        const coords = getCoordsForVenta(coordsByVentaId, venta.id);
                        return (
                            <div key={venta.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Parada {index + 1}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-800">Venta #{venta.id}</p>
                                <p className="text-sm text-gray-700">{cliente?.nombre || venta.cliente}</p>
                                <p className="text-sm text-gray-600">{venta.direccion_entrega || cliente?.direccion || "-"}</p>
                                <p className="mt-1 text-xs text-gray-500">{coords ? coords.displayName || "Ubicada" : "Sin geocoding"}</p>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </div>
    );
}

export default function Logistica() {
    const documentosBase = API_BASE.replace(/\/api\/?$/, "");
    const [estadoFiltro, setEstadoFiltro] = useState("en_camino");
    const [clienteFiltro, setClienteFiltro] = useState("");
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

    const loadData = async (estadoParam = estadoFiltro) => {
        setError("");
        try {
            setIsLoading(true);
            const [ventasData, clientesData, productosData] = await Promise.all([
                getVentas({ estadoVenta: estadoParam || undefined }),
                getClientes(),
                getProductos(),
            ]);
            setVentas(ventasData || []);
            setClientes(clientesData || []);
            setProductos(productosData || []);
        } catch (err) {
            setError(err?.message || "No se pudieron cargar las ventas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const clientesById = useMemo(() => clientes.reduce((a, c) => ({ ...a, [String(c.id)]: c }), {}), [clientes]);
    const productosById = useMemo(() => productos.reduce((a, p) => ({ ...a, [String(p.id)]: p }), {}), [productos]);

    const filteredVentas = useMemo(() => {
        const q = clienteFiltro.trim().toLowerCase();
        if (!q) return ventas;
        return ventas.filter(v => (clientesById[String(v.cliente)]?.nombre || "").toLowerCase().includes(q));
    }, [ventas, clienteFiltro, clientesById]);

    useEffect(() => {
        let cancelled = false;
        async function resolveCoords() {
            setGeoError("");
            const missing = filteredVentas.filter(v => !Object.prototype.hasOwnProperty.call(coordsByVentaId, String(v.id)));
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
    }, [filteredVentas, clientesById]);

    const handleBuscar = (e) => { e.preventDefault(); loadData(estadoFiltro); };

    const handleVer = async (ventaId) => {
        setModalError(""); setModalOk("");
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
            await loadData(estadoFiltro);
        } catch (err) {
            setError(err?.message || "No se pudo marcar como entregada.");
        }
    };

    const handleCambiarEstadoModal = async (nuevoEstado) => {
        if (!selectedVenta) return;
        setModalError(""); setModalOk("");
        try {
            setIsSaving(true);
            await cambiarEstadoVenta(selectedVenta.id, nuevoEstado);
            setModalOk(`Estado cambiado a: ${ESTADO_LABEL[nuevoEstado]}`);
            await loadData(estadoFiltro);
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
        <div className="mx-auto mt-2 w-full max-w-[1400px] p-4 text-left">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Logística</h2>
                    <p className="mt-1 text-sm text-gray-600">Vista operativa de ventas en reparto.</p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" className={`rounded-xl px-4 py-2 text-sm font-medium ${viewMode === "lista" ? "bg-teal-700 text-white" : "bg-neutral-200 text-gray-700"}`} onClick={() => setViewMode("lista")}>Lista</Button>
                    <Button type="button" className={`rounded-xl px-4 py-2 text-sm font-medium ${viewMode === "mapa" ? "bg-teal-700 text-white" : "bg-neutral-200 text-gray-700"}`} onClick={() => setViewMode("mapa")}>Mapa</Button>
                </div>
            </div>

            <form className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[200px_minmax(0,1fr)_auto_auto] mb-4" onSubmit={handleBuscar}>
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <select className="mt-1 rounded-xl border border-gray-300 bg-gray-50 p-2 text-sm" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="en_camino">En Camino</option>
                        <option value="entregada">Entregada</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Cliente</label>
                    <input type="text" placeholder="Filtrar por nombre" className="mt-1 rounded-xl border border-gray-300 bg-gray-50 p-2 text-sm" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} />
                </div>
                <Button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200">Filtrar</Button>
                <Button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200" onClick={() => { setEstadoFiltro("en_camino"); setClienteFiltro(""); loadData("en_camino"); }}>Limpiar</Button>
            </form>

            {isGeocoding && <p className="text-sm text-blue-700 mb-2">Geocodificando direcciones...</p>}
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            {geoError && <p className="text-sm text-amber-700 mb-2">{geoError}</p>}
            {isLoading && <p className="text-sm text-gray-600">Cargando...</p>}
            {!isLoading && filteredVentas.length === 0 && <p className="text-sm text-gray-600">No hay ventas para mostrar.</p>}

            {!isLoading && filteredVentas.length > 0 && viewMode === "lista" && (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="grid grid-cols-[80px_minmax(180px,1.1fr)_minmax(200px,1.3fr)_130px_120px_240px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <span>Venta</span><span>Cliente</span><span>Dirección</span><span>Total</span><span>Estado</span><span>Acciones</span>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {filteredVentas.map(venta => {
                            const cli = clientesById[String(venta.cliente)];
                            const puedeEntregar = venta.estado_venta === "en_camino";
                            const puedeSalir = venta.estado_venta === "confirmada";
                            return (
                                <div key={venta.id} className="grid grid-cols-[80px_minmax(180px,1.1fr)_minmax(200px,1.3fr)_130px_120px_240px] gap-3 px-4 py-3 text-sm bg-white">
                                    <div className="flex items-center font-semibold text-gray-800">#{venta.id}</div>
                                    <div className="flex items-center text-gray-700">{cli?.nombre || venta.cliente}</div>
                                    <div className="flex flex-col justify-center text-gray-700">
                                        <span>{venta.direccion_entrega || cli?.direccion || "-"}</span>
                                        <span className="text-xs text-gray-400">{getCoordsForVenta(coordsByVentaId, venta.id) ? "Geocodificada" : ""}</span>
                                    </div>
                                    <div className="flex items-center text-gray-700">{formatArs(venta.total)}</div>
                                    <div className="flex items-center">
                                        <span className={`rounded-full px-2 py-1 text-xs ${ESTADO_BADGE[venta.estado_venta] || "bg-gray-100 text-gray-700"}`}>
                                            {ESTADO_LABEL[venta.estado_venta] || venta.estado_venta}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {puedeSalir && (
                                            <Button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white" onClick={() => cambiarEstadoVenta(venta.id, "en_camino").then(() => loadData(estadoFiltro)).catch(e => setError(e?.message))}>
                                                Salir
                                            </Button>
                                        )}
                                        {puedeEntregar && (
                                            <Button type="button" className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white" onClick={() => handleEntregar(venta.id)}>
                                                Entregar
                                            </Button>
                                        )}
                                        <Button type="button" className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700" onClick={() => handleVer(venta.id)}>Ver</Button>
                                        <Button type="button" className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700" onClick={() => window.open(`${documentosBase}/documentos/ventas/${venta.id}/pdf/`, "_blank", "noopener")}>PDF</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!isLoading && filteredVentas.length > 0 && viewMode === "mapa" && (
                <RouteMap ventas={filteredVentas} coordsByVentaId={coordsByVentaId} clientesById={clientesById} />
            )}

            {isModalOpen && selectedVenta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 text-left shadow-xl">
                        <Button type="button" className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100" onClick={() => { setIsModalOpen(false); setSelectedVenta(null); }}>X</Button>
                        <h3 className="text-lg font-semibold text-gray-800">Venta #{selectedVenta.id}</h3>
                        <p className="text-sm text-gray-600">Cliente: {clientesById[String(selectedVenta.cliente)]?.nombre || selectedVenta.cliente}</p>
                        <p className="text-sm text-gray-600">Estado: {ESTADO_LABEL[selectedVenta.estado_venta] || selectedVenta.estado_venta}</p>
                        {modalError && <p className="mt-2 text-sm text-red-600">{modalError}</p>}
                        {modalOk && <p className="mt-2 text-sm text-green-700">{modalOk}</p>}
                        <div className="mt-4 space-y-2">
                            <p className="text-sm font-semibold text-gray-700">Detalles</p>
                            {selectedVenta.detalles?.map(d => (
                                <div key={d.id} className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                                    <p>Producto: {productosById[String(d.producto)]?.nombre || d.producto}</p>
                                    <p>Cant: {d.cantidad} · Precio: {formatArs(d.precio_unitario)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {selectedVenta.estado_venta === "confirmada" && (
                                <Button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white" onClick={() => handleCambiarEstadoModal("en_camino")} disabled={isSaving}>
                                    Marcar En Camino
                                </Button>
                            )}
                            {selectedVenta.estado_venta === "en_camino" && (
                                <Button type="button" className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white" onClick={() => handleCambiarEstadoModal("entregada")} disabled={isSaving}>
                                    Marcar Entregada
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
