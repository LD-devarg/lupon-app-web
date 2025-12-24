import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import { getPedidoCompra, getPedidosCompras } from "../services/api/pedidosCompras";
import { createCompra } from "../services/api/compras";

export default function Compras() {
  const [searchParams] = useSearchParams();
  const pedidoParam = searchParams.get("pedido");

  const [proveedorId, setProveedorId] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidosValidos, setPedidosValidos] = useState([]);
  const [pedidoCompraId, setPedidoCompraId] = useState(pedidoParam || "");
  const [observaciones, setObservaciones] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [extra, setExtra] = useState("");
  const [descuento, setDescuento] = useState("");
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [proveedoresData, productosData, pedidosData] = await Promise.all([
          getContactos({ tipo: "proveedor" }),
          getProductos(),
          getPedidosCompras(),
        ]);
        setProveedores(proveedoresData || []);
        setProductos(productosData || []);
        setPedidosValidos(
          (pedidosData || []).filter((pedido) => pedido.estado === "validado")
        );
      } catch (error) {
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };
    loadData();
  }, []);

  const productosById = useMemo(() => {
    return productos.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [productos]);

  const hydrateFromPedido = (pedido) => {
    setPedidoCompraId(String(pedido.id));
    setProveedorId(String(pedido.proveedor));
    setObservaciones(pedido.observaciones || "");
    const detallesFormateados = (pedido.detalles || []).map((detalle) => ({
      producto: String(detalle.producto),
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precio_unitario,
    }));
    setItems(detallesFormateados);
  };

  useEffect(() => {
    if (!pedidoParam) return;
    const loadPedido = async () => {
      try {
        const pedido = await getPedidoCompra(pedidoParam);
        if (pedido?.estado !== "validado") {
          setLoadError("El pedido seleccionado no esta validado.");
          return;
        }
        hydrateFromPedido(pedido);
      } catch (error) {
        setLoadError(error?.message || "No se pudo cargar el pedido.");
      }
    };
    loadPedido();
  }, [pedidoParam]);

  const handlePedidoChange = async (nextId) => {
    setSubmitError("");
    setSubmitOk("");
    if (!nextId) {
      setPedidoCompraId("");
      setProveedorId("");
      setObservaciones("");
      setItems([]);
      return;
    }
    try {
      const pedido = await getPedidoCompra(nextId);
      if (pedido?.estado !== "validado") {
        setSubmitError("Solo se pueden usar pedidos validados.");
        return;
      }
      hydrateFromPedido(pedido);
    } catch (error) {
      setSubmitError(error?.message || "No se pudo cargar el pedido.");
    }
  };

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

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductoChange = (index, productoId) => {
    const productoData = productosById[String(productoId)];
    const precioDefault = productoData?.precio_compra
      ? String(productoData.precio_compra)
      : "";
    setItems((prev) =>
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

    if (!proveedorId) {
      setSubmitError("Selecciona un proveedor.");
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
        proveedor: Number(proveedorId),
        detalles,
      };
      if (pedidoCompraId) {
        payload.pedido_compra = Number(pedidoCompraId);
      }
      if (observaciones.trim()) {
        payload.observaciones = observaciones.trim();
      }
      if (numeroDocumento.trim()) {
        payload.numero_documento = numeroDocumento.trim();
      }
      if (extra !== "") {
        payload.extra = extra;
      }
      if (descuento !== "") {
        payload.descuento = descuento;
      }
      const response = await createCompra(payload);
      setSubmitOk(`Compra #${response?.id || ""} guardada.`);
      setItems([]);
      setObservaciones("");
      setNumeroDocumento("");
      setExtra("");
      setDescuento("");
      setPedidoCompraId("");
      setProveedorId("");
    } catch (error) {
      setSubmitError(error?.message || "No se pudo guardar la compra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto bg-neutral-300 mt-2 max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nueva compra</h2>
      <p className="mt-1 text-sm text-gray-600">
        Carga de compras a proveedores.
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

        <div>
          <label className="text-sm font-medium text-gray-700">
            Pedido de compra (validado)
          </label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={pedidoCompraId}
              onChange={(event) => handlePedidoChange(event.target.value)}
            >
              <option value="">Sin pedido asociado</option>
              {pedidosValidos.map((pedido) => (
                <option key={pedido.id} value={pedido.id}>
                  Pedido #{pedido.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Proveedor
          </label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={proveedorId}
              onChange={(event) => setProveedorId(event.target.value)}
              disabled={Boolean(pedidoCompraId)}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-600">
              Agrega productos para completar la compra.
            </p>
          ) : null}
          {items.map((item, index) => (
            <div
              key={`item-${index}`}
              className="space-y-3 rounded-md border-t border-b border-gray-500 py-4"
            >
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Extra</label>
            <input
              type="number"
              className="mt-1 w-full rounded-lg p-2 text-sm input-shadow bg-neutral-300"
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descuento</label>
            <input
              type="number"
              className="mt-1 w-full rounded-lg p-2 text-sm input-shadow bg-neutral-300"
              value={descuento}
              onChange={(event) => setDescuento(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Numero documento
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg p-2 text-sm input-shadow bg-neutral-300"
            value={numeroDocumento}
            onChange={(event) => setNumeroDocumento(event.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Observaciones
          </label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <textarea
              placeholder="Observaciones"
              className="w-full bg-transparent rounded-lg focus:outline-none"
              rows={3}
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </div>
        </div>

        <Button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={handleAddItem}
        >
          Agregar producto
        </Button>
        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar compra"}
        </Button>
      </form>
    </div>
  );
}
