import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import { cambiarEstadoCompra, getCompra, getCompras } from "../services/api/compras";
import { useNavigate } from "react-router-dom";
import { FunnelIcon, PlusIcon } from "@heroicons/react/24/outline";
import ModalNuevaCompra from "../components/layout/ModalNuevaCompra";

export default function ComprasListado() {
  const navigate = useNavigate();
  const [proveedor, setProveedor] = useState("");
  const [estadoCompra, setEstadoCompra] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // View detail modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [modalEstado, setModalEstado] = useState("");
  const [modalMotivo, setModalMotivo] = useState("");

  // Create modal state
  const [isNuevaCompraOpen, setIsNuevaCompraOpen] = useState(false);

  const loadData = async () => {
    setError("");
    try {
      setIsLoading(true);
      const [comprasData, proveedoresData, productosData] = await Promise.all([
        getCompras(),
        getContactos({ tipo: "proveedor" }),
        getProductos(),
      ]);
      setCompras(comprasData || []);
      setProveedores(proveedoresData || []);
      setProductos(productosData || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las compras.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen || isNuevaCompraOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isModalOpen, isNuevaCompraOpen]);

  const proveedoresById = useMemo(() => {
    return proveedores.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [proveedores]);

  const productosById = useMemo(() => {
    return productos.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [productos]);

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const filteredCompras = useMemo(() => {
    if (!useFiltro) return compras;
    const proveedorFiltro = proveedor.trim().toLowerCase();
    return compras.filter((compra) => {
      const matchEstadoCompra = estadoCompra
        ? compra.estado_compra === estadoCompra
        : true;
      const matchEstadoPago = estadoPago
        ? compra.estado_pago === estadoPago
        : true;
      const matchFecha = fechaCompra ? compra.fecha_compra === fechaCompra : true;
      const nombreProveedor =
        proveedoresById[String(compra.proveedor)]?.nombre || "";
      const matchProveedor = proveedorFiltro
        ? nombreProveedor.toLowerCase().includes(proveedorFiltro)
        : true;
      return matchEstadoCompra && matchEstadoPago && matchFecha && matchProveedor;
    });
  }, [useFiltro, compras, proveedor, estadoCompra, estadoPago, fechaCompra, proveedoresById]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setProveedor("");
    setEstadoCompra("");
    setEstadoPago("");
    setFechaCompra("");
    setUseFiltro(false);
  };

  const handleVer = async (compraId) => {
    setModalError("");
    setModalOk("");
    try {
      const data = await getCompra(compraId);
      setSelectedCompra(data);
      setModalEstado(data.estado_compra || "");
      setModalMotivo("");
      setIsModalOpen(true);
    } catch (err) {
      setError(err?.message || "No se pudo cargar la compra.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCompra(null);
    setModalEstado("");
    setModalMotivo("");
  };

  const handleSave = async () => {
    if (!selectedCompra) return;
    setModalError("");
    setModalOk("");
    const payload = { estado_compra: modalEstado };
    if (modalEstado === "cancelada") {
      if (!modalMotivo.trim()) {
        setModalError("Ingresa un motivo de cancelacion.");
        return;
      }
      payload.motivo_cancelacion = modalMotivo.trim();
    }
    try {
      setIsSaving(true);
      await cambiarEstadoCompra(selectedCompra.id, payload);
      setModalOk("Estado de compra actualizado.");
      await loadData();
    } catch (err) {
      setModalError(err?.message || "No se pudo actualizar la compra.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg lg:max-w-none p-4 text-center">
      <h2 className="text-xl font-semibold text-white">Compras</h2>
      <p className="mt-1 text-sm text-stone-400">
        Listado para buscar y gestionar compras.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div></div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition shadow-md flex items-center gap-1"
            onClick={() => setIsNuevaCompraOpen(true)}
          >
            <PlusIcon className="h-4 w-4" />
            Nueva Compra
          </Button>
          <Button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${
              isFilterOpen || proveedor || fechaCompra || estadoCompra || estadoPago
                ? "bg-[#CAED4E] text-black border-transparent shadow-md"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
            Filtros {(proveedor || fechaCompra || estadoCompra || estadoPago) && "(Activo)"}
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
              value={fechaCompra}
              onChange={(event) => setFechaCompra(event.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Estado compra</label>
            <select
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 capitalize"
              value={estadoCompra}
              onChange={(event) => setEstadoCompra(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="recibida">Recibida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Estado pago</label>
            <select
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 capitalize"
              value={estadoPago}
              onChange={(event) => setEstadoPago(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="cancelado">Cancelado</option>
            </select>
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
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-stone-500">Cargando compras...</p>
        ) : null}
        {!isLoading && filteredCompras.length === 0 ? (
          <p className="text-sm text-stone-500">No hay registros para mostrar.</p>
        ) : null}
        {filteredCompras.map((compra) => (
          <div
            key={compra.id}
            className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 text-left shadow-lg text-white hover:border-stone-700/60 transition duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Compra #{compra.id}
              </span>
              <span className={`text-xs rounded-full border px-2.5 py-0.5 font-medium capitalize ${
                compra.estado_compra === "pendiente"
                  ? "bg-yellow-900/40 text-yellow-300 border-yellow-800/60"
                  : compra.estado_compra === "recibida"
                  ? "bg-green-900/40 text-green-300 border-green-800/60"
                  : "bg-red-900/30 text-red-300 border-red-800/60"
              }`}>
                {compra.estado_compra}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-300">
              Proveedor: <span className="text-white font-medium">{proveedoresById[String(compra.proveedor)]?.nombre || compra.proveedor}</span>
            </p>
            <p className="text-sm text-stone-300">
              Fecha: <span className="text-white font-medium">{compra.fecha_compra}</span>
            </p>
            <p className="text-sm text-stone-300">
              Total: <span className="text-white font-semibold">{formatArs(compra.total)}</span>
            </p>
            <p className="text-sm text-stone-300">
              Saldo: <span className="text-[#CAED4E] font-semibold">{formatArs(compra.saldo_pendiente)}</span>
            </p>
            <p className="text-sm text-stone-300">
              Estado pago: <span className="text-white font-medium capitalize">{compra.estado_pago}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition"
                onClick={() => handleVer(compra.id)}
              >
                Ver
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition"
                onClick={() => navigate(`/caja?tipo=pago&vista=nuevo&compra=${compra.id}`)}
              >
                Generar pago
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedCompra ? (
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
              Compra #{selectedCompra.id}
            </h3>
            <p className="text-sm text-stone-400">
              Proveedor: <span className="text-stone-200 font-medium">{proveedoresById[String(selectedCompra.proveedor)]?.nombre || selectedCompra.proveedor}</span>
            </p>
            <p className="text-sm text-stone-400 mt-0.5">
              Estado pago: <span className="text-white font-medium capitalize">{selectedCompra.estado_pago}</span>
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-rose-400">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-emerald-400">{modalOk}</p>
            ) : null}
            <div className="mt-4">
              <label className="text-xs font-medium text-stone-400 block mb-1">Estado compra</label>
              <select
                className="w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:outline-none focus:border-stone-700 outline-none transition duration-200 capitalize"
                value={modalEstado}
                onChange={(event) => setModalEstado(event.target.value)}
              >
                <option value="pendiente">Pendiente</option>
                <option value="recibida">Recibida</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            {modalEstado === "cancelada" ? (
              <div className="mt-3">
                <label className="text-xs font-medium text-stone-400 block mb-1">Motivo</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:outline-none focus:border-stone-700 outline-none transition duration-200"
                  value={modalMotivo}
                  onChange={(event) => setModalMotivo(event.target.value)}
                />
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              <span className="text-sm font-semibold text-white">Detalles</span>
              {selectedCompra.detalles && selectedCompra.detalles.length > 0 ? (
                selectedCompra.detalles.map((detalle) => (
                  <div key={detalle.id} className="rounded-xl border border-stone-800 bg-stone-950/40 p-3.5 space-y-1">
                    <p className="text-sm text-stone-300">
                      Producto: <span className="text-white font-medium">{productosById[String(detalle.producto)]?.nombre || detalle.producto}</span>
                    </p>
                    <p className="text-sm text-stone-300">
                      Cantidad: <span className="text-white font-medium">{detalle.cantidad}</span>
                    </p>
                    <p className="text-sm text-stone-300">
                      Precio unitario: <span className="text-white font-semibold">{formatArs(detalle.precio_unitario)}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500 italic">Sin detalles (Gasto general).</p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                className="w-full rounded-xl px-4 py-3 text-sm font-bold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200 disabled:opacity-60"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Nueva Compra Modal */}
      <ModalNuevaCompra
        isOpen={isNuevaCompraOpen}
        onClose={() => setIsNuevaCompraOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
