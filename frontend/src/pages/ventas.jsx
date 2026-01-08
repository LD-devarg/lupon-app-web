import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { getPedidoVenta, getPedidosVentas } from "../services/api/pedidosVentas";
import { createVenta } from "../services/api/ventas";

export default function Ventas() {
  const [searchParams] = useSearchParams();
  const pedidoParam = searchParams.get("pedido");

  const [pedidosAceptados, setPedidosAceptados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidoId, setPedidoId] = useState(pedidoParam || "");
  const [clienteId, setClienteId] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [formaPago, setFormaPago] = useState("contado");
  const [costoEntrega, setCostoEntrega] = useState("");
  const [descuento, setDescuento] = useState("");
  const [detalles, setDetalles] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pedidosData, clientesData, productosData] = await Promise.all([
          getPedidosVentas({ estado: "aceptado" }),
          getClientes(),
          getProductos(),
        ]);
        setPedidosAceptados(pedidosData || []);
        setClientes(clientesData || []);
        setProductos(productosData || []);
      } catch (error) {
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };
    loadData();
  }, []);

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

  const formatDate = (value) => {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };

  const getDefaultPrecio = (producto, cliente) => {
    if (!producto) return "";
    const categoria = cliente?.categoria;
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

  const hydrateFromPedido = (pedido) => {
    setPedidoId(String(pedido.id));
    setClienteId(String(pedido.cliente));
    setDireccionEntrega(pedido.direccion_entrega || "");
    setFechaEntrega("");
    const clienteData = clientesById[String(pedido.cliente)];
    const detallesFormateados = (pedido.detalles || []).map((detalle) => ({
      producto: String(detalle.producto),
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precio_unitario,
    }));
    if (!detallesFormateados.length) {
      setDetalles([
        { producto: "", cantidad: "", precioUnitario: "" },
      ]);
    } else {
      setDetalles(
        detallesFormateados.map((detalle) => {
          if (!detalle.precioUnitario) {
            const productoData = productosById[String(detalle.producto)];
            return {
              ...detalle,
              precioUnitario: getDefaultPrecio(productoData, clienteData),
            };
          }
          return detalle;
        })
      );
    }
  };

  useEffect(() => {
    if (!pedidoParam) return;
    const loadPedido = async () => {
      try {
        const pedido = await getPedidoVenta(pedidoParam);
        if (pedido?.estado !== "aceptado") {
          setLoadError("El pedido seleccionado no esta aceptado.");
          return;
        }
        hydrateFromPedido(pedido);
      } catch (error) {
        setLoadError(error?.message || "No se pudo cargar el pedido.");
      }
    };
    loadPedido();
  }, [pedidoParam, clientesById, productosById]);

  const handlePedidoChange = async (nextId) => {
    setSubmitError("");
    setSubmitOk("");
    if (!nextId) {
      setPedidoId("");
      setClienteId("");
      setDireccionEntrega("");
      setFechaEntrega("");
      setDetalles([]);
      return;
    }
    try {
      const pedido = await getPedidoVenta(nextId);
      if (pedido?.estado !== "aceptado") {
        setSubmitError("Solo se pueden usar pedidos aceptados.");
        return;
      }
      hydrateFromPedido(pedido);
    } catch (error) {
      setSubmitError(error?.message || "No se pudo cargar el pedido.");
    }
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      { producto: "", cantidad: "", precioUnitario: "" },
    ]);
  };

  const handleRemoveDetalle = (index) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetalleChange = (index, field, value) => {
    setDetalles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleDetalleProductoChange = (index, productoId) => {
    const clienteData = clientesById[String(clienteId)];
    const productoData = productosById[String(productoId)];
    const precioDefault = getDefaultPrecio(productoData, clienteData);
    setDetalles((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, producto: productoId, precioUnitario: precioDefault }
          : item
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitOk("");
    if (!pedidoId) {
      setSubmitError("Selecciona un pedido aceptado.");
      return;
    }
    const detallesPayload = detalles.map((item) => ({
      producto: item.producto,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
    }));
    const hayVacios = detallesPayload.some(
      (detalle) =>
        !detalle.producto ||
        !detalle.cantidad ||
        !detalle.precio_unitario
    );
    if (hayVacios) {
      setSubmitError("Completa producto, cantidad y precio unitario.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        pedido_venta: Number(pedidoId),
        cliente: Number(clienteId),
        forma_pago: formaPago,
        detalles: detallesPayload,
      };
      if (direccionEntrega.trim()) {
        payload.direccion_entrega = direccionEntrega.trim();
      }
      if (fechaEntrega) {
        payload.fecha_entrega = fechaEntrega;
      }
      if (costoEntrega) {
        payload.costo_entrega = costoEntrega;
      }
      if (descuento) {
        payload.descuento = descuento;
      }
      const response = await createVenta(payload);
      setSubmitOk(`Venta #${response?.id || ""} creada.`);
      setDetalles([]);
      setFechaEntrega("");
    } catch (error) {
      setSubmitError(error?.message || "No se pudo crear la venta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nueva venta</h2>
      <p className="mt-1 text-sm text-gray-600">
        Selecciona un pedido aceptado o carga la venta manualmente.
      </p>

      <form
        className="mt-4 space-y-4 rounded-xl pedidos-shadow p-4"
        onSubmit={handleSubmit}
      >
        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-red-600">{submitError}</p>
        ) : null}
        {submitOk ? (
          <p className="text-sm text-green-700">{submitOk}</p>
        ) : null}

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Pedido de venta</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={pedidoId}
              onChange={(event) => handlePedidoChange(event.target.value)}
            >
              <option value="">Seleccionar pedido aceptado</option>
              {pedidosAceptados.map((pedido) => (
                <option key={pedido.id} value={pedido.id}>
                  Pedido #{pedido.id} - {formatDate(pedido.fecha_pedido)} -{" "}
                  {clientesById[String(pedido.cliente)]?.nombre || pedido.cliente}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={clienteId}
              onChange={(event) => setClienteId(event.target.value)}
              disabled
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((clienteItem) => (
                <option key={clienteItem.id} value={clienteItem.id}>
                  {clienteItem.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Direccion de entrega</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={direccionEntrega}
            onChange={(event) => setDireccionEntrega(event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Fecha de entrega</label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={fechaEntrega}
            onChange={(event) => setFechaEntrega(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Forma de pago</label>
            <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
              <select
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                value={formaPago}
                onChange={(event) => setFormaPago(event.target.value)}
              >
                <option value="contado">Contado</option>
                <option value="contado pendiente">Contado pendiente</option>
                <option value="cuenta corriente">Cuenta corriente</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Costo entrega</label>
            <input
              type="number"
              className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
              value={costoEntrega}
              onChange={(event) => setCostoEntrega(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Descuento</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={descuento}
            onChange={(event) => setDescuento(event.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Detalles</span>
            <Button
              type="button"
              className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={handleAddDetalle}
            >
              Agregar detalle
            </Button>
          </div>
          {detalles.length === 0 ? (
            <p className="text-sm text-gray-600">Agrega productos para la venta.</p>
          ) : null}
          {detalles.map((detalle, index) => (
            <div key={`detalle-${index}`} className="rounded-lg border border-gray-300 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Item {index + 1}
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
                  <label className="text-sm font-medium text-gray-700">Producto</label>
                  <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                    <select
                      className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                      value={detalle.producto}
                      onChange={(event) =>
                        handleDetalleProductoChange(index, event.target.value)
                      }
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
                      className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
                      value={detalle.cantidad}
                      onChange={(event) =>
                        handleDetalleChange(index, "cantidad", event.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Precio unitario</label>
                    <input
                      type="number"
                      className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
                      value={detalle.precioUnitario}
                      onChange={(event) =>
                        handleDetalleChange(index, "precioUnitario", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Crear venta"}
        </Button>
      </form>
    </div>
  );
}


