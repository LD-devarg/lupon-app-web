import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getCompras } from "../services/api/compras";
import { addDetallesPago, getPago, getPagos } from "../services/api/pagos";

export default function PagosListado() {
  const [proveedor, setProveedor] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPago, setSelectedPago] = useState(null);
  const [detalles, setDetalles] = useState([]);

  const loadData = async () => {
    setError("");
    try {
      setIsLoading(true);
      const [pagosData, proveedoresData, comprasData] = await Promise.all([
        getPagos(),
        getContactos({ tipo: "proveedor" }),
        getCompras(),
      ]);
      setPagos(pagosData || []);
      setProveedores(proveedoresData || []);
      setCompras(comprasData || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los pagos.");
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

  const proveedoresById = useMemo(() => {
    return proveedores.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [proveedores]);

  const comprasById = useMemo(() => {
    return compras.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [compras]);

  const comprasDisponiblesProveedor = useMemo(() => {
    if (!selectedPago?.proveedor) return [];
    return compras.filter((compra) => {
      const saldo = Number(compra.saldo_pendiente || 0);
      return (
        saldo > 0 &&
        compra.estado_compra !== "cancelada" &&
        String(compra.proveedor) === String(selectedPago.proveedor)
      );
    });
  }, [compras, selectedPago]);

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

  const filteredPagos = useMemo(() => {
    if (!useFiltro) return pagos;
    const proveedorFiltro = proveedor.trim().toLowerCase();
    const fechaFiltro = fechaPago.trim();
    return pagos.filter((pago) => {
      const nombreProveedor =
        proveedoresById[String(pago.proveedor)]?.nombre || "";
      const matchProveedor = proveedorFiltro
        ? nombreProveedor.toLowerCase().includes(proveedorFiltro)
        : true;
      const matchFecha = fechaFiltro
        ? pago.fecha_pago === fechaFiltro
        : true;
      return matchProveedor && matchFecha;
    });
  }, [useFiltro, pagos, proveedor, fechaPago, proveedoresById]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setProveedor("");
    setFechaPago("");
    setUseFiltro(false);
  };

  const handleVer = async (pagoId) => {
    setModalError("");
    setModalOk("");
    try {
      const data = await getPago(pagoId);
      setSelectedPago(data);
      setDetalles([]);
      setIsModalOpen(true);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el pago.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPago(null);
    setDetalles([]);
    setModalError("");
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      { compra: "", montoAplicado: "" },
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
    if (!selectedPago) return;
    setModalError("");
    setModalOk("");
    if (detalles.length === 0) {
      setModalError("Agrega al menos una compra.");
      return;
    }
    const payload = detalles.map((item) => ({
      compra: Number(item.compra),
      monto_aplicado: item.montoAplicado,
    }));
    const hayVacios = payload.some(
      (detalle) =>
        !detalle.compra || !detalle.monto_aplicado || Number(detalle.monto_aplicado) <= 0
    );
    if (hayVacios) {
      setModalError("Completa compra y monto aplicado.");
      return;
    }
    try {
      setIsSaving(true);
      await addDetallesPago(selectedPago.id, payload);
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
      <h2 className="text-xl font-semibold text-gray-800">Pagos</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado de pagos y aplicacion de saldo disponible.
      </p>

      <form
        className="mt-4 grid grid-cols-3 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col col-span-2">
          <label className="text-sm font-medium text-gray-700">Proveedor</label>
          <input
            type="text"
            placeholder="Buscar por nombre"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={proveedor}
            onChange={(event) => setProveedor(event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={fechaPago}
            onChange={(event) => setFechaPago(event.target.value)}
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
          <p className="text-sm text-gray-600">Cargando pagos...</p>
        ) : null}
        {!isLoading && filteredPagos.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {filteredPagos.map((pago) => (
          <div
            key={pago.id}
            className="neuro-shadow-div p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                Pago #{pago.id}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {capitalize(pago.medio_pago)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              Proveedor: {proveedoresById[String(pago.proveedor)]?.nombre || pago.proveedor}
            </p>
            <p className="text-sm text-gray-700">
              Fecha: {pago.fecha_pago}
            </p>
            <p className="text-sm text-gray-700">
              Monto: {formatArs(pago.monto)}
            </p>
            <p className="text-sm text-gray-700">
              Saldo disponible: {formatArs(pago.saldo_disponible)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleVer(pago.id)}
                disabled={Number(pago.saldo_disponible || 0) <= 0}
              >
                Aplicar saldo
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedPago ? (
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
              Pago #{selectedPago.id}
            </h3>
            <p className="text-sm text-gray-600">
              Proveedor: {proveedoresById[String(selectedPago.proveedor)]?.nombre || selectedPago.proveedor}
            </p>
            <p className="text-sm text-gray-600">
              Saldo disponible: {formatArs(selectedPago.saldo_disponible)}
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
                  Agregar compra
                </Button>
              </div>
              {detalles.length === 0 ? (
                <p className="text-sm text-gray-600">Agrega compras para aplicar saldo.</p>
              ) : null}
              {detalles.map((detalle, index) => (
                <div key={`detalle-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Compra {index + 1}
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
                      <label className="text-sm font-medium text-gray-700">Compra</label>
                      <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                        <select
                          className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                          value={detalle.compra}
                          onChange={(event) =>
                            handleDetalleChange(index, "compra", event.target.value)
                          }
                        >
                          <option value="">Seleccionar compra</option>
                          {comprasDisponiblesProveedor.map((compra) => (
                            <option key={compra.id} value={compra.id}>
                              Compra #{compra.id} - {compra.fecha_compra}
                            </option>
                          ))}
                        </select>
                      </div>
                      {detalle.compra ? (
                        <p className="mt-1 text-xs text-gray-600">
                          Saldo pendiente: {formatArs(comprasById[String(detalle.compra)]?.saldo_pendiente)}
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

