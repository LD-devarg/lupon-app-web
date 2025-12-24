import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { getContactos } from "../services/api/contactos";
import { getCompras } from "../services/api/compras";
import { createPago } from "../services/api/pagos";

export default function Pagos() {
  const [searchParams] = useSearchParams();
  const compraParam = searchParams.get("compra");

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState("");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [monto, setMonto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [detalles, setDetalles] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [comprasData, proveedoresData] = await Promise.all([
          getCompras(),
          getContactos({ tipo: "proveedor" }),
        ]);
        setCompras(comprasData || []);
        setProveedores(proveedoresData || []);
      } catch (error) {
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };
    loadData();
  }, []);

  const proveedoresById = useMemo(() => {
    return proveedores.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [proveedores]);

  const comprasDisponibles = useMemo(() => {
    return compras.filter((compra) => {
      const saldo = Number(compra.saldo_pendiente || 0);
      return saldo > 0 && compra.estado_compra !== "cancelada";
    });
  }, [compras]);

  const comprasById = useMemo(() => {
    return compras.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [compras]);

  const comprasDisponiblesProveedor = useMemo(() => {
    if (!proveedorId) return comprasDisponibles;
    return comprasDisponibles.filter(
      (compra) => String(compra.proveedor) === String(proveedorId)
    );
  }, [comprasDisponibles, proveedorId]);

  const hydrateFromCompra = (compra) => {
    setProveedorId(String(compra.proveedor));
    const saldo = String(compra.saldo_pendiente || "");
    setDetalles([
      {
        compra: String(compra.id),
        montoAplicado: saldo,
      },
    ]);
    setMonto(saldo);
  };

  useEffect(() => {
    if (!compraParam) return;
    const compraData = compras.find((compra) => String(compra.id) === String(compraParam));
    if (compraData) {
      hydrateFromCompra(compraData);
    }
  }, [compraParam, compras]);

  const handleProveedorChange = (nextProveedorId) => {
    setProveedorId(nextProveedorId);
    setDetalles([]);
    setSubmitError("");
    setSubmitOk("");
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      { compra: "", montoAplicado: "" },
    ]);
  };

  const handleRemoveDetalle = (index) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetalleChange = (index, field, value) => {
    setDetalles((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const totalAplicado = useMemo(() => {
    return detalles.reduce((sum, item) => {
      const value = Number(item.montoAplicado || 0);
      return sum + value;
    }, 0);
  }, [detalles]);

  const handleAplicarSaldoTotal = () => {
    const nextDetalles = detalles.map((item) => {
      if (!item.compra) return item;
      const saldo = comprasById[String(item.compra)]?.saldo_pendiente;
      return {
        ...item,
        montoAplicado: saldo !== undefined && saldo !== null ? String(saldo) : "",
      };
    });
    setDetalles(nextDetalles);
    const total = nextDetalles.reduce((sum, item) => {
      const value = Number(item.montoAplicado || 0);
      return sum + value;
    }, 0);
    setMonto(String(total));
  };

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
    if (!proveedorId) {
      setSubmitError("Selecciona un proveedor.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setSubmitError("Ingresa un monto total valido.");
      return;
    }
    if (detalles.length === 0) {
      setSubmitError("Agrega al menos una compra.");
      return;
    }
    const detallesPayload = detalles.map((item) => ({
      compra: Number(item.compra),
      monto_aplicado: item.montoAplicado,
    }));
    const hayVacios = detallesPayload.some(
      (detalle) =>
        !detalle.compra || !detalle.monto_aplicado || Number(detalle.monto_aplicado) <= 0
    );
    if (hayVacios) {
      setSubmitError("Completa compra y monto aplicado.");
      return;
    }
    if (totalAplicado > Number(monto)) {
      setSubmitError("La suma aplicada no puede superar el monto total.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        proveedor: Number(proveedorId),
        medio_pago: medioPago,
        monto,
        observaciones: observaciones.trim() || undefined,
        detalles: detallesPayload,
      };
      const response = await createPago(payload);
      setSubmitOk(`Pago #${response?.id || ""} creado.`);
      setMonto("");
      setObservaciones("");
      setDetalles([]);
    } catch (error) {
      setSubmitError(error?.message || "No se pudo crear el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nuevo pago</h2>
      <p className="mt-1 text-sm text-gray-600">
        Selecciona compras para aplicar el pago.
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
          <label className="text-sm font-medium text-gray-700">Proveedor</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={proveedorId}
              onChange={(event) => handleProveedorChange(event.target.value)}
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

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Compras aplicadas</label>
          <div className="mt-2 space-y-3">
            {detalles.length === 0 ? (
              <p className="text-sm text-gray-600">Agrega compras para aplicar el pago.</p>
            ) : null}
            {detalles.map((detalle, index) => (
              <div key={`detalle-${index}`} className="rounded-lg border border-gray-300 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Compra {index + 1}
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
                    <label className="text-sm font-medium text-gray-700">Compra</label>
                    <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                      <select
                        className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                        value={detalle.compra}
                        onChange={(event) =>
                          handleDetalleChange(index, "compra", event.target.value)
                        }
                      >
                        <option value="">Seleccionar compra</option>
                        {comprasDisponiblesProveedor.map((compra) => (
                          <option key={compra.id} value={compra.id}>
                            Compra #{compra.id} - {compra.fecha_compra}
                          </option>
                        ))}
                      </select>
                    </div>
                    {detalle.compra ? (
                      <p className="mt-1 text-xs text-gray-600">
                        Saldo pendiente: {formatArs(comprasById[String(detalle.compra)]?.saldo_pendiente)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Monto aplicado</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
                      value={detalle.montoAplicado}
                      onChange={(event) =>
                        handleDetalleChange(index, "montoAplicado", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={handleAddDetalle}
              disabled={!proveedorId}
            >
              Agregar compra
            </Button>
            <Button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={handleAplicarSaldoTotal}
              disabled={detalles.length === 0}
            >
              Aplicar saldo total
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Medio de pago</label>
            <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
              <select
                className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                value={medioPago}
                onChange={(event) => setMedioPago(event.target.value)}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Monto total</label>
            <input
              type="number"
              className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Total aplicado</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={formatArs(totalAplicado)}
            readOnly
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Observaciones</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={observaciones}
            onChange={(event) => setObservaciones(event.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Crear pago"}
        </Button>
      </form>
    </div>
  );
}
