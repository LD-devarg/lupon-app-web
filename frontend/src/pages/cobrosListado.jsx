import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getVentas } from "../services/api/ventas";
import { addDetallesCobro, getCobros, getCobro } from "../services/api/cobros";

export default function CobrosListado() {
  const [cliente, setCliente] = useState("");
  const [fechaCobro, setFechaCobro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
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
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Cobros</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado de cobros y aplicacion de saldo disponible.
      </p>

      <form
        className="mt-4 grid grid-cols-3 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
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
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={fechaCobro}
            onChange={(event) => setFechaCobro(event.target.value)}
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

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-600">Cargando cobros...</p>
        ) : null}
        {!isLoading && filteredCobros.length === 0 ? (
          <p className="text-sm text-gray-600">No hay cobros para mostrar.</p>
        ) : null}
        {filteredCobros.map((cobro) => (
          <div
            key={cobro.id}
            className="neuro-shadow-div p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                Cobro #{cobro.id}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {cobro.medio_pago}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              Cliente: {clientesById[String(cobro.cliente)]?.nombre || cobro.cliente}
            </p>
            <p className="text-sm text-gray-700">
              Fecha: {cobro.fecha_cobro}
            </p>
            <p className="text-sm text-gray-700">
              Monto: {formatArs(cobro.monto)}
            </p>
            <p className="text-sm text-gray-700">
              Saldo disponible: {formatArs(cobro.saldo_disponible)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white p-4 text-left shadow-xl">
            <Button
              type="button"
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={handleModalClose}
            >
              X
            </Button>
            <h3 className="text-lg font-semibold text-gray-800">
              Cobro #{selectedCobro.id}
            </h3>
            <p className="text-sm text-gray-600">
              Cliente: {clientesById[String(selectedCobro.cliente)]?.nombre || selectedCobro.cliente}
            </p>
            <p className="text-sm text-gray-600">
              Saldo disponible: {formatArs(selectedCobro.saldo_disponible)}
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-red-600">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-green-700">{modalOk}</p>
            ) : null}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Aplicaciones</span>
                <Button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                  onClick={handleAddDetalle}
                >
                  Agregar venta
                </Button>
              </div>
              {detalles.length === 0 ? (
                <p className="text-sm text-gray-600">Agrega ventas para aplicar saldo.</p>
              ) : null}
              {detalles.map((detalle, index) => (
                <div key={`detalle-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Venta {index + 1}
                    </span>
                    <Button
                      type="button"
                      className="text-sm text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveDetalle(index)}
                    >
                      Quitar
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700">Venta</label>
                      <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                        <select
                          className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                          value={detalle.venta}
                          onChange={(event) =>
                            handleDetalleChange(index, "venta", event.target.value)
                          }
                        >
                          <option value="">Seleccionar venta</option>
                          {ventasDisponiblesCliente.map((venta) => (
                            <option key={venta.id} value={venta.id}>
                              Venta #{venta.id} - {venta.fecha_venta} -{" "}
                              {clientesById[String(venta.cliente)]?.nombre || venta.cliente}
                            </option>
                          ))}
                        </select>
                      </div>
                      {detalle.venta ? (
                        <p className="mt-1 text-xs text-gray-600">
                          Saldo pendiente: {formatArs(ventasById[String(detalle.venta)]?.saldo_pendiente)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700">Monto aplicado</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
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
            <div className="mt-3">
              <p className="text-sm text-gray-700">
                Total aplicado: {formatArs(totalAplicado)}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
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


