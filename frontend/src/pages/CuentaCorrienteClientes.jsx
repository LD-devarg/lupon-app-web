import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "../components/ui/SearchableSelect";
import Button from "../components/ui/Button";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { API_BASE } from "../services/api/base";
import { getClientes } from "../services/api/clientes";
import { getVentas } from "../services/api/ventas";
import { getCobros } from "../services/api/cobros";

export default function CuentaCorrienteClientes() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ventas, setVentas] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await getClientes({ useCache: false });
        setClientes(data || []);
      } catch (err) {
        setError(err?.message || "No se pudo cargar clientes.");
      }
    };
    loadClientes();
  }, []);

  useEffect(() => {
    if (!clienteId) {
      setVentas([]);
      setCobros([]);
      return;
    }
    const loadMovimientos = async () => {
      setError("");
      setIsLoading(true);
      try {
        const [ventasData, cobrosData] = await Promise.all([
          getVentas({ clienteId, fechaDesde, fechaHasta }),
          getCobros({ clienteId, fechaDesde, fechaHasta }),
        ]);
        setVentas(ventasData || []);
        setCobros(cobrosData || []);
      } catch (err) {
        setError(err?.message || "No se pudo cargar la cuenta corriente.");
      } finally {
        setIsLoading(false);
      }
    };
    loadMovimientos();
  }, [clienteId, fechaDesde, fechaHasta]);

  const clienteOptions = useMemo(
    () =>
      clientes.map((cliente) => ({
        value: String(cliente.id),
        label: cliente.nombre_fantasia
          ? `${cliente.nombre} - ${cliente.nombre_fantasia}`
          : cliente.nombre,
      })),
    [clientes]
  );

  const formatDate = (value) => {
    if (!value) return "-";
    const [year, month, day] = String(value).split("-");
    if (!year || !month || !day) return "-";
    return `${day}/${month}/${year}`;
  };

  const formatArs = (value) => {
    const number = Number(value || 0);
    if (Number.isNaN(number)) return "$ 0,00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const movimientos = useMemo(() => {
    const base = [
      ...ventas.map((venta) => ({
        tipo: "venta",
        fecha_emision: venta.fecha_venta,
        detalle: `Venta #${venta.id}`,
        fecha_vto: venta.vencimiento || null,
        debe: Number(venta.total || 0),
        haber: 0,
        id: venta.id,
      })),
      ...cobros.map((cobro) => ({
        tipo: "cobro",
        fecha_emision: cobro.fecha_cobro,
        detalle: `Cobro #${cobro.id}`,
        fecha_vto: null,
        debe: 0,
        haber: Number(cobro.monto || 0),
        id: cobro.id,
      })),
    ];

    base.sort((a, b) => {
      const fechaA = String(a.fecha_emision || "");
      const fechaB = String(b.fecha_emision || "");
      if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
      if (a.tipo !== b.tipo) return a.tipo === "venta" ? -1 : 1;
      return a.id - b.id;
    });

    let saldo = 0;
    return base.map((item) => {
      saldo += item.debe - item.haber;
      return { ...item, saldo };
    });
  }, [ventas, cobros]);

  const saldoActual = movimientos.length
    ? movimientos[movimientos.length - 1].saldo
    : 0;

  const documentosBase = API_BASE.replace(/\/api\/?$/, "");

  const handleExportar = () => {
    if (!clienteId) return;
    const params = new URLSearchParams();
    if (fechaDesde) params.set("fecha_desde", fechaDesde);
    if (fechaHasta) params.set("fecha_hasta", fechaHasta);
    const query = params.toString();
    const url = `${documentosBase}/documentos/cuenta-corriente/clientes/${clienteId}/pdf/${query ? `?${query}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto w-full px-2 text-center text-white">
      <div className="flex items-center justify-between flex-wrap p-2">
        <div className="text-sm font-semibold text-white">
          Saldo actual: <span className="text-[#CAED4E] text-base ml-1 font-bold">{formatArs(saldoActual)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${isFilterOpen || clienteId || fechaDesde || fechaHasta
              ? "bg-[#CAED4E] text-black border-transparent shadow-md"
              : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
              }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
            Filtros {(clienteId || fechaDesde || fechaHasta) && "(Activo)"}
          </Button>
          <Button
            type="button"
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 transition"
            onClick={handleExportar}
            disabled={!clienteId}
          >
            Exportar
          </Button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="my-2 rounded-xl border border-stone-800 bg-[#111111] p-2 text-left shadow-lg">
          <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_auto]">
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Cliente</label>
              <SearchableSelect
                options={clienteOptions}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Seleccionar cliente"
                size="sm"
                wrapperClassName="mt-1.5"
                inputClassName="w-full rounded-lg border border-stone-800 bg-stone-950/60 p-2 text-sm text-white focus:border-stone-700 outline-none"
                selectClassName="w-full bg-transparent rounded-lg focus:outline-none capitalize text-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Desde</label>
              <input
                type="date"
                className="mt-1.5 h-10 rounded-lg border border-stone-800 bg-stone-950/60 text-white px-3 text-sm focus:border-stone-700 outline-none [color-scheme:dark]"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hasta</label>
              <input
                type="date"
                className="mt-1.5 h-10 rounded-lg border border-stone-800 bg-stone-950/60 text-white px-3 text-sm focus:border-stone-700 outline-none [color-scheme:dark]"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="h-10 rounded-lg px-4 text-sm font-semibold bg-stone-850 text-stone-300 hover:bg-stone-800 border border-stone-800 transition duration-200 w-full lg:w-auto"
                onClick={() => {
                  setClienteId("");
                  setFechaDesde("");
                  setFechaHasta("");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <div className="text-left">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-950/50 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                <th className="px-3 py-3 text-left">Fecha emision</th>
                <th className="px-3 py-3 text-left">Detalle</th>
                <th className="px-3 py-3 text-left">Fecha de vto.</th>
                <th className="px-3 py-3 text-left">Debe</th>
                <th className="px-3 py-3 text-left">Haber</th>
                <th className="px-3 py-3 text-left">Saldo a la fecha</th>
              </tr>
            </thead>
            <tbody>
              {!clienteId ? (
                <tr>
                  <td colSpan={6} className="px-3 py-5 text-center text-stone-500">
                    Selecciona un cliente para ver movimientos.
                  </td>
                </tr>
              ) : null}
              {clienteId && isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-5 text-center text-stone-500">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : null}
              {clienteId && !isLoading && movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-5 text-center text-stone-500">
                    No hay ventas o cobros para el cliente.
                  </td>
                </tr>
              ) : null}
              {clienteId && !isLoading
                ? movimientos.map((mov, idx) => (
                  <tr key={`${mov.tipo}-${mov.id}-${idx}`} className="border-b border-stone-850 hover:bg-stone-900/30 transition">
                    <td className="px-3 py-3 text-stone-300">{formatDate(mov.fecha_emision)}</td>
                    <td className="px-3 py-3 text-stone-300">{mov.detalle}</td>
                    <td className="px-3 py-3 text-stone-300">{formatDate(mov.fecha_vto)}</td>
                    <td className="px-3 py-3 text-stone-300">{mov.debe ? formatArs(mov.debe) : "-"}</td>
                    <td className="px-3 py-3 text-stone-300">{mov.haber ? formatArs(mov.haber) : "-"}</td>
                    <td className="px-3 py-3 font-semibold text-white">{formatArs(mov.saldo)}</td>
                  </tr>
                ))
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
