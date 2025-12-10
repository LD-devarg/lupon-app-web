import { useState, useEffect } from "react";
import FullScreenOrderProductsModal from "./FullScreenOrderProductsModal";

function OrdersComponent() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  const [clienteId, setClienteId] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NUEVO: guardamos el ID del pedido recién creado
  const [pedidoId, setPedidoId] = useState(null);

  // NUEVO: controlar apertura del modal fullscreen
  const [showFullScreen, setShowFullScreen] = useState(false);

  /* CARGA CLIENTES + PRODUCTOS */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientesRes = await fetch("/api/contactos/?clientes=1");
        const productosRes = await fetch("/api/productos/");

        if (!clientesRes.ok || !productosRes.ok) {
          throw new Error("Error al obtener datos");
        }

        setClientes(await clientesRes.json());
        setProductos(await productosRes.json());
      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    };
    fetchData();
  }, []);

  /* CUANDO CAMBIA EL CLIENTE → ARMAR DIRECCIÓN */
  useEffect(() => {
    if (!clienteId) {
      setDireccion("");
      return;
    }

    const seleccionado = clientes.find((c) => c.id.toString() === clienteId.toString());
    if (seleccionado) {
      const direccionCompleta = [
        seleccionado.calle,
        seleccionado.numero,
        seleccionado.ciudad,
      ]
        .filter(Boolean)
        .join(" ");

      setDireccion(direccionCompleta);
    }
  }, [clienteId, clientes]);

  /* SUBMIT */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clienteId) {
      alert("Seleccioná un cliente.");
      return;
    }

    if (!fechaEntrega) {
      alert("Seleccioná una fecha de entrega.");
      return;
    }

    setIsSubmitting(true);

    try {
      const fechaEntregaISO = `${fechaEntrega}T00:00:00`;

      const payload = {
        cliente: clienteId,
        fecha_entrega: fechaEntregaISO,
        direccion_entrega: direccion,
        total: "0.00",
      };

      const res = await fetch("/api/pedidos_ventas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("Error al crear pedido:", errorData || res.statusText);
        alert("Hubo un error al crear el pedido.");
        return;
      }

      const data = await res.json();

      alert(`Pedido creado correctamente (#${data.id}).`);

      // Guardamos el ID del pedido creado
      setPedidoId(data.id);

      // Abrimos el modal fullscreen
      setShowFullScreen(true);

      // Limpiar formulario
      setClienteId("");
      setDireccion("");
      setFechaEntrega("");

    } catch (err) {
      console.error("Error en el submit del pedido:", err);
      alert("Error de conexión al crear el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* FORMULARIO */}
      <div className="p-4 rounded-xl backdrop-blur-md shadow-md gap-4 flex flex-col">
        <h1 className="color-blanco text-center">Nuevo Pedido</h1>

        <form onSubmit={handleSubmit}>
          {/* CLIENTE */}
          <div className="mb-4 flex flex-row gap-2 items-center">
            <label className="color-blanco font-bold w-auto">Cliente:</label>
            <select
              name="cliente"
              required
              className="color-blanco text-center w-full p-2 bg-slate-700 rounded-md"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Seleccioná un cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* FECHA ENTREGA */}
          <div className="mb-4 flex flex-row gap-2 items-center">
            <label className="color-blanco font-bold w-auto">
              Fecha de Entrega:
            </label>
            <input
              type="date"
              className="w-auto p-2 bg-slate-700 rounded-md color-blanco text-center"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </div>

          {/* DIRECCIÓN ENTREGA */}
          <div className="mb-4 flex flex-row gap-2 items-center">
            <label className="color-blanco font-bold w-auto">
              Dirección de entrega:
            </label>
            <input
              type="text"
              className="w-full p-2 bg-slate-700 rounded-md text-white text-center placeholder-slate-400"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ingresá la dirección"
              disabled={!clienteId}
            />
          </div>

          {/* BOTÓN SUBMIT */}
          <div className="mt-4">
            <button
              type="submit"
              disabled={isSubmitting || !clienteId || !fechaEntrega}
              className="w-full py-2 rounded-md bg-sky-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creando pedido..." : "Crear pedido"}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL FULLSCREEN PARA AGREGAR PRODUCTOS */}
      {pedidoId && (
        <FullScreenOrderProductsModal
          open={showFullScreen}
          onClose={() => setShowFullScreen(false)}
          pedidoId={pedidoId}
        />
      )}
    </>
  );
}

export default OrdersComponent;
