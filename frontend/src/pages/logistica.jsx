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
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { API_BASE } from "../services/api/base";
import {
  cambiarEstadoEntrega,
  getVenta,
  getVentas,
  reordenarEntregas,
  reprogramarEntrega,
} from "../services/api/ventas";

const DEFAULT_CENTER = [-34.6037, -58.3816];
const GEOCODE_CACHE_KEY = "lupon-logistica-geocode-v1";

function readGeocodeCache() {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeGeocodeCache(cache) {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache persistence failures.
  }
}

function normalizeDate(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function compareVentas(a, b) {
  const orderA = Number.isFinite(Number(a.orden_entrega))
    ? Number(a.orden_entrega)
    : Number.MAX_SAFE_INTEGER;
  const orderB = Number.isFinite(Number(b.orden_entrega))
    ? Number(b.orden_entrega)
    : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return Number(a.id) - Number(b.id);
}

function getFechaEntrega(venta) {
  return normalizeDate(venta.fecha_reprogramada || venta.fecha_entrega || "");
}

function getCoordsForVenta(coordsByVentaId, ventaId) {
  const item = coordsByVentaId[String(ventaId)];
  if (!item) return null;
  if (typeof item.lat !== "number" || typeof item.lng !== "number") return null;
  return item;
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

  const query = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "ar",
    q: address,
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`);
  if (!response.ok) {
    throw new Error("No se pudo geocodificar la direccion.");
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    cache[address] = null;
    writeGeocodeCache(cache);
    return null;
  }

  const first = results[0];
  const payload = {
    lat: Number(first.lat),
    lng: Number(first.lon),
    displayName: first.display_name || address,
  };
  cache[address] = payload;
  writeGeocodeCache(cache);
  return payload;
}

function RouteMap({ ventas, coordsByVentaId, clientesById }) {
  const routePoints = ventas
    .map((venta) => ({
      venta,
      coords: getCoordsForVenta(coordsByVentaId, venta.id),
      cliente: clientesById[String(venta.cliente)],
    }))
    .filter((item) => item.coords);

  const center = routePoints[0]
    ? [routePoints[0].coords.lat, routePoints[0].coords.lng]
    : DEFAULT_CENTER;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: "560px", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routePoints.length > 1 ? (
            <Polyline
              positions={routePoints.map((item) => [item.coords.lat, item.coords.lng])}
              pathOptions={{ color: "#0f766e", weight: 4 }}
            />
          ) : null}
          {routePoints.map((item, index) => (
            <CircleMarker
              key={item.venta.id}
              center={[item.coords.lat, item.coords.lng]}
              radius={12}
              pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.9 }}
            >
              <Tooltip permanent direction="center" opacity={1}>
                <span className="text-xs font-bold text-white">{index + 1}</span>
              </Tooltip>
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
  const today = new Date().toISOString().slice(0, 10);
  const documentosBase = API_BASE.replace(/\/api\/?$/, "");

  const [fechaEntrega, setFechaEntrega] = useState(today);
  const [cliente, setCliente] = useState("");
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [coordsByVentaId, setCoordsByVentaId] = useState({});
  const [viewMode, setViewMode] = useState("lista");
  const [draggingVentaId, setDraggingVentaId] = useState(null);
  const [dragOverVentaId, setDragOverVentaId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [geoError, setGeoError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [modalEstadoEntrega, setModalEstadoEntrega] = useState("");
  const [modalNuevaFecha, setModalNuevaFecha] = useState("");

  const loadData = async (targetDate = fechaEntrega || undefined) => {
    setError("");
    try {
      setIsLoading(true);
      const [ventasData, clientesData, productosData] = await Promise.all([
        getVentas({ fechaEntrega: targetDate }),
        getClientes(),
        getProductos(),
      ]);
      setVentas((ventasData || []).slice().sort(compareVentas));
      setClientes(clientesData || []);
      setProductos(productosData || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las ventas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(today);
  }, []);

  const clientesById = useMemo(() => {
    return clientes.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [clientes]);

  const productosById = useMemo(() => {
    return productos.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [productos]);

  const ventasOrdenadas = useMemo(() => {
    return [...ventas].sort(compareVentas);
  }, [ventas]);

  const filteredVentas = useMemo(() => {
    const clienteFiltro = cliente.trim().toLowerCase();
    if (!clienteFiltro) return ventasOrdenadas;
    return ventasOrdenadas.filter((venta) => {
      const nombreCliente =
        clientesById[String(venta.cliente)]?.nombre || "";
      return nombreCliente.toLowerCase().includes(clienteFiltro);
    });
  }, [ventasOrdenadas, cliente, clientesById]);

  const isClientFilterActive = cliente.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    async function resolveCoords() {
      setGeoError("");
      const nextState = {};
      const missingVentas = filteredVentas.filter((venta) => {
        return !Object.prototype.hasOwnProperty.call(
          coordsByVentaId,
          String(venta.id)
        );
      });

      if (missingVentas.length === 0) return;

      setIsGeocoding(true);
      try {
        for (const venta of missingVentas) {
          const clienteData = clientesById[String(venta.cliente)];
          const candidate =
            venta.direccion_entrega ||
            clienteData?.direccion ||
            "";
          if (!candidate.trim()) {
            nextState[String(venta.id)] = null;
            continue;
          }
          const coords = await geocodeAddress(candidate);
          nextState[String(venta.id)] = coords;
        }

        if (!cancelled && Object.keys(nextState).length > 0) {
          setCoordsByVentaId((prev) => ({ ...prev, ...nextState }));
        }
      } catch (err) {
        if (!cancelled) {
          setGeoError(err?.message || "No se pudieron geocodificar las direcciones.");
        }
      } finally {
        if (!cancelled) {
          setIsGeocoding(false);
        }
      }
    }

    resolveCoords();

    return () => {
      cancelled = true;
    };
  }, [filteredVentas, clientesById]);

  const handleBuscar = async (event) => {
    event.preventDefault();
    setCoordsByVentaId({});
    await loadData(fechaEntrega || undefined);
  };

  const handleLimpiar = async () => {
    setFechaEntrega(today);
    setCliente("");
    setViewMode("lista");
    setCoordsByVentaId({});
    await loadData(today);
  };

  const handleVer = async (ventaId) => {
    setModalError("");
    setModalOk("");
    try {
      const data = await getVenta(ventaId);
      setSelectedVenta(data);
      setModalEstadoEntrega(data.estado_entrega || "");
      setModalNuevaFecha("");
      setIsModalOpen(true);
    } catch (err) {
      setError(err?.message || "No se pudo cargar la venta.");
    }
  };

  const handleVerPdf = (ventaId) => {
    const url = `${documentosBase}/documentos/ventas/${ventaId}/pdf/`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedVenta(null);
    setModalEstadoEntrega("");
    setModalNuevaFecha("");
  };

  const handleSave = async () => {
    if (!selectedVenta) return;
    setModalError("");
    setModalOk("");
    try {
      setIsSaving(true);
      if (modalEstadoEntrega === "reprogramada") {
        if (!modalNuevaFecha) {
          setModalError("Selecciona una nueva fecha de entrega.");
          return;
        }
        await reprogramarEntrega(selectedVenta.id, modalNuevaFecha);
      } else {
        await cambiarEstadoEntrega(selectedVenta.id, modalEstadoEntrega);
      }
      setModalOk("Estado de entrega actualizado.");
      await loadData(fechaEntrega || undefined);
    } catch (err) {
      setModalError(err?.message || "No se pudo actualizar la entrega.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEntregar = async (ventaId) => {
    setError("");
    try {
      await cambiarEstadoEntrega(ventaId, "entregada");
      await loadData(fechaEntrega || undefined);
    } catch (err) {
      setError(err?.message || "No se pudo marcar la venta como entregada.");
    }
  };

  const handleReprogramar = async (ventaId) => {
    setError("");
    const nuevaFecha = window.prompt("Nueva fecha de entrega (YYYY-MM-DD)");
    if (!nuevaFecha) return;
    try {
      await reprogramarEntrega(ventaId, nuevaFecha);
      await loadData(fechaEntrega || undefined);
    } catch (err) {
      setError(err?.message || "No se pudo reprogramar la entrega.");
    }
  };

  const applyLocalOrder = (ventasIds) => {
    const orderById = ventasIds.reduce((acc, id, index) => {
      acc[String(id)] = index + 1;
      return acc;
    }, {});

    setVentas((prev) =>
      prev
        .map((venta) =>
          orderById[String(venta.id)]
            ? { ...venta, orden_entrega: orderById[String(venta.id)] }
            : venta
        )
        .slice()
        .sort(compareVentas)
    );
  };

  const persistOrder = async (ventasIds) => {
    if (!fechaEntrega) return;
    const snapshot = ventas;
    applyLocalOrder(ventasIds);
    try {
      setIsSavingOrder(true);
      await reordenarEntregas(fechaEntrega, ventasIds);
    } catch (err) {
      setVentas(snapshot);
      setError(err?.message || "No se pudo guardar el orden de entrega.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const moveVenta = async (ventaId, direction) => {
    if (isClientFilterActive) return;
    const current = ventasOrdenadas;
    const index = current.findIndex((item) => item.id === ventaId);
    if (index < 0) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= current.length) return;
    const next = [...current];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    await persistOrder(next.map((venta) => venta.id));
  };

  const handleDragStart = (ventaId) => {
    if (isClientFilterActive) return;
    setDraggingVentaId(ventaId);
  };

  const handleDrop = async (targetVentaId) => {
    if (isClientFilterActive || !draggingVentaId || draggingVentaId === targetVentaId) {
      setDraggingVentaId(null);
      setDragOverVentaId(null);
      return;
    }

    const current = ventasOrdenadas;
    const sourceIndex = current.findIndex((item) => item.id === draggingVentaId);
    const targetIndex = current.findIndex((item) => item.id === targetVentaId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggingVentaId(null);
      setDragOverVentaId(null);
      return;
    }

    const next = [...current];
    const [item] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, item);

    setDraggingVentaId(null);
    setDragOverVentaId(null);
    await persistOrder(next.map((venta) => venta.id));
  };

  const handleOrdenarPorCercania = async () => {
    const unresolved = ventasOrdenadas.filter(
      (venta) => !getCoordsForVenta(coordsByVentaId, venta.id)
    );
    if (unresolved.length > 0) {
      setError("Todavia faltan geocodificar algunas direcciones para ordenar por cercania.");
      return;
    }

    const ordered = [...ventasOrdenadas];
    if (ordered.length < 2) return;

    const remaining = ordered.slice(1);
    const result = [ordered[0]];

    while (remaining.length > 0) {
      const current = result[result.length - 1];
      const currentCoords = getCoordsForVenta(coordsByVentaId, current.id);

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      remaining.forEach((candidate, index) => {
        const candidateCoords = getCoordsForVenta(coordsByVentaId, candidate.id);
        const latDiff = currentCoords.lat - candidateCoords.lat;
        const lngDiff = currentCoords.lng - candidateCoords.lng;
        const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      const [nextItem] = remaining.splice(bestIndex, 1);
      result.push(nextItem);
    }

    await persistOrder(result.map((venta) => venta.id));
  };

  const getEstadoEntregaClass = (estadoEntregaValue) => {
    const estado = (estadoEntregaValue || "").toLowerCase();
    if (estado === "entregada") return "bg-green-200 text-green-800";
    if (estado === "cancelada") return "bg-red-200 text-red-800";
    if (estado === "reprogramada" || estado === "pendiente") {
      return "bg-blue-200 text-blue-800";
    }
    return "bg-neutral-300 text-gray-700";
  };

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const canSortByDistance =
    ventasOrdenadas.length > 1 &&
    !isGeocoding &&
    ventasOrdenadas.every((venta) => getCoordsForVenta(coordsByVentaId, venta.id));

  return (
    <div className="mx-auto mt-2 w-full max-w-[1400px] p-4 text-left">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Logistica</h2>
          <p className="mt-1 text-sm text-gray-600">
            Lista operativa y mapa de entregas para {formatDate(fechaEntrega)}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              viewMode === "lista"
                ? "bg-teal-700 text-white"
                : "bg-neutral-200 text-gray-700"
            }`}
            onClick={() => setViewMode("lista")}
          >
            Vista Lista
          </Button>
          <Button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              viewMode === "mapa"
                ? "bg-teal-700 text-white"
                : "bg-neutral-200 text-gray-700"
            }`}
            onClick={() => setViewMode("mapa")}
          >
            Vista Mapa
          </Button>
        </div>
      </div>

      <form
        className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[220px_minmax(0,1fr)_auto_auto_auto]"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            className="mt-1 rounded-xl border border-gray-300 bg-gray-50 p-2 text-sm"
            value={fechaEntrega}
            onChange={(event) => setFechaEntrega(event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <input
            type="text"
            placeholder="Buscar por nombre"
            className="mt-1 rounded-xl border border-gray-300 bg-gray-50 p-2 text-sm"
            value={cliente}
            onChange={(event) => setCliente(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
        >
          Filtrar
        </Button>
        <Button
          type="button"
          className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
          onClick={handleLimpiar}
        >
          Limpiar
        </Button>
        <Button
          type="button"
          className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
          onClick={() => loadData(fechaEntrega || undefined)}
        >
          Refrescar
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-teal-300"
            onClick={handleOrdenarPorCercania}
            disabled={!canSortByDistance || isClientFilterActive || isSavingOrder}
          >
            Ordenar por cercania
          </Button>
          {isSavingOrder ? (
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Guardando orden...
            </span>
          ) : null}
          {isGeocoding ? (
            <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Geocodificando direcciones...
            </span>
          ) : null}
        </div>
        {isClientFilterActive ? (
          <p className="text-sm text-amber-700">
            Limpia el filtro de cliente para arrastrar y guardar el orden general.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}
      {geoError ? (
        <p className="mt-2 text-sm text-amber-700">{geoError}</p>
      ) : null}
      {isLoading ? (
        <p className="mt-4 text-sm text-gray-600">Cargando ventas...</p>
      ) : null}
      {!isLoading && filteredVentas.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No hay entregas para mostrar.</p>
      ) : null}

      {!isLoading && filteredVentas.length > 0 && viewMode === "lista" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[56px_80px_minmax(180px,1.1fr)_minmax(220px,1.3fr)_120px_120px_280px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Orden</span>
            <span>Venta</span>
            <span>Cliente</span>
            <span>Direccion</span>
            <span>Entrega</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredVentas.map((venta, index) => {
              const clienteData = clientesById[String(venta.cliente)];
              const isBlocked = ["entregada", "cancelada"].includes(
                (venta.estado_entrega || "").toLowerCase()
              );
              const isDropTarget = dragOverVentaId === venta.id;
              return (
                <div
                  key={venta.id}
                  draggable={!isClientFilterActive}
                  onDragStart={() => handleDragStart(venta.id)}
                  onDragOver={(event) => {
                    if (isClientFilterActive) return;
                    event.preventDefault();
                    setDragOverVentaId(venta.id);
                  }}
                  onDragLeave={() => setDragOverVentaId(null)}
                  onDrop={() => handleDrop(venta.id)}
                  className={`grid grid-cols-[56px_80px_minmax(180px,1.1fr)_minmax(220px,1.3fr)_120px_120px_280px] gap-3 px-4 py-3 text-sm ${
                    isDropTarget ? "bg-teal-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="rounded bg-gray-100 px-1 text-xs text-gray-600 disabled:opacity-40"
                        disabled={isClientFilterActive || index === 0 || isSavingOrder}
                        onClick={() => moveVenta(venta.id, "up")}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded bg-gray-100 px-1 text-xs text-gray-600 disabled:opacity-40"
                        disabled={isClientFilterActive || index === filteredVentas.length - 1 || isSavingOrder}
                        onClick={() => moveVenta(venta.id, "down")}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center font-semibold text-gray-800">
                    #{venta.id}
                  </div>
                  <div className="flex items-center text-gray-700">
                    {clienteData?.nombre || venta.cliente}
                  </div>
                  <div className="flex flex-col justify-center text-gray-700">
                    <span>{venta.direccion_entrega || clienteData?.direccion || "-"}</span>
                    <span className="text-xs text-gray-500">
                      {getCoordsForVenta(coordsByVentaId, venta.id) ? "Geocodificada" : "Sin geocoding"}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    {formatDate(getFechaEntrega(venta))}
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${getEstadoEntregaClass(
                        venta.estado_entrega
                      )}`}
                    >
                      {venta.estado_entrega}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-green-300"
                      onClick={() => handleEntregar(venta.id)}
                      disabled={isBlocked}
                    >
                      Check
                    </Button>
                    <Button
                      type="button"
                      className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-amber-300"
                      onClick={() => handleReprogramar(venta.id)}
                      disabled={isBlocked}
                    >
                      Reprogramar
                    </Button>
                    <Button
                      type="button"
                      className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700"
                      onClick={() => handleVer(venta.id)}
                    >
                      Ver
                    </Button>
                    <Button
                      type="button"
                      className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700"
                      onClick={() => handleVerPdf(venta.id)}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isLoading && filteredVentas.length > 0 && viewMode === "mapa" ? (
        <div className="mt-4">
          <RouteMap
            ventas={filteredVentas}
            coordsByVentaId={coordsByVentaId}
            clientesById={clientesById}
          />
        </div>
      ) : null}

      {isModalOpen && selectedVenta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 text-left shadow-xl">
            <Button
              type="button"
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={handleModalClose}
            >
              X
            </Button>
            <h3 className="text-lg font-semibold text-gray-800">
              Venta #{selectedVenta.id}
            </h3>
            <p className="text-sm text-gray-600">
              Cliente: {clientesById[String(selectedVenta.cliente)]?.nombre || selectedVenta.cliente}
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-red-600">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-green-700">{modalOk}</p>
            ) : null}
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Estado de entrega</label>
              <div className="mt-1 rounded-lg border border-gray-300 bg-neutral-200 p-2 text-sm">
                <select
                  className="w-full rounded-lg bg-transparent capitalize focus:outline-none"
                  value={modalEstadoEntrega}
                  onChange={(event) => {
                    const next = event.target.value;
                    setModalEstadoEntrega(next);
                    if (next !== "reprogramada") {
                      setModalNuevaFecha("");
                    }
                  }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="reprogramada">Reprogramada</option>
                  <option value="entregada">Entregada</option>
                </select>
              </div>
            </div>
            {modalEstadoEntrega === "reprogramada" ? (
              <div className="mt-3">
                <label className="text-sm font-medium text-gray-700">Nueva fecha</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-neutral-200 p-2 text-sm"
                  value={modalNuevaFecha}
                  onChange={(event) => setModalNuevaFecha(event.target.value)}
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <span className="text-sm font-semibold text-gray-700">Detalles</span>
              {selectedVenta.detalles && selectedVenta.detalles.length > 0 ? (
                selectedVenta.detalles.map((detalle) => (
                  <div key={detalle.id} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-sm text-gray-700">
                      Producto: {productosById[String(detalle.producto)]?.nombre || detalle.producto}
                    </p>
                    <p className="text-sm text-gray-700">
                      Cantidad: {detalle.cantidad}
                    </p>
                    <p className="text-sm text-gray-700">
                      Precio unitario: {formatArs(detalle.precio_unitario)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">Sin detalles cargados.</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg bg-neutral-200 px-3 py-2 text-sm font-medium text-gray-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
