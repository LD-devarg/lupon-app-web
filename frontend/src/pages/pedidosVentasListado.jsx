import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { API_BASE } from "../services/api/base";
import {
  cancelarPedidoVenta,
  getPedidoVenta,
  getPedidosVentas,
  updatePedidoVenta,
} from "../services/api/pedidosVentas";

const DOCUMENTOS_BASE = API_BASE.replace(/\/api\/?$/, "");

export default function PedidosVentasListado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pedidoParam = searchParams.get("pedido");
  const [estado, setEstado] = useState("");
  const [cliente, setCliente] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [useFiltro, setUseFiltro] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [modalEstado, setModalEstado] = useState("");
  const [modalDetalles, setModalDetalles] = useState([]);
  const [modalDireccion, setModalDireccion] = useState("");
  const [modalAclaraciones, setModalAclaraciones] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelModalMotivo, setCancelModalMotivo] = useState("");
  const [cancelModalError, setCancelModalError] = useState("");
  const [cancelPedidoId, setCancelPedidoId] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelOk, setCancelOk] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  const loadPedidos = async () => {
    setError("");
    try {
      setIsLoading(true);
      const data = await getPedidosVentas();
      setPedidos(data || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los pedidos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPedidos();
    const loadExtras = async () => {
      try {
        const [clientesData, productosData] = await Promise.all([
          getClientes(),
          getProductos(),
        ]);
        setClientes(clientesData || []);
        setProductos(productosData || []);
      } catch (err) {
        setError(err?.message || "No se pudieron cargar los datos.");
      }
    };
    loadExtras();
  }, []);

  useEffect(() => {
    if (!pedidoParam) return;
    handleVer(pedidoParam);
  }, [pedidoParam]);

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
    setEstado("");
    setCliente("");
    setUseFiltro(false);
  };

  const handleCancelar = (pedidoId) => {
    setCancelPedidoId(pedidoId);
    setCancelMotivo("");
    setCancelError("");
    setCancelOk("");
  };

  const filteredPedidos = useMemo(() => {
    if (!useFiltro) return pedidos;
    const estadoFiltro = estado.trim().toLowerCase();
    const clienteFiltro = cliente.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      const matchEstado = estadoFiltro
        ? pedido.estado?.toLowerCase() === estadoFiltro
        : true;
      const nombreCliente =
        clientesById[String(pedido.cliente)]?.nombre || "";
      const matchCliente = clienteFiltro
        ? nombreCliente.toLowerCase().includes(clienteFiltro)
        : true;
      return matchEstado && matchCliente;
    });
  }, [useFiltro, pedidos, estado, cliente, clientesById]);

  const handleVer = async (pedidoId) => {
    setModalError("");
    setModalOk("");
    try {
      const data = await getPedidoVenta(pedidoId);
      setSelectedPedido(data);
      setModalEstado(data.estado || "");
      setModalDireccion(data.direccion_entrega || "");
      setModalAclaraciones(data.aclaraciones || "");
      const detallesFormateados = (data.detalles || []).map((detalle) => ({
        id: detalle.id,
        producto: String(detalle.producto),
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precio_unitario,
      }));
      setModalDetalles(detallesFormateados);
      setIsModalOpen(true);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el pedido.");
    }
  };

  useEffect(() => {
    if (isModalOpen || cancelPedidoId !== null) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isModalOpen]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPedido(null);
    setModalDetalles([]);
    setModalEstado("");
    setModalDireccion("");
    setModalAclaraciones("");
    setCancelModalOpen(false);
    setCancelModalMotivo("");
    setCancelModalError("");
  };

  const handleCancelClose = () => {
    setCancelPedidoId(null);
    setCancelMotivo("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelPedidoId) return;
    if (!cancelMotivo.trim()) {
      setCancelError("Ingresa un motivo de cancelacion.");
      return;
    }
    try {
      setIsCanceling(true);
      const response = await cancelarPedidoVenta(cancelPedidoId, cancelMotivo.trim());
      setCancelOk(response?.status || "Pedido cancelado.");
      await loadPedidos();
      setCancelPedidoId(null);
      setCancelMotivo("");
    } catch (err) {
      setCancelError(err?.message || "No se pudo cancelar el pedido.");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleDetalleChange = (index, field, value) => {
    setModalDetalles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const getDefaultPrecio = (producto, clienteData) => {
    if (!producto) return "";
    const categoria = clienteData?.categoria;
    if (categoria === "Minorista") {
      if (
        producto.es_oferta &&
        producto.precio_oferta !== null &&
        producto.precio_oferta !== undefined
      ) {
        return String(producto.precio_oferta);
      }
      return producto.precio_minorista !== undefined &&
        producto.precio_minorista !== null
        ? String(producto.precio_minorista)
        : "";
    }
    if (categoria === "Mayorista Exclusivo") {
      if (
        producto.precio_mayorista_exclusivo !== undefined &&
        producto.precio_mayorista_exclusivo !== null
      ) {
        return String(producto.precio_mayorista_exclusivo);
      }
      return producto.precio_mayorista !== undefined &&
        producto.precio_mayorista !== null
        ? String(producto.precio_mayorista)
        : "";
    }
    if (categoria === "Mayorista") {
      return producto.precio_mayorista !== undefined &&
        producto.precio_mayorista !== null
        ? String(producto.precio_mayorista)
        : "";
    }
    return "";
  };

  const handleDetalleProductoChange = (index, productoId) => {
    const clienteData = clientesById[String(selectedPedido?.cliente)];
    const productoData = productosById[String(productoId)];
    const precioDefault = getDefaultPrecio(productoData, clienteData);
    setModalDetalles((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, producto: productoId, precioUnitario: precioDefault }
          : item
      )
    );
  };

  const handleAddDetalle = () => {
    setModalDetalles((prev) => [
      ...prev,
      { producto: "", cantidad: "", precioUnitario: "" },
    ]);
  };

  const handleRemoveDetalle = (index) => {
    setModalDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedPedido) return;
    setModalError("");
    setModalOk("");
    const detalles = modalDetalles.map((item) => ({
      producto: item.producto,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
    }));
    const hayVacios = detalles.some(
      (detalle) =>
        !detalle.producto ||
        !detalle.cantidad ||
        !detalle.precio_unitario
    );
    if (hayVacios) {
      setModalError("Completa producto, cantidad y precio unitario.");
      return;
    }
    if (modalEstado === "cancelado") {
      setCancelModalOpen(true);
      return;
    }
    try {
      setIsSaving(true);
      await updatePedidoVenta(selectedPedido.id, {
        estado: modalEstado,
        direccion_entrega: modalDireccion.trim() || undefined,
        aclaraciones: modalAclaraciones.trim() || undefined,
        detalles,
      });
      setModalOk("Pedido actualizado.");
      await loadPedidos();
    } catch (err) {
      setModalError(err?.message || "No se pudo actualizar el pedido.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelModalConfirm = async () => {
    if (!selectedPedido) return;
    if (!cancelModalMotivo.trim()) {
      setCancelModalError("Ingresa un motivo de cancelacion.");
      return;
    }
    try {
      setIsSaving(true);
      await cancelarPedidoVenta(selectedPedido.id, cancelModalMotivo.trim());
      setModalOk("Pedido cancelado.");
      setCancelModalOpen(false);
      await loadPedidos();
    } catch (err) {
      setCancelModalError(err?.message || "No se pudo cancelar el pedido.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerarVenta = () => {
    if (!selectedPedido) return;
    handleModalClose();
    navigate(`/ventas?pedido=${selectedPedido.id}`);
  };

  const handleGenerarPdf = (pedidoId) => {
    const url = `${DOCUMENTOS_BASE}/documentos/pedidos-ventas/${pedidoId}/pdf/`;
    window.open(url, "_blank", "noopener");
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

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Pedidos de venta</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado para buscar y gestionar pedidos.
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
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptado">Aceptado</option>
              <option value="cancelado">Cancelado</option>
              <option value="completado">Completado</option>
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
          <p className="text-sm text-gray-600">Cargando pedidos...</p>
        ) : null}
        {!isLoading && filteredPedidos.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {filteredPedidos.map((pedido) => (
          <div
            key={pedido.id}
            className="neuro-shadow-div p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                Pedido #{pedido.id}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {pedido.estado}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              Cliente: {clientesById[String(pedido.cliente)]?.nombre || pedido.cliente}
            </p>
            <p className="text-sm text-gray-700">
              Fecha: {pedido.fecha_pedido}
            </p>
            <p className="text-sm text-gray-700">
              Subtotal: {formatArs(pedido.subtotal)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleCancelar(pedido.id)}
                disabled={pedido.estado !== "pendiente"}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleVer(pedido.id)}
              >
                Ver
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleGenerarPdf(pedido.id)}
              >
                PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && selectedPedido ? (
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
              Pedido #{selectedPedido.id}
            </h3>
            <p className="text-sm text-gray-600">
              Cliente: {clientesById[String(selectedPedido.cliente)]?.nombre || selectedPedido.cliente}
            </p>

            {modalError ? (
              <p className="mt-2 text-sm text-red-600">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-green-700">{modalOk}</p>
            ) : null}

            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                <select
                  className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                  value={modalEstado}
                  onChange={(event) => setModalEstado(event.target.value)}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="aceptado">Aceptado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Direccion de entrega</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                value={modalDireccion}
                onChange={(event) => setModalDireccion(event.target.value)}
              />
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Aclaraciones</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                value={modalAclaraciones}
                onChange={(event) => setModalAclaraciones(event.target.value)}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Detalles</span>
                <Button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                  onClick={handleAddDetalle}
                  disabled={modalEstado !== "pendiente"}
                >
                  Agregar detalle
                </Button>
              </div>
              {modalDetalles.map((detalle, index) => (
                <div key={`detalle-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Item {index + 1}
                    </span>
                    <Button
                      type="button"
                      className="text-sm text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveDetalle(index)}
                      disabled={modalEstado !== "pendiente"}
                    >
                      Quitar
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700">Producto</label>
                      <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                        <select
                          className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                          value={detalle.producto}
                          onChange={(event) =>
                            handleDetalleProductoChange(index, event.target.value)
                          }
                          disabled={modalEstado !== "pendiente"}
                        >
                          <option value="">Seleccionar producto</option>
                          {productos.map((producto) => (
                            <option key={producto.id} value={producto.id}>
                              {producto.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Cantidad</label>
                        <input
                          type="number"
                          className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                          value={detalle.cantidad}
                          onChange={(event) =>
                            handleDetalleChange(index, "cantidad", event.target.value)
                          }
                          disabled={modalEstado !== "pendiente"}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700">Precio unitario</label>
                        <input
                          type="number"
                          className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                          value={detalle.precioUnitario}
                          onChange={(event) =>
                            handleDetalleChange(index, "precioUnitario", event.target.value)
                          }
                          disabled={modalEstado !== "pendiente"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                onClick={handleGenerarVenta}
              >
                Generar venta
              </Button>
            </div>
            {cancelModalOpen ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">
                  Motivo de cancelacion
                </p>
                {cancelModalError ? (
                  <p className="mt-1 text-sm text-red-600">{cancelModalError}</p>
                ) : null}
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-red-200 p-2 text-sm"
                  value={cancelModalMotivo}
                  onChange={(event) => setCancelModalMotivo(event.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-red-700 neuro-shadow-button bg-red-100"
                    onClick={handleCancelModalConfirm}
                    disabled={isSaving}
                  >
                    Confirmar cancelacion
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelModalMotivo("");
                      setCancelModalError("");
                    }}
                  >
                    Volver
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {cancelPedidoId !== null ? (
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
              Cancelar pedido #{cancelPedidoId}
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



