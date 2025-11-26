import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { p } from "motion/react-client";
import { useState, useEffect } from "react";

export default function FullScreenOrderProductsModal({
  open,
  onClose,
  pedidoId,
}) {
  const [productos, setProductos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);

  /* Cargar detalles del pedido */
  useEffect(() => {
    if (!open || !pedidoId) return;

    setLineas([]);

    const fetchData = async () => {
      try {
        setLoading(true);

        const productosRes = await fetch("/api/productos/");
        const detallesRes = await fetch(
          `/api/pedidos_ventas_detalle/?pedido=${pedidoId}`
        );

        const productosData = await productosRes.json();
        const detallesData = await detallesRes.json();

        setProductos(productosData);

        // Normalizar lineas iniciales
        setLineas(
          detallesData.map((d) => ({
            id: d.id,
            producto: d.producto,
            cantidad: d.cantidad,
            precio: d.precio_unitario,
          }))
        );
      } catch (e) {
        console.error("Error cargando productos/detalles:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, pedidoId]);

  /* Guardar lineas */
  const handleGuardar = async () => {
    try {
      setLoading(true);

      for (let linea of lineas) {
        if (!linea.producto || !linea.cantidad || !linea.precio) continue;

        const payload = {
          pedido: pedidoId,
          producto: linea.producto,
          cantidad: linea.cantidad,
          precio_unitario: linea.precio,
        };

        if (linea.id) {
          // PATCH si ya existe
          await fetch(`/api/pedidos_ventas_detalle/${linea.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          // Crear
          await fetch("/api/pedidos_ventas_detalle/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }

      onClose();
    } catch (err) {
      console.error("Error guardando productos:", err);
      alert("Error al guardar productos");
    } finally {
      setLoading(false);
    }
  };

  /* Agregar nueva línea */
  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      { id: null, producto: "", cantidad: 1, precio: "" },
    ]);
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="fixed inset-0 flex flex-col bg-slate-900 text-white">

        {/* HEADER */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/80 backdrop-blur">
          <DialogTitle className="text-lg font-semibold">
            Productos del Pedido #{pedidoId}
          </DialogTitle>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {lineas.map((linea, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/10 border border-white/10 space-y-4"
            >
              {/* PRODUCTO */}
              <div>
                <label className="text-gray-300 text-sm">Producto</label>
                <select
                className="w-full mt-1 p-3 rounded-lg bg-black/20 text-white"
                value={linea.producto}
                onChange={(e) => {
                    const nuevoProductoId = e.target.value;
                    const prod = productos.find((p) => p.id.toString() === nuevoProductoId.toString());

                    setLineas((prev) =>
                    prev.map((l, i) =>
                        i === idx
                        ? {
                            ...l,
                            producto: nuevoProductoId,
                            precio: prod ? prod.precio : "",
                            }
                        : l
                    )
                    );
                }}
                >
                <option value="">Seleccionar</option>
                {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                    {p.nombre}
                    </option>
                ))}
                </select>
              </div>

              {/* CANTIDAD */}
              <div>
                <label className="text-gray-300 text-sm">Cantidad</label>
                <input
                  type="number"
                  className="w-full mt-1 p-3 rounded-lg bg-black/20"
                  value={linea.cantidad}
                  onChange={(e) =>
                    setLineas((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, cantidad: e.target.value } : l
                      )
                    )
                  }
                />
              </div>

              {/* PRECIO */}
              <div>
                <label className="text-gray-300 text-sm">Precio Unit.</label>
                <input
                  type="number"
                  className="w-full mt-1 p-3 rounded-lg bg-black/20"
                  value={linea.precio}
                  onChange={(e) =>
                    setLineas((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, precio: e.target.value } : l
                      )
                    )
                  }
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm">Importe</label>
                <input
                    type="number"
                    className="w-full mt-1 p-3 rounded-lg bg-black/20 text-white"
                    value={(
                    (parseFloat(linea.cantidad) || 0) *
                    (parseFloat(linea.precio) || 0)
                    ).toFixed(2)}
                    disabled
                />
                </div>
            </div>
          ))}

          {/* AGREGAR LINEA */}
          <button
            onClick={agregarLinea}
            className="w-full py-3 bg-blue-600/40 hover:bg-blue-600 rounded-xl transition"
          >
            + Agregar línea
          </button>
        </div>

        {/* FOOTER */}
        <div className="text-xl font-semibold text-right text-green-400 pr-1">
        Total: $
        {lineas
            .reduce(
            (acc, l) =>
                acc +
                (parseFloat(l.cantidad) || 0) *
                (parseFloat(l.precio) || 0),
            0
            )
            .toFixed(2)}
        </div>
        <div className="p-4 bg-slate-900/80 backdrop-blur border-t border-white/10">
          <button
            disabled={loading}
            onClick={handleGuardar}
            className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-semibold"
          >
            {loading ? "Guardando..." : "Guardar Productos"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
