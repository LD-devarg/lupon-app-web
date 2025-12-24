import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import {
  getPedidoCompra,
  getPedidosCompras,
  updatePedidoCompra,
} from "../services/api/pedidosCompras";

export default function PedidosComprasListado() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [useFiltro, setUseFiltro] = useState(false);
  const [proveedores, setProveedores] = useState([]);
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
  const [modalObservaciones, setModalObservaciones] = useState("");

  const loadPedidos = async () => {
    setError("");
    try {
      setIsLoading(true);
      const data = await getPedidosCompras();
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
        const [proveedoresData, productosData] = await Promise.all([
          getContactos({ tipo: "proveedor" }),
          getProductos(),
        ]);
        setProveedores(proveedoresData || []);
        setProductos(productosData || []);
      } catch (err) {
        setError(err?.message || "No se pudieron cargar los datos.");
      }
    };
    loadExtras();
  }, []);

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

  const filteredPedidos = useMemo(() => {
    if (!useFiltro) return pedidos;
    const estadoFiltro = estado.trim().toLowerCase();
    const proveedorFiltro = proveedor.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      const matchEstado = estadoFiltro
        ? pedido.estado?.toLowerCase() === estadoFiltro
        : true;
      const nombreProveedor =
        proveedoresById[String(pedido.proveedor)]?.nombre || "";
      const matchProveedor = proveedorFiltro
        ? nombreProveedor.toLowerCase().includes(proveedorFiltro)
        : true;
      return matchEstado && matchProveedor;
    });
  }, [useFiltro, pedidos, estado, proveedor, proveedoresById]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setEstado("");
    setProveedor("");
    setUseFiltro(false);
  };

  const handleVer = async (pedidoId) => {
    setModalError("");
    setModalOk("");
    try {
      const data = await getPedidoCompra(pedidoId);
      setSelectedPedido(data);
      setModalEstado(data.estado || "");
      setModalObservaciones(data.observaciones || "");
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
    if (isModalOpen) {
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
    setModalObservaciones("");
  };

  const handleDetalleChange = (index, field, value) => {
    setModalDetalles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleDetalleProductoChange = (index, productoId) => {
    const productoData = productosById[String(productoId)];
    const precioDefault = productoData?.precio_compra
      ? String(productoData.precio_compra)
      : "";
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
    try {
      setIsSaving(true);
      await updatePedidoCompra(selectedPedido.id, {
        estado: modalEstado,
        observaciones: modalObservaciones.trim() || undefined,
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

  const handleGenerarCompra = () => {
    if (!selectedPedido) return;
    handleModalClose();
    navigate(`/compras?pedido=${selectedPedido.id}`);
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Pedidos de compra</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado para buscar y gestionar pedidos.
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
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="validado">Validado</option>
              <option value="cancelado">Cancelado</option>
              <option value="recibido">Recibido</option>
            </select>
          </div>
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
          Limpiar filtros
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={loadPedidos}
        >
          Refrescar
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
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
              Proveedor: {proveedoresById[String(pedido.proveedor)]?.nombre || pedido.proveedor}
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
                onClick={() => handleVer(pedido.id)}
              >
                Ver
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
              Proveedor: {proveedoresById[String(selectedPedido.proveedor)]?.nombre || selectedPedido.proveedor}
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
                  <option value="validado">Validado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="recibido">Recibido</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Observaciones</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                value={modalObservaciones}
                onChange={(event) => setModalObservaciones(event.target.value)}
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
                onClick={handleGenerarCompra}
              >
                Generar compra
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

