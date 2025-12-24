import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getContactos } from "../services/api/contactos";
import { getProductos } from "../services/api/productos";
import { getVentas } from "../services/api/ventas";
import { getCompras } from "../services/api/compras";
import { createNotaCredito } from "../services/api/notasCredito";

export default function NotasCredito() {
  const [tipo, setTipo] = useState("venta");
  const [contactoId, setContactoId] = useState("");
  const [monto, setMonto] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [fechaNota, setFechaNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const [detalles, setDetalles] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          clientesData,
          proveedoresData,
          productosData,
          ventasData,
          comprasData,
        ] = await Promise.all([
          getClientes(),
          getContactos({ tipo: "proveedor" }),
          getProductos(),
          getVentas(),
          getCompras(),
        ]);
        setClientes(clientesData || []);
        setProveedores(proveedoresData || []);
        setProductos(productosData || []);
        setVentas(ventasData || []);
        setCompras(comprasData || []);
      } catch (error) {
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };
    loadData();
  }, []);

  const contactos = tipo === "venta" ? clientes : proveedores;

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

  const documentosDisponibles = useMemo(() => {
    if (tipo === "venta") {
      return ventas.filter((venta) => {
        const saldo = Number(venta.saldo_pendiente || 0);
        return saldo > 0 && venta.estado_entrega !== "cancelada";
      });
    }
    return compras.filter((compra) => {
      const saldo = Number(compra.saldo_pendiente || 0);
      return saldo > 0 && compra.estado_compra !== "cancelada";
    });
  }, [tipo, ventas, compras]);

  const documentosById = useMemo(() => {
    return documentosDisponibles.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [documentosDisponibles]);

  const documentosDisponiblesContacto = useMemo(() => {
    if (!contactoId) return documentosDisponibles;
    return documentosDisponibles.filter((doc) => {
      const key = tipo === "venta" ? "cliente" : "proveedor";
      return String(doc[key]) === String(contactoId);
    });
  }, [documentosDisponibles, contactoId, tipo]);

  const getDefaultPrecio = (producto, contacto) => {
    if (!producto) return "";
    if (tipo === "compra") {
      return producto.precio_compra !== undefined && producto.precio_compra !== null
        ? String(producto.precio_compra)
        : "";
    }
    const categoria = contacto?.categoria;
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
    if (categoria === "Mayorista") {
      return producto.precio_mayorista !== undefined &&
        producto.precio_mayorista !== null
        ? String(producto.precio_mayorista)
        : "";
    }
    return "";
  };

  const handleTipoChange = (nextTipo) => {
    setTipo(nextTipo);
    setContactoId("");
    setMonto("");
    setNumeroDocumento("");
    setFechaNota("");
    setMotivo("");
    setDetalles([]);
    setAplicaciones([]);
    setSubmitError("");
    setSubmitOk("");
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
    const contactoData = contactosById[String(contactoId)];
    const productoData = productosById[String(productoId)];
    const precioDefault = getDefaultPrecio(productoData, contactoData);
    setDetalles((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, producto: productoId, precioUnitario: precioDefault }
          : item
      )
    );
  };

  const handleAddAplicacion = () => {
    setAplicaciones((prev) => [
      ...prev,
      { documento: "", montoAplicado: "" },
    ]);
  };

  const handleRemoveAplicacion = (index) => {
    setAplicaciones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAplicacionChange = (index, field, value) => {
    setAplicaciones((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAplicarSaldoTotal = () => {
    const nextAplicaciones = aplicaciones.map((item) => {
      if (!item.documento) return item;
      const saldo = documentosById[String(item.documento)]?.saldo_pendiente;
      return {
        ...item,
        montoAplicado: saldo !== undefined && saldo !== null ? String(saldo) : "",
      };
    });
    setAplicaciones(nextAplicaciones);
  };

  const totalDetalles = useMemo(() => {
    return detalles.reduce((sum, item) => {
      const cantidad = Number(item.cantidad || 0);
      const precio = Number(item.precioUnitario || 0);
      return sum + cantidad * precio;
    }, 0);
  }, [detalles]);

  const totalAplicado = useMemo(() => {
    return aplicaciones.reduce((sum, item) => {
      const value = Number(item.montoAplicado || 0);
      return sum + value;
    }, 0);
  }, [aplicaciones]);

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitOk("");
    if (!contactoId) {
      setSubmitError("Selecciona un contacto.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setSubmitError("Ingresa un monto valido.");
      return;
    }
    if (aplicaciones.length === 0) {
      setSubmitError("Agrega al menos una aplicacion.");
      return;
    }
    const detallesPayload = detalles.map((item) => ({
      producto: Number(item.producto),
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
    }));
    const hayDetallesVacios = detallesPayload.some(
      (detalle) =>
        !detalle.producto ||
        !detalle.cantidad ||
        Number(detalle.cantidad) <= 0 ||
        !detalle.precio_unitario ||
        Number(detalle.precio_unitario) <= 0
    );
    if (hayDetallesVacios) {
      setSubmitError("Completa producto, cantidad y precio unitario.");
      return;
    }
    const aplicacionesPayload = aplicaciones.map((item) => ({
      documento: Number(item.documento),
      monto_aplicado: item.montoAplicado,
    }));
    const hayAplicacionesVacias = aplicacionesPayload.some(
      (aplicacion) =>
        !aplicacion.documento ||
        !aplicacion.monto_aplicado ||
        Number(aplicacion.monto_aplicado) <= 0
    );
    if (hayAplicacionesVacias) {
      setSubmitError("Completa documento y monto aplicado.");
      return;
    }
    if (totalAplicado > Number(monto)) {
      setSubmitError("El total aplicado no puede superar el monto.");
      return;
    }
    const payload = {
      contacto: Number(contactoId),
      tipo,
      monto,
      detalles: detallesPayload,
      aplicaciones: aplicacionesPayload.map((item) =>
        tipo === "venta"
          ? { venta: item.documento, monto_aplicado: item.monto_aplicado }
          : { compra: item.documento, monto_aplicado: item.monto_aplicado }
      ),
    };
    if (numeroDocumento.trim()) payload.numero_documento = numeroDocumento.trim();
    if (fechaNota) payload.fecha_nota = fechaNota;
    if (motivo.trim()) payload.motivo = motivo.trim();
    try {
      setIsSubmitting(true);
      const response = await createNotaCredito(payload);
      setSubmitOk(`Nota de credito #${response?.id || ""} creada.`);
      setDetalles([]);
      setAplicaciones([]);
      setMonto("");
      setNumeroDocumento("");
      setFechaNota("");
      setMotivo("");
    } catch (error) {
      setSubmitError(error?.message || "No se pudo crear la nota de credito.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nueva nota de credito</h2>
      <p className="mt-1 text-sm text-gray-600">
        Crea una nota aplicable a ventas o compras segun corresponda.
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
              <select
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                value={tipo}
                onChange={(event) => handleTipoChange(event.target.value)}
              >
                <option value="venta">Venta</option>
                <option value="compra">Compra</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Contacto</label>
            <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
              <select
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                value={contactoId}
                onChange={(event) => setContactoId(event.target.value)}
              >
                <option value="">Seleccionar contacto</option>
                {contactos.map((contacto) => (
                  <option key={contacto.id} value={contacto.id}>
                    {contacto.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Numero documento</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
              value={numeroDocumento}
              onChange={(event) => setNumeroDocumento(event.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Fecha nota</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
              value={fechaNota}
              onChange={(event) => setFechaNota(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Monto</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={monto}
            onChange={(event) => setMonto(event.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Motivo</label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Detalles</span>
            <Button
              type="button"
              className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={handleAddDetalle}
              disabled={!contactoId}
            >
              Agregar detalle
            </Button>
          </div>
          {detalles.length === 0 ? (
            <p className="text-sm text-gray-600">Agrega productos a la nota.</p>
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
          <div className="text-sm text-gray-700">
            Subtotal estimado: {formatArs(totalDetalles)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Aplicaciones</span>
            <Button
              type="button"
              className="rounded-lg px-3 py-1 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={handleAddAplicacion}
              disabled={!contactoId}
            >
              Agregar aplicacion
            </Button>
          </div>
          {aplicaciones.length === 0 ? (
            <p className="text-sm text-gray-600">
              Agrega al menos una {tipo === "venta" ? "venta" : "compra"}.
            </p>
          ) : null}
          {aplicaciones.map((aplicacion, index) => (
            <div key={`aplicacion-${index}`} className="rounded-lg border border-gray-300 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {tipo === "venta" ? "Venta" : "Compra"} {index + 1}
                </span>
                <Button
                  type="button"
                  className="text-sm text-red-600 hover:text-red-700"
                  onClick={() => handleRemoveAplicacion(index)}
                >
                  Quitar
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    {tipo === "venta" ? "Venta" : "Compra"}
                  </label>
                  <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                    <select
                      className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                      value={aplicacion.documento}
                      onChange={(event) =>
                        handleAplicacionChange(index, "documento", event.target.value)
                      }
                    >
                      <option value="">
                        Seleccionar {tipo === "venta" ? "venta" : "compra"}
                      </option>
                      {documentosDisponiblesContacto.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {tipo === "venta" ? "Venta" : "Compra"} #{doc.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  {aplicacion.documento ? (
                    <p className="mt-1 text-xs text-gray-600">
                      Saldo pendiente: {formatArs(documentosById[String(aplicacion.documento)]?.saldo_pendiente)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Monto aplicado</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
                    value={aplicacion.montoAplicado}
                    onChange={(event) =>
                      handleAplicacionChange(index, "montoAplicado", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
            onClick={handleAplicarSaldoTotal}
            disabled={aplicaciones.length === 0}
          >
            Aplicar saldo total
          </Button>
          <div className="text-sm text-gray-700">
            Total aplicado: {formatArs(totalAplicado)}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Crear nota de credito"}
        </Button>
      </form>
    </div>
  );
}
