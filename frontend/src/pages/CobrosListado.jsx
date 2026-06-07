import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getClientes } from "../services/api/clientes";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { getVentas } from "../services/api/ventas";
import { addDetallesCobro, getCobros, getCobro } from "../services/api/cobros";

export default function CobrosListado() {
  const [cliente, setCliente] = useState("");
  const [fechaCobro, setFechaCobro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [cobros, setCobros] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCobro, setSelectedCobro] = useState(null);
  const [detalles, setDetalles] = useState([]);

  const loadData = async () => {
    setError("");
    try {
      setIsLoading(true);
      const [cobrosData, clientesData, ventasData] = await Promise.all([
        getCobros(),
        getClientes(),
        getVentas(),
      ]);
      setCobros(cobrosData || []);
      setClientes(clientesData || []);
      setVentas(ventasData || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los cobros.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isModalOpen]);

  const clientesById = useMemo(() => {
    return clientes.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [clientes]);

  const ventasById = useMemo(() => {
    return ventas.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [ventas]);

  const ventasDisponiblesCliente = useMemo(() => {
    if (!selectedCobro?.cliente) return [];
    return ventas.filter((venta) => {
      const saldo = Number(venta.saldo_pendiente || 0);
      return (
        saldo > 0 &&
        venta.estado_entrega !== "cancelada" &&
        String(venta.cliente) === String(selectedCobro.cliente)
      );
    });
  }, [ventas, selectedCobro]);

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const capitalize = (value) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const ventasDisponiblesClienteOptions = useMemo(
    () =>
      ventasDisponiblesCliente.map((venta) => ({
        value: String(venta.id),
        label: `Venta #${venta.id} - ${venta.fecha_venta} - ${formatArs(venta.saldo_pendiente)}`,
      })),
    [ventasDisponiblesCliente]
  );

  const getMediosLabel = (cobro) => {
    if (Array.isArray(cobro.medios_pago) && cobro.medios_pago.length > 0) {
      return cobro.medios_pago.map((item) => capitalize(item.medio_pago)).join(" + ");
    }
    return capitalize(cobro.medio_pago_resumen || cobro.medio_pago);
  };

  const filteredCobros = useMemo(() => {
    if (!useFiltro) return cobros;
    const clienteFiltro = cliente.trim().toLowerCase();
    const fechaFiltro = fechaCobro.trim();
    return cobros.filter((cobro) => {
      const nombreCliente =
        clientesById[String(cobro.cliente)]?.nombre || "";
      const matchCliente = clienteFiltro
        ? nombreCliente.toLowerCase().includes(clienteFiltro)
        : true;
      const matchFecha = fechaFiltro
        ? cobro.fecha_cobro === fechaFiltro
        : true;
      return matchCliente && matchFecha;
    });
  }, [useFiltro, cobros, cliente, fechaCobro, clientesById]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setCliente("");
    setFechaCobro("");
    setUseFiltro(false);
  };

  const handleVer = async (cobroId) => {
    setModalError("");
    setModalOk("");
    try {
      const data = await getCobro(cobroId);
      setSelectedCobro(data);
      setDetalles([]);
      setIsModalOpen(true);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el cobro.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCobro(null);
    setDetalles([]);
    setModalError("");
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      { venta: "", montoAplicado: "" },
    ]);
  };

  const handleRemoveDetalle = (index) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetalleChange = (index, field, value) => {
    setDetalles((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const totalAplicado = useMemo(() => {
    return detalles.reduce((sum, item) => {
      const value = Number(item.montoAplicado || 0);
      return sum + value;
    }, 0);
  }, [detalles]);

  const handleAplicarSaldo = async () => {
    if (!selectedCobro) return;
    setModalError("");
    setModalOk("");
    if (detalles.length === 0) {
      setModalError("Agrega al menos una venta.");
      return;
    }
    const payload = detalles.map((item) => ({
      venta: Number(item.venta),
      monto_aplicado: item.montoAplicado,
    }));
    const hayVacios = payload.some(
      (detalle) =>
        !detalle.venta || !detalle.monto_aplicado || Number(detalle.monto_aplicado) <= 0
    );
    if (hayVacios) {
      setModalError("Completa venta y monto aplicado.");
      return;
    }
    try {
      setIsSaving(true);
      await addDetallesCobro(selectedCobro.id, payload);
      setModalOk("Saldo aplicado correctamente.");
      await loadData();
      setDetalles([]);
    } catch (err) {
      setModalError(err?.message || "No se pudo aplicar el saldo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg lg:max-w-none p-4 text-center">
      <h2 className="text-xl font-semibold text-white">Cobros</h2>
      <p className="mt-1 text-sm text-stone-400">
        Listado de cobros y aplicacion de saldo disponible.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div></div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${
              isFilterOpen || cliente || fechaCobro
                ? "bg-[#CAED4E] text-black border-transparent shadow-md"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
            Filtros {(cliente || fechaCobro) && "(Activo)"}
          </Button>
          <Button
            type="button"
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 transition"
            onClick={loadData}
          >
            Refrescar
          </Button>
        </div>
      </div>

      {isFilterOpen && (
        <form
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-stone-850 bg-[#111111] p-5 shadow-lg items-end text-left"
          onSubmit={handleBuscar}
        >
          <div className="flex flex-col md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Cliente</label>
            <input
              type="text"
              placeholder="Buscar por nombre"
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-600 focus:border-stone-700 outline-none transition duration-200"
              value={cliente}
              onChange={(event) => setCliente(event.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Fecha</label>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2 text-sm text-white focus:border-stone-700 outline-none transition duration-200 [color-scheme:dark]"
              value={fechaCobro}
              onChange={(event) => setFechaCobro(event.target.value)}
            />
          </div>
          <div className="flex gap-2 md:col-span-3">
            <Button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200 flex-1 md:flex-none"
            >
              Filtrar
            </Button>
            <Button
              type="button"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-stone-850 text-stone-300 hover:bg-stone-800 border border-stone-800 transition duration-200 flex-1 md:flex-none"
              onClick={handleLimpiar}
            >
              Limpiar filtros
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <p className="mt-3 text-sm text-rose-400">{error}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-stone-500">Cargando cobros...</p>
        ) : null}
        {!isLoading && filteredCobros.length === 0 ? (
          <p className="text-sm text-stone-500">No hay registros para mostrar.</p>
        ) : null}
        {filteredCobros.map((cobro) => (
          <div
            key={cobro.id}
            className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 text-left shadow-lg text-white hover:border-stone-700/60 transition duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Cobro #{cobro.id}
              </span>
              <span className="text-xs rounded-full bg-stone-800 border border-stone-700 px-2.5 py-0.5 text-stone-300 font-medium">
                {getMediosLabel(cobro)}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-300">
              Cliente: <span className="text-white font-medium">{clientesById[String(cobro.cliente)]?.nombre || cobro.cliente}</span>
            </p>
            <p className="text-sm text-stone-300">
              Fecha: <span className="text-white font-medium">{cobro.fecha_cobro}</span>
            </p>
            <p className="text-sm text-stone-300">
              Monto: <span className="text-white font-semibold">{formatArs(cobro.monto)}</span>
            </p>
            <p className="text-sm text-stone-300">
              Saldo disponible: <span className="text-[#CAED4E] font-semibold">{formatArs(cobro.saldo_disponible)}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition disabled:opacity-40"
                onClick={() => handleVer(cobro.id)}
                disabled={Number(cobro.saldo_disponible || 0) <= 0}
              >
                Aplicar saldo
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedCobro ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-stone-900 border border-stone-800 p-6 text-left shadow-2xl text-white">
            <Button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-stone-400 hover:text-white hover:bg-stone-800 transition"
              onClick={handleModalClose}
            >
              ✕
            </Button>
            <h3 className="text-lg font-bold text-white mb-1">
              Cobro #{selectedCobro.id}
            </h3>
            <p className="text-sm text-stone-400">
              Cliente: <span className="text-stone-200 font-medium">{clientesById[String(selectedCobro.cliente)]?.nombre || selectedCobro.cliente}</span>
            </p>
            <p className="text-sm text-stone-400 mt-0.5">
              Saldo disponible: <span className="text-[#CAED4E] font-semibold">{formatArs(selectedCobro.saldo_disponible)}</span>
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-rose-400">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-emerald-400">{modalOk}</p>
            ) : null}

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                <span className="text-sm font-semibold text-white">Aplicaciones</span>
                <Button
                  type="button"
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition"
                  onClick={handleAddDetalle}
                >
                  Agregar venta
                </Button>
              </div>
              {detalles.length === 0 ? (
                <p className="text-sm text-stone-500 py-2">Agrega ventas para aplicar saldo.</p>
              ) : null}
              {detalles.map((detalle, index) => (
                <div key={`detalle-${index}`} className="rounded-xl border border-stone-850 bg-stone-950/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Venta {index + 1}
                    </span>
                    <Button
                      type="button"
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                      onClick={() => handleRemoveDetalle(index)}
                    >
                      Quitar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Venta</label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          options={ventasDisponiblesClienteOptions}
                          value={detalle.venta}
                          onChange={(value) => handleDetalleChange(index, "venta", value)}
                          placeholder="Buscar venta"
                          noOptionsText="Sin ventas pendientes"
                        />
                      </div>
                      {detalle.venta ? (
                        <p className="mt-1.5 text-xs text-stone-400">
                          Saldo pendiente: <span className="text-white font-medium">{formatArs(ventasById[String(detalle.venta)]?.saldo_pendiente)}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Monto aplicado</label>
                      <input
                        type="number"
                        className="mt-1.5 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
                        value={detalle.montoAplicado}
                        onChange={(event) =>
                          handleDetalleChange(index, "montoAplicado", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-3 border-t border-stone-850 flex justify-between items-center">
              <span className="text-sm font-semibold text-stone-400">Total aplicado:</span>
              <span className="text-base font-bold text-white">{formatArs(totalAplicado)}</span>
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                className="w-full rounded-xl px-4 py-3 text-sm font-bold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200 disabled:opacity-60"
                onClick={handleAplicarSaldo}
                disabled={isSaving}
              >
                {isSaving ? "Aplicando..." : "Aplicar saldo"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}




