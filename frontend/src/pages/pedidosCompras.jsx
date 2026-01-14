import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import { createPedidoCompra } from "../services/api/pedidosCompras";

export default function PedidosCompras() {
  const [proveedorId, setProveedorId] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [observaciones, setObservaciones] = useState("");
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [proveedoresData, productosData] = await Promise.all([
          getContactos({ tipo: "proveedor" }),
          getProductos(),
        ]);
        setProveedores(proveedoresData || []);
        setProductos(productosData || []);
      } catch (error) {
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };
    loadData();
  }, []);

  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        value: String(producto.id),
        label: producto.nombre,
      })),
    [productos]
  );

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
    const productoData = productos.find(
      (producto) => String(producto.id) === String(productoId)
    );
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
        estado: "pendiente",
        detalles,
      };
      if (observaciones.trim()) {
        payload.observaciones = observaciones.trim();
      }
      const response = await createPedidoCompra(payload);
      setSubmitOk(`Pedido #${response?.id || ""} guardado.`);
      setItems([]);
      setObservaciones("");
    } catch (error) {
      setSubmitError(error?.message || "No se pudo guardar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto bg-neutral-300 mt-2 max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nuevo pedido de compra</h2>
      <p className="mt-1 text-sm text-gray-600">
        Pantalla para cargar pedidos a proveedores.
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
            Proveedor
          </label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={proveedorId}
              onChange={(event) => setProveedorId(event.target.value)}
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
              Agrega productos para completar el pedido.
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
                <SearchableSelect
                  options={productoOptions}
                  value={item.producto}
                  onChange={(value) => handleProductoChange(index, value)}
                  placeholder="Buscar producto"
                  wrapperClassName="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300 space-y-2"
                  inputClassName="w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                  selectClassName="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                />
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
          {isSubmitting ? "Guardando..." : "Guardar pedido"}
        </Button>
      </form>
    </div>
  );
}
