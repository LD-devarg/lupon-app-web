import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import { getVentas } from "../services/api/ventas";
import { getCompras } from "../services/api/compras";
import { getNotaCredito, getNotasCredito } from "../services/api/notasCredito";

export default function NotasCreditoListado() {
  const [contacto, setContacto] = useState("");
  const [tipo, setTipo] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [notas, setNotas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [selectedNota, setSelectedNota] = useState(null);

  const loadData = async () => {
    setError("");
    try {
      setIsLoading(true);
      const [notasData, contactosData, productosData, ventasData, comprasData] =
        await Promise.all([
          getNotasCredito(),
          getContactos(),
          getProductos(),
          getVentas(),
          getCompras(),
        ]);
      setNotas(notasData || []);
      setContactos(contactosData || []);
      setProductos(productosData || []);
      setVentas(ventasData || []);
      setCompras(comprasData || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las notas de credito.");
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

  const contactosById = useMemo(() => {
    return contactos.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [contactos]);

  const productosById = useMemo(() => {
    return productos.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [productos]);

  const ventasById = useMemo(() => {
    return ventas.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [ventas]);

  const comprasById = useMemo(() => {
    return compras.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [compras]);

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const capitalize = (value) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const filteredNotas = useMemo(() => {
    if (!useFiltro) return notas;
    const contactoFiltro = contacto.trim().toLowerCase();
    const tipoFiltro = tipo.trim().toLowerCase();
    return notas.filter((nota) => {
      const nombreContacto =
        contactosById[String(nota.contacto)]?.nombre || "";
      const matchContacto = contactoFiltro
        ? nombreContacto.toLowerCase().includes(contactoFiltro)
        : true;
      const matchTipo = tipoFiltro
        ? nota.tipo?.toLowerCase() === tipoFiltro
        : true;
      return matchContacto && matchTipo;
    });
  }, [useFiltro, notas, contacto, tipo, contactosById]);

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setContacto("");
    setTipo("");
    setUseFiltro(false);
  };

  const handleVer = async (notaId) => {
    setModalError("");
    try {
      const data = await getNotaCredito(notaId);
      setSelectedNota(data);
      setIsModalOpen(true);
    } catch (err) {
      setError(err?.message || "No se pudo cargar la nota de credito.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNota(null);
    setModalError("");
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Notas de credito</h2>
      <p className="mt-1 text-sm text-gray-600">
        Listado para consultar notas de credito creadas.
      </p>

      <form
        className="mt-4 grid grid-cols-3 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col col-span-2">
          <label className="text-sm font-medium text-gray-700">Contacto</label>
          <input
            type="text"
            placeholder="Buscar por nombre"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={contacto}
            onChange={(event) => setContacto(event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Tipo</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="venta">Venta</option>
              <option value="compra">Compra</option>
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
          <p className="text-sm text-gray-600">Cargando notas...</p>
        ) : null}
        {!isLoading && filteredNotas.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {filteredNotas.map((nota) => (
          <div key={nota.id} className="neuro-shadow-div p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                Nota #{nota.id}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {capitalize(nota.tipo)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              Contacto: {contactosById[String(nota.contacto)]?.nombre || nota.contacto}
            </p>
            <p className="text-sm text-gray-700">
              Fecha: {nota.fecha_nota}
            </p>
            <p className="text-sm text-gray-700">
              Estado: {capitalize(nota.estado)}
            </p>
            <p className="text-sm text-gray-700">
              Total: {formatArs(nota.total)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleVer(nota.id)}
              >
                Ver
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedNota ? (
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
              Nota #{selectedNota.id}
            </h3>
            <p className="text-sm text-gray-600">
              Contacto: {contactosById[String(selectedNota.contacto)]?.nombre || selectedNota.contacto}
            </p>
            <p className="text-sm text-gray-600">
              Tipo: {capitalize(selectedNota.tipo)}
            </p>
            <p className="text-sm text-gray-600">
              Estado: {capitalize(selectedNota.estado)}
            </p>
            <p className="text-sm text-gray-600">
              Total: {formatArs(selectedNota.total)}
            </p>
            {modalError ? (
              <p className="mt-2 text-sm text-red-600">{modalError}</p>
            ) : null}

            <div className="mt-4 space-y-3">
              <span className="text-sm font-semibold text-gray-700">Detalles</span>
              {selectedNota.detalles && selectedNota.detalles.length > 0 ? (
                selectedNota.detalles.map((detalle, index) => (
                  <div key={`detalle-${index}`} className="rounded-lg border border-gray-200 p-3">
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

            <div className="mt-4 space-y-3">
              <span className="text-sm font-semibold text-gray-700">Aplicaciones</span>
              {selectedNota.aplicaciones && selectedNota.aplicaciones.length > 0 ? (
                selectedNota.aplicaciones.map((aplicacion, index) => {
                  const ventaId = aplicacion.venta;
                  const compraId = aplicacion.compra;
                  const ventaData = ventaId ? ventasById[String(ventaId)] : null;
                  const compraData = compraId ? comprasById[String(compraId)] : null;
                  return (
                    <div key={`aplicacion-${index}`} className="rounded-lg border border-gray-200 p-3">
                      {ventaId ? (
                        <p className="text-sm text-gray-700">
                          Venta #{ventaId} {ventaData ? `- ${ventaData.fecha_venta}` : ""}
                        </p>
                      ) : null}
                      {compraId ? (
                        <p className="text-sm text-gray-700">
                          Compra #{compraId} {compraData ? `- ${compraData.fecha_compra}` : ""}
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-700">
                        Monto aplicado: {formatArs(aplicacion.monto_aplicado)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-600">Sin aplicaciones cargadas.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

