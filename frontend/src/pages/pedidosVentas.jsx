import { useEffect, useState } from "react";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getProductos } from "../services/api/productos";
import { createPedidoVenta } from "../services/api/pedidosVentas";

export default function PedidosVentas() {
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [aclaraciones, setAclaraciones] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [clientesData, productosData] = await Promise.all([
          getClientes(),
          getProductos(),
        ]);
        if (!isMounted) return;
        setClientes(clientesData || []);
        setProductos(productosData || []);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { cantidad: "", producto: "", precioUnitario: "" },
    ]);
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
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

  const handleProductoChange = (index, productoId) => {
    const clienteSeleccionado = clientes.find(
      (cliente) => String(cliente.id) === String(clienteId)
    );
    const productoSeleccionado = productos.find(
      (producto) => String(producto.id) === String(productoId)
    );
    const precioDefault = getDefaultPrecio(
      productoSeleccionado,
      clienteSeleccionado
    );
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, producto: productoId, precioUnitario: precioDefault }
          : item
      )
    );
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClienteChange = (nextClienteId) => {
    setClienteId(nextClienteId);
    const clienteSeleccionado = clientes.find(
      (cliente) => String(cliente.id) === String(nextClienteId)
    );
    setDireccionEntrega(clienteSeleccionado?.direccion || "");
    setItems((prev) =>
      prev.map((item) => {
        if (!item.producto) return item;
        const productoSeleccionado = productos.find(
          (producto) => String(producto.id) === String(item.producto)
        );
        const precioDefault = getDefaultPrecio(
          productoSeleccionado,
          clienteSeleccionado
        );
        return {
          ...item,
          precioUnitario: precioDefault,
        };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitOk("");

    if (!clienteId) {
      setSubmitError("Selecciona un cliente.");
      return;
    }
    if (items.length === 0) {
      setSubmitError("Agrega al menos un producto.");
      return;
    }

    const detalles = items.map((item) => ({
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
      setSubmitError("Completa producto, cantidad y precio unitario.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        cliente: Number(clienteId),
        estado: "pendiente",
        detalles,
      };
      const direccionTrimmed = direccionEntrega.trim();
      const aclaracionesTrimmed = aclaraciones.trim();
      if (direccionTrimmed) {
        payload.direccion_entrega = direccionTrimmed;
      }
      if (aclaracionesTrimmed) {
        payload.aclaraciones = aclaracionesTrimmed;
      }
      const response = await createPedidoVenta(payload);
      setSubmitOk(`Pedido #${response?.id || ""} guardado.`);
      setItems([]);
    } catch (error) {
      setSubmitError(error?.message || "No se pudo guardar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto bg-neutral-300 mt-2 max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nuevo pedido</h2>
      <p className="mt-1 text-sm text-gray-600">
        Pantalla generica para probar el flujo de carga.
      </p>

      <form className="mt-4 space-y-4 rounded-xl pedidos-shadow p-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium text-gray-700">
            Cliente
          </label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={clienteId}
              onChange={(event) => handleClienteChange(event.target.value)}
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
            <label className="text-sm font-medium text-gray-700">
                Direccion de entrega
            </label>
            <input
                type="text"
                placeholder="Direccion de entrega"
                className="mt-1 w-full rounded-lg p-2 text-sm input-shadow bg-neutral-300"
                value={direccionEntrega}
                onChange={(event) => setDireccionEntrega(event.target.value)}
            />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">
              Fecha
            </label>
            <div
              className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                <input
                type="date"
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">
              Estado
            </label>
            <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                <select
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                >
                <option>Pendiente</option>
                <option>Confirmado</option>
                <option>Entregado</option>
                </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : null}
          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}
          {submitOk ? (
            <p className="text-sm text-green-700">{submitOk}</p>
          ) : null}
          {items.length === 0 ? (
            <p className="text-sm text-gray-600">
              Agrega productos para completar el pedido.
            </p>
          ) : null}
          {items.map((item, index) => (
            <div key={`item-${index}`} className="space-y-3 rounded-md border-t border-b border-gray-500 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Producto {index + 1}
                </span>
                <Button
                  type="button"
                  className="text-sm text-red-600 hover:text-red-700"
                  onClick={() => handleRemoveItem(index)}
                >
                  Quitar
                </Button>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Cantidad
                </label>
                <input
                  type="number"
                  placeholder="Cantidad"
                  className="mt-1 rounded-lg p-2 text-sm input-shadow bg-neutral-300"
                  value={item.cantidad}
                  onChange={(event) =>
                    handleItemChange(index, "cantidad", event.target.value)
                  }
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Producto</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={item.producto}
                    onChange={(event) =>
                      handleProductoChange(index, event.target.value)
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
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Precio unitario</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg p-2 text-sm input-shadow bg-neutral-300"
                  value={item.precioUnitario}
                  onChange={(event) =>
                    handleItemChange(index, "precioUnitario", event.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <div>
            <label className="text-sm font-medium text-gray-700">
                Aclaraciones
            </label>
            <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                <textarea
                placeholder="Aclaraciones adicionales"
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                rows={3}
                value={aclaraciones}
                onChange={(event) => setAclaraciones(event.target.value)}
                ></textarea>
            </div>
        </div>

        <Button 
            type="button"
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
            onClick={handleAddItem}>
            Agregar producto
        </Button>
        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar pedido"}
        </Button>
      </form>
    </div>
  );
}


