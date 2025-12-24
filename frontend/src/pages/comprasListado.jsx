import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import { cambiarEstadoCompra, getCompra, getCompras } from "../services/api/compras";
import { useNavigate } from "react-router-dom";

export default function ComprasListado() {
  const navigate = useNavigate();
  const [proveedor, setProveedor] = useState("");
  const [estadoCompra, setEstadoCompra] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [modalEstado, setModalEstado] = useState("");
  const [modalMotivo, setModalMotivo] = useState("");

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
    if (isModalOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isModalOpen]);

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
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Compras</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado para buscar y gestionar compras.
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
          <label className="text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={fechaCompra}
            onChange={(event) => setFechaCompra(event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Estado compra</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={estadoCompra}
              onChange={(event) => setEstadoCompra(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="recibida">Recibida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Estado pago</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
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
          Limpiar
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={loadData}
        >
          Refrescar
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-600">Cargando compras...</p>
        ) : null}
        {!isLoading && filteredCompras.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {filteredCompras.map((compra) => (
          <div key={compra.id} className="neuro-shadow-div p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                Compra #{compra.id}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {compra.estado_compra}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              Proveedor: {proveedoresById[String(compra.proveedor)]?.nombre || compra.proveedor}
            </p>
            <p className="text-sm text-gray-700">
              Fecha: {compra.fecha_compra}
            </p>
            <p className="text-sm text-gray-700">
              Total: {formatArs(compra.total)}
            </p>
            <p className="text-sm text-gray-700">
              Saldo: {formatArs(compra.saldo_pendiente)}
            </p>
            <p className="text-sm text-gray-700">
              Estado pago: {compra.estado_pago}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleVer(compra.id)}
              >
                Ver
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => navigate(`/caja?tipo=pago&vista=nuevo&compra=${compra.id}`)}
              >
                Generar pago
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedCompra ? (
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
              Compra #{selectedCompra.id}
            </h3>
            <p className="text-sm text-gray-600">
              Proveedor: {proveedoresById[String(selectedCompra.proveedor)]?.nombre || selectedCompra.proveedor}
            </p>
            <p className="text-sm text-gray-600">
              Estado pago: {selectedCompra.estado_pago}
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-red-600">{modalError}</p>
            ) : null}
            {modalOk ? (
              <p className="mt-2 text-sm text-green-700">{modalOk}</p>
            ) : null}
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700">Estado compra</label>
              <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                <select
                  className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                  value={modalEstado}
                  onChange={(event) => setModalEstado(event.target.value)}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="recibida">Recibida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
            {modalEstado === "cancelada" ? (
              <div className="mt-3">
                <label className="text-sm font-medium text-gray-700">Motivo</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                  value={modalMotivo}
                  onChange={(event) => setModalMotivo(event.target.value)}
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <span className="text-sm font-semibold text-gray-700">Detalles</span>
              {selectedCompra.detalles && selectedCompra.detalles.length > 0 ? (
                selectedCompra.detalles.map((detalle) => (
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

