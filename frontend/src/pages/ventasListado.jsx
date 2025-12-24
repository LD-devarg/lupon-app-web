import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { cambiarEstadoEntrega, cancelarVenta, getVenta, getVentas, reprogramarEntrega } from "../services/api/ventas";

export default function VentasListado() {
  const navigate = useNavigate();
  const [estadoEntrega, setEstadoEntrega] = useState("");
  const [cliente, setCliente] = useState("");
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [useFiltro, setUseFiltro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [modalEstadoEntrega, setModalEstadoEntrega] = useState("");
  const [modalNuevaFecha, setModalNuevaFecha] = useState("");
  const [cancelVentaId, setCancelVentaId] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelOk, setCancelOk] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  const loadData = async () => {
    setError("");
    try {
      setIsLoading(true);
      const [ventasData, clientesData, productosData] = await Promise.all([
        getVentas(),
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen || cancelVentaId !== null) {
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

  const productosById = useMemo(() => {
    return productos.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [productos]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setEstadoEntrega("");
    setCliente("");
    setUseFiltro(false);
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

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedVenta(null);
    setModalEstadoEntrega("");
    setModalNuevaFecha("");
  };

  const handleCancelOpen = () => {
    if (!selectedVenta) return;
    setCancelVentaId(selectedVenta.id);
    setCancelMotivo("");
    setCancelError("");
    setCancelOk("");
  };

  const handleCancelClose = () => {
    setCancelVentaId(null);
    setCancelMotivo("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelVentaId) return;
    if (!cancelMotivo.trim()) {
      setCancelError("Ingresa un motivo de cancelacion.");
      return;
    }
    try {
      setIsCanceling(true);
      const response = await cancelarVenta(cancelVentaId, cancelMotivo.trim());
      setCancelOk(response?.status || "Venta cancelada.");
      await loadData();
      setCancelVentaId(null);
      setCancelMotivo("");
      handleModalClose();
    } catch (err) {
      setCancelError(err?.message || "No se pudo cancelar la venta.");
    } finally {
      setIsCanceling(false);
    }
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
      await loadData();
    } catch (err) {
      setModalError(err?.message || "No se pudo actualizar la entrega.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerarCobro = (ventaId) => {
    navigate(`/cobros?venta=${ventaId}`);
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

  const filteredVentas = useMemo(() => {
    if (!useFiltro) return ventas;
    const estadoFiltro = estadoEntrega.trim().toLowerCase();
    const clienteFiltro = cliente.trim().toLowerCase();
    return ventas.filter((venta) => {
      const matchEstado = estadoFiltro
        ? venta.estado_entrega?.toLowerCase() === estadoFiltro
        : true;
      const nombreCliente =
        clientesById[String(venta.cliente)]?.nombre || "";
      const matchCliente = clienteFiltro
        ? nombreCliente.toLowerCase().includes(clienteFiltro)
        : true;
      return matchEstado && matchCliente;
    });
  }, [useFiltro, ventas, estadoEntrega, cliente, clientesById]);

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Ventas</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado para buscar y gestionar ventas.
      </p>

      <form
        className="mt-4 grid grid-cols-2 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col">
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
          <label className="text-sm font-medium text-gray-700">Estado entrega</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={estadoEntrega}
              onChange={(event) => setEstadoEntrega(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="reprogramada">Reprogramada</option>
              <option value="entregada">Entregada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full rounded-xl px-3 col-span-2 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
        >
          Buscar
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-2 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={handleLimpiar}
        >
          Limpiar filtros
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}
      {cancelOk ? (
        <p className="mt-3 text-sm text-green-700">{cancelOk}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-600">Cargando ventas...</p>
        ) : null}
        {!isLoading && filteredVentas.length === 0 ? (
          <p className="text-sm text-gray-600">No hay ventas para mostrar.</p>
        ) : null}
        {filteredVentas.map((venta) => (
          <div
            key={venta.id}
            className="neuro-shadow-div p-3 text-left"
          >
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
              Fecha: {venta.fecha_venta}
            </p>
            {venta.fecha_entrega ? (
              <p className="text-sm text-gray-700">
                Fecha entrega: {venta.fecha_entrega}
              </p>
            ) : null}
            {venta.fecha_reprogramada ? (
              <p className="text-sm text-gray-700">
                Fecha reprogramada: {venta.fecha_reprogramada}
              </p>
            ) : null}
            <p className="text-sm text-gray-700">
              Total: {formatArs(venta.total)}
            </p>
            <p className="text-sm text-gray-700">
              Saldo: {formatArs(venta.saldo_pendiente)}
            </p>
            <p className="text-sm text-gray-700">
              Estado venta: {venta.estado_venta}
            </p>
            <p className="text-sm text-gray-700">
              Estado cobro: {venta.estado_cobro}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleVer(venta.id)}
              >
                Ver
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleGenerarCobro(venta.id)}
              >
                Generar cobro
              </Button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && selectedVenta ? (
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
              Venta #{selectedVenta.id}
            </h3>
            <p className="text-sm text-gray-600">
              Cliente: {clientesById[String(selectedVenta.cliente)]?.nombre || selectedVenta.cliente}
            </p>
            <p className="text-sm text-gray-600">
              Estado venta: {selectedVenta.estado_venta}
            </p>
            <p className="text-sm text-gray-600">
              Estado cobro: {selectedVenta.estado_cobro}
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-red-600">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-green-700">{modalOk}</p>
            ) : null}
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Estado de entrega</label>
              <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                <select
                  className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
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
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
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
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                onClick={handleCancelOpen}
                disabled={selectedVenta.estado_venta !== "en proceso"}
              >
                Cancelar venta
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                onClick={() => navigate(`/pedidos-ventas/listado?pedido=${selectedVenta.pedido_venta}`)}
              >
                Ver pedido asociado
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {cancelVentaId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-sm rounded-xl bg-white p-4 text-left shadow-xl">
            <Button
              type="button"
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={handleCancelClose}
            >
              X
            </Button>
            <h3 className="text-lg font-semibold text-gray-800">
              Cancelar venta #{cancelVentaId}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Indica el motivo de cancelacion.
            </p>
            {cancelError ? (
              <p className="mt-2 text-sm text-red-600">{cancelError}</p>
            ) : null}
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Motivo</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-100"
                value={cancelMotivo}
                onChange={(event) => setCancelMotivo(event.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                onClick={handleCancelClose}
              >
                Volver
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
              >
                {isCanceling ? "Cancelando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


