import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getVentas } from "../services/api/ventas";

export default function Logistica() {
  const today = new Date().toISOString().slice(0, 10);
  const [fechaEntrega, setFechaEntrega] = useState(today);
  const [cliente, setCliente] = useState("");
  const [useFiltro, setUseFiltro] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setError("");
    try {
      setIsLoading(true);
      const [ventasData, clientesData] = await Promise.all([
        getVentas(),
        getClientes(),
      ]);
      setVentas(ventasData || []);
      setClientes(clientesData || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las ventas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clientesById = useMemo(() => {
    return clientes.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [clientes]);

  const normalizeDate = (value) => {
    if (!value) return "";
    return value.split("T")[0];
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const getFechaEntrega = (venta) => {
    return normalizeDate(venta.fecha_reprogramada || venta.fecha_entrega || "");
  };

  const filteredVentas = useMemo(() => {
    if (!useFiltro) return ventas;
    const clienteFiltro = cliente.trim().toLowerCase();
    return ventas.filter((venta) => {
      const fecha = getFechaEntrega(venta);
      const matchFecha = fechaEntrega ? fecha === fechaEntrega : true;
      const nombreCliente =
        clientesById[String(venta.cliente)]?.nombre || "";
      const matchCliente = clienteFiltro
        ? nombreCliente.toLowerCase().includes(clienteFiltro)
        : true;
      return matchFecha && matchCliente;
    });
  }, [useFiltro, ventas, cliente, fechaEntrega, clientesById]);

  const groupedVentas = useMemo(() => {
    const groups = {};
    filteredVentas.forEach((venta) => {
      const fecha = getFechaEntrega(venta) || "Sin fecha";
      if (!groups[fecha]) groups[fecha] = [];
      groups[fecha].push(venta);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === "Sin fecha") return 1;
      if (b[0] === "Sin fecha") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredVentas]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setFechaEntrega("");
    setCliente("");
    setUseFiltro(false);
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

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Logistica</h2>
      <p className="mt-1 text-sm text-gray-600">
        Ventas agrupadas por fecha de entrega.
      </p>

      <form
        className="mt-4 grid grid-cols-3 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Fecha</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 input-wrap input-shadow bg-neutral-300">
            <input
              type="date"
              className="w-full rounded-lg text-sm text-left bg-transparent focus:outline-none"
              value={fechaEntrega}
              onChange={(event) => setFechaEntrega(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <input
            type="text"
            placeholder="Buscar por nombre"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={cliente}
            onChange={(event) => setCliente(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
        >
          Filtrar
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={handleLimpiar}
        >
          Limpiar
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={loadData}
        >
          Refrescar
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-gray-600">Cargando ventas...</p>
        ) : null}
        {!isLoading && groupedVentas.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {groupedVentas.map(([fecha, ventasGrupo]) => (
          <div key={fecha} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">
              Fecha de entrega: {fecha === "Sin fecha" ? fecha : formatDate(fecha)}
            </h3>
            {ventasGrupo.map((venta) => (
              <div key={venta.id} className="neuro-shadow-div p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    Venta #{venta.id}
                  </span>
                  <span
                    className={`text-xs rounded-full px-2 py-1 ${getEstadoEntregaClass(venta.estado_entrega)}`}
                  >
                    {venta.estado_entrega}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  Cliente: {clientesById[String(venta.cliente)]?.nombre || venta.cliente}
                </p>
                <p className="text-sm text-gray-700">
                  Direccion: {venta.direccion_entrega || "-"}
                </p>
                <p className="text-sm text-gray-700">
                  Fecha: {formatDate(normalizeDate(venta.fecha_venta))}
                </p>
                <p className="text-sm text-gray-700">
                  Fecha entrega: {formatDate(getFechaEntrega(venta))}
                </p>
                {venta.fecha_reprogramada ? (
                  <p className="text-sm text-gray-700">
                    Fecha reprogramada: {formatDate(normalizeDate(venta.fecha_reprogramada))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

