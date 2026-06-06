import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getContactos } from "../services/api/contactos";
import { getCompras } from "../services/api/compras";
import { addDetallesPago, getPago, getPagos } from "../services/api/pagos";
import { FunnelIcon } from "@heroicons/react/24/outline";

export default function PagosListado() {
  const [proveedor, setProveedor] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  const comprasDisponiblesProveedorOptions = useMemo(
    () =>
      comprasDisponiblesProveedor.map((compra) => ({
        value: String(compra.id),
        label: `Compra #${compra.id} - ${compra.fecha_compra} - ${formatArs(compra.saldo_pendiente)}`,
      })),
    [comprasDisponiblesProveedor]
  );

  const getMediosLabel = (pago) => {
    if (Array.isArray(pago.medios_pago) && pago.medios_pago.length > 0) {
      return pago.medios_pago.map((item) => capitalize(item.medio_pago)).join(" + ");
    }
    return capitalize(pago.medio_pago_resumen || pago.medio_pago);
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
    <div className="mx-auto mt-2 w-full max-w-lg lg:max-w-none p-4 text-center">
      <h2 className="text-xl font-semibold text-white">Pagos</h2>
      <p className="mt-1 text-sm text-stone-400">
        Listado de pagos y aplicacion de saldo disponible.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div></div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${
              isFilterOpen || proveedor || fechaPago
                ? "bg-[#CAED4E] text-black border-transparent shadow-md"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
            Filtros {(proveedor || fechaPago) && "(Activo)"}
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
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Proveedor</label>
            <input
              type="text"
              placeholder="Buscar por nombre"
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-600 focus:border-stone-700 outline-none transition duration-200"
              value={proveedor}
              onChange={(event) => setProveedor(event.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Fecha</label>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2 text-sm text-white focus:border-stone-700 outline-none transition duration-200 [color-scheme:dark]"
              value={fechaPago}
              onChange={(event) => setFechaPago(event.target.value)}
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
          <p className="text-sm text-stone-500">Cargando pagos...</p>
        ) : null}
        {!isLoading && filteredPagos.length === 0 ? (
          <p className="text-sm text-stone-500">No hay registros para mostrar.</p>
        ) : null}
        {filteredPagos.map((pago) => (
          <div
            key={pago.id}
            className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 text-left shadow-lg text-white hover:border-stone-700/60 transition duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Pago #{pago.id}
              </span>
              <span className="text-xs rounded-full bg-stone-800 border border-stone-700 px-2.5 py-0.5 text-stone-300 font-medium">
                {getMediosLabel(pago)}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-300">
              Proveedor: <span className="text-white font-medium">{proveedoresById[String(pago.proveedor)]?.nombre || pago.proveedor}</span>
            </p>
            <p className="text-sm text-stone-300">
              Fecha: <span className="text-white font-medium">{pago.fecha_pago}</span>
            </p>
            <p className="text-sm text-stone-300">
              Monto: <span className="text-white font-semibold">{formatArs(pago.monto)}</span>
            </p>
            <p className="text-sm text-stone-300">
              Saldo disponible: <span className="text-[#CAED4E] font-semibold">{formatArs(pago.saldo_disponible)}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition disabled:opacity-40"
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
              Pago #{selectedPago.id}
            </h3>
            <p className="text-sm text-stone-400">
              Proveedor: <span className="text-stone-200 font-medium">{proveedoresById[String(selectedPago.proveedor)]?.nombre || selectedPago.proveedor}</span>
            </p>
            <p className="text-sm text-stone-400 mt-0.5">
              Saldo disponible: <span className="text-[#CAED4E] font-semibold">{formatArs(selectedPago.saldo_disponible)}</span>
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
                  Agregar compra
                </Button>
              </div>
              {detalles.length === 0 ? (
                <p className="text-sm text-stone-500 py-2">Agrega compras para aplicar saldo.</p>
              ) : null}
              {detalles.map((detalle, index) => (
                <div key={`detalle-${index}`} className="rounded-xl border border-stone-850 bg-stone-950/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Compra {index + 1}
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
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Compra</label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          options={comprasDisponiblesProveedorOptions}
                          value={detalle.compra}
                          onChange={(value) => handleDetalleChange(index, "compra", value)}
                          placeholder="Buscar compra"
                          noOptionsText="Sin compras pendientes"
                        />
                      </div>
                      {detalle.compra ? (
                        <p className="mt-1.5 text-xs text-stone-400">
                          Saldo pendiente: <span className="text-white font-medium">{formatArs(comprasById[String(detalle.compra)]?.saldo_pendiente)}</span>
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


