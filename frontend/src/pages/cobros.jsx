import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getVentas } from "../services/api/ventas";
import { createCobro } from "../services/api/cobros";

export default function Cobros() {
  const [searchParams] = useSearchParams();
  const ventaParam = searchParams.get("venta");

  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
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
        const [ventasData, clientesData] = await Promise.all([
          getVentas(),
          getClientes(),
        ]);
        setVentas(ventasData || []);
        setClientes(clientesData || []);
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

  const formatDate = (value) => {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };

  const ventasDisponibles = useMemo(() => {
    return ventas.filter((venta) => {
      const saldo = Number(venta.saldo_pendiente || 0);
      return saldo > 0 && venta.estado_entrega !== "cancelada";
    });
  }, [ventas]);

  const ventasById = useMemo(() => {
    return ventas.reduce((acc, current) => {
      acc[String(current.id)] = current;
      return acc;
    }, {});
  }, [ventas]);

  const ventasDisponiblesCliente = useMemo(() => {
    if (!clienteId) return ventasDisponibles;
    return ventasDisponibles.filter(
      (venta) => String(venta.cliente) === String(clienteId)
    );
  }, [ventasDisponibles, clienteId]);

  const hydrateFromVenta = (venta) => {
    setClienteId(String(venta.cliente));
    const saldo = String(venta.saldo_pendiente || "");
    setDetalles([
      {
        venta: String(venta.id),
        montoAplicado: saldo,
      },
    ]);
    setMonto(saldo);
  };

  useEffect(() => {
    if (!ventaParam) return;
    const ventaData = ventas.find((venta) => String(venta.id) === String(ventaParam));
    if (ventaData) {
      hydrateFromVenta(ventaData);
    }
  }, [ventaParam, ventas]);

  const handleClienteChange = (nextClienteId) => {
    setClienteId(nextClienteId);
    setDetalles([]);
    setSubmitError("");
    setSubmitOk("");
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      { venta: "", montoAplicado: "" },
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

  const handleAplicarSaldoTotal = () => {
    const nextDetalles = detalles.map((item) => {
      if (!item.venta) return item;
      const saldo = ventasById[String(item.venta)]?.saldo_pendiente;
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

  const totalAplicado = useMemo(() => {
    return detalles.reduce((sum, item) => {
      const value = Number(item.montoAplicado || 0);
      return sum + value;
    }, 0);
  }, [detalles]);

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
    if (!clienteId) {
      setSubmitError("Selecciona un cliente.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      setSubmitError("Ingresa un monto total valido.");
      return;
    }
    if (detalles.length === 0) {
      setSubmitError("Agrega al menos una venta.");
      return;
    }
    const detallesPayload = detalles.map((item) => ({
      venta: Number(item.venta),
      monto_aplicado: item.montoAplicado,
    }));
    const hayVacios = detallesPayload.some(
      (detalle) =>
        !detalle.venta || !detalle.monto_aplicado || Number(detalle.monto_aplicado) <= 0
    );
    if (hayVacios) {
      setSubmitError("Completa venta y monto aplicado.");
      return;
    }
    if (totalAplicado > Number(monto)) {
      setSubmitError("La suma aplicada no puede superar el monto total.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        cliente: Number(clienteId),
        medio_pago: medioPago,
        monto,
        observaciones: observaciones.trim() || undefined,
        detalles: detallesPayload,
      };
      const response = await createCobro(payload);
      setSubmitOk(`Cobro #${response?.id || ""} creado.`);
      setMonto("");
      setObservaciones("");
      setDetalles([]);
    } catch (error) {
      setSubmitError(error?.message || "No se pudo crear el cobro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Nuevo cobro</h2>
      <p className="mt-1 text-sm text-gray-600">
        Selecciona una venta o crea un cobro manual.
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
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={clienteId}
              onChange={(event) => handleClienteChange(event.target.value)}
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((clienteItem) => (
                <option key={clienteItem.id} value={clienteItem.id}>
                  {clienteItem.nombre}
                  {clienteItem.nombre_fantasia ? ` - ${clienteItem.nombre_fantasia}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Ventas aplicadas</label>
          <div className="mt-2 space-y-3">
            {detalles.length === 0 ? (
              <p className="text-sm text-gray-600">Agrega ventas para aplicar el cobro.</p>
            ) : null}
            {detalles.map((detalle, index) => (
              <div key={`detalle-${index}`} className="rounded-lg border border-gray-300 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Venta {index + 1}
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
                    <label className="text-sm font-medium text-gray-700">Venta</label>
                    <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
                      <select
                        className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                        value={detalle.venta}
                        onChange={(event) =>
                          handleDetalleChange(index, "venta", event.target.value)
                        }
                      >
                        <option value="">Seleccionar venta</option>
                        {ventasDisponiblesCliente.map((venta) => (
                          <option key={venta.id} value={venta.id}>
                            Venta #{venta.id} - {formatDate(venta.fecha_venta)} -{" "}
                            {clientesById[String(venta.cliente)]?.nombre || venta.cliente}
                          </option>
                        ))}
                      </select>
                    </div>
                    {detalle.venta ? (
                      <p className="mt-1 text-xs text-gray-600">
                        Saldo pendiente: {formatArs(ventasById[String(detalle.venta)]?.saldo_pendiente)}
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
              disabled={!clienteId}
            >
              Agregar venta
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
          {isSubmitting ? "Guardando..." : "Crear cobro"}
        </Button>
      </form>
    </div>
  );
}


