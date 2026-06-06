import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getClientes } from "../services/api/clientes";
import { getVentas } from "../services/api/ventas";
import { createCobro } from "../services/api/cobros";
import { getContactos } from "../services/api/contactos";
import { getCompras } from "../services/api/compras";
import { createPago } from "../services/api/pagos";

const MEDIOS_PAGO_OPTIONS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

function buildInitialMedio(monto = "") {
  return { medioPago: "efectivo", monto };
}

export default function MovimientoForm({ tipo = "cobro" }) {
  const isCobro = tipo === "cobro";
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get(isCobro ? "venta" : "compra");

  const [comprobantes, setComprobantes] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [entidadId, setEntidadId] = useState("");
  const [mediosPago, setMediosPago] = useState([buildInitialMedio()]);
  const [observaciones, setObservaciones] = useState("");
  const [detalles, setDetalles] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitOk, setSubmitOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear states when component switches type (e.g. cobro -> pago)
  useEffect(() => {
    setEntidadId("");
    setMediosPago([buildInitialMedio()]);
    setObservaciones("");
    setDetalles([]);
    setLoadError("");
    setSubmitError("");
    setSubmitOk("");
  }, [tipo]);

  // Load data depending on type
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError("");
        if (isCobro) {
          const [ventasData, clientesData] = await Promise.all([getVentas(), getClientes({ useCache: false })]);
          setComprobantes(ventasData || []);
          setEntidades(clientesData || []);
        } else {
          const [comprasData, proveedoresData] = await Promise.all([
            getCompras(),
            getContactos({ tipo: "proveedor" }),
          ]);
          setComprobantes(comprasData || []);
          setEntidades(proveedoresData || []);
        }
      } catch (error) {
        setLoadError(error?.message || "No se pudieron cargar los datos.");
      }
    };
    loadData();
  }, [tipo, isCobro]);

  const comprobantesById = useMemo(
    () =>
      comprobantes.reduce((acc, current) => {
        acc[String(current.id)] = current;
        return acc;
      }, {}),
    [comprobantes]
  );

  const entidadOptions = useMemo(
    () =>
      entidades
        .filter((ent) => {
          const expectedTipo = isCobro ? "cliente" : "proveedor";
          return ent.tipo === expectedTipo;
        })
        .map((ent) => ({
          value: String(ent.id),
          label: isCobro && ent.nombre_fantasia
            ? `${ent.nombre} - ${ent.nombre_fantasia}`
            : ent.nombre,
        })),
    [entidades, isCobro]
  );

  const formatFecha = (value) => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(number);
  };

  const comprobantesDisponibles = useMemo(
    () =>
      comprobantes.filter((comp) => {
        const saldo = Number(comp.saldo_pendiente || 0);
        const estado = isCobro ? comp.estado_entrega : comp.estado_compra;
        return saldo > 0 && estado !== "cancelada";
      }),
    [comprobantes, isCobro]
  );

  const comprobantesDisponiblesEntidad = useMemo(() => {
    if (!entidadId) return comprobantesDisponibles;
    return comprobantesDisponibles.filter((comp) => {
      const parentId = isCobro ? comp.cliente : comp.proveedor;
      return String(parentId) === String(entidadId);
    });
  }, [comprobantesDisponibles, entidadId, isCobro]);

  const comprobanteOptions = useMemo(
    () =>
      comprobantesDisponiblesEntidad.map((comp) => {
        const prefix = isCobro ? "Venta" : "Compra";
        const fecha = isCobro ? formatFecha(comp.fecha_venta) : comp.fecha_compra;
        return {
          value: String(comp.id),
          label: `${prefix} #${comp.id} - ${fecha} - ${formatArs(comp.saldo_pendiente)}`,
        };
      }),
    [comprobantesDisponiblesEntidad, isCobro]
  );

  useEffect(() => {
    const hydrateFromComprobante = (comp) => {
      const saldo = String(comp.saldo_pendiente || "");
      const parentId = isCobro ? comp.cliente : comp.proveedor;
      setEntidadId(String(parentId));
      setDetalles([{ comprobanteId: String(comp.id), montoAplicado: saldo }]);
      setMediosPago([buildInitialMedio(saldo)]);
    };

    if (!paramId) return;
    const compData = comprobantes.find((comp) => String(comp.id) === String(paramId));
    if (compData) hydrateFromComprobante(compData);
  }, [paramId, comprobantes, isCobro]);

  const totalMedios = useMemo(
    () => mediosPago.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    [mediosPago]
  );

  const totalAplicado = useMemo(
    () => detalles.reduce((sum, item) => sum + Number(item.montoAplicado || 0), 0),
    [detalles]
  );

  const saldoSinImputar = totalMedios - totalAplicado;

  const resetMessages = () => {
    setSubmitError("");
    setSubmitOk("");
  };

  const handleEntidadChange = (nextEntidadId) => {
    setEntidadId(nextEntidadId);
    setDetalles([]);
    resetMessages();
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [...prev, { comprobanteId: "", montoAplicado: "" }]);
  };

  const handleRemoveDetalle = (index) => {
    setDetalles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleDetalleChange = (index, field, value) => {
    setDetalles((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
    resetMessages();
  };

  const handleAplicarSaldoTotal = () => {
    const nextDetalles = detalles.map((item) => {
      if (!item.comprobanteId) return item;
      const saldo = comprobantesById[String(item.comprobanteId)]?.saldo_pendiente;
      return {
        ...item,
        montoAplicado: saldo !== undefined && saldo !== null ? String(saldo) : "",
      };
    });
    setDetalles(nextDetalles);
  };

  const handleAddMedioPago = () => {
    setMediosPago((prev) => [...prev, buildInitialMedio()]);
  };

  const handleRemoveMedioPago = (index) => {
    setMediosPago((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleMedioPagoChange = (index, field, value) => {
    setMediosPago((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
    resetMessages();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!entidadId) {
      setSubmitError(isCobro ? "Selecciona un cliente." : "Selecciona un proveedor.");
      return;
    }

    const mediosPayload = mediosPago
      .map((item) => ({ medio_pago: item.medioPago, monto: item.monto }))
      .filter((item) => item.monto !== "" || item.medio_pago);

    if (mediosPayload.length === 0) {
      setSubmitError("Agrega al menos una forma de pago.");
      return;
    }

    const mediosInvalidos = mediosPayload.some(
      (item) => !item.medio_pago || !item.monto || Number(item.monto) <= 0
    );
    if (mediosInvalidos) {
      setSubmitError("Completa correctamente cada forma de pago.");
      return;
    }

    const detallesPayload = detalles
      .filter((item) => item.comprobanteId || item.montoAplicado)
      .map((item) => {
        if (isCobro) {
          return { venta: Number(item.comprobanteId), monto_aplicado: item.montoAplicado };
        } else {
          return { compra: Number(item.comprobanteId), monto_aplicado: item.montoAplicado };
        }
      });

    const detallesInvalidos = detallesPayload.some((item) => {
      const parentId = isCobro ? item.venta : item.compra;
      return !parentId || !item.monto_aplicado || Number(item.monto_aplicado) <= 0;
    });
    if (detallesInvalidos) {
      const errText = isCobro
        ? "Completa venta y monto aplicado en cada imputacion."
        : "Completa compra y monto aplicado en cada imputacion.";
      setSubmitError(errText);
      return;
    }

    if (totalAplicado > totalMedios) {
      const errText = isCobro
        ? "La suma aplicada no puede superar el total del cobro."
        : "La suma aplicada no puede superar el total del pago.";
      setSubmitError(errText);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isCobro) {
        const payload = {
          cliente: Number(entidadId),
          monto: String(totalMedios),
          medios_pago: mediosPayload,
          observaciones: observaciones.trim() || undefined,
          detalles: detallesPayload,
        };
        const response = await createCobro(payload);
        setSubmitOk(`Cobro #${response?.id || ""} creado.`);
      } else {
        const payload = {
          proveedor: Number(entidadId),
          monto: String(totalMedios),
          medios_pago: mediosPayload,
          observaciones: observaciones.trim() || undefined,
          detalles: detallesPayload,
        };
        const response = await createPago(payload);
        setSubmitOk(`Pago #${response?.id || ""} creado.`);
      }
      setEntidadId("");
      setObservaciones("");
      setDetalles([]);
      setMediosPago([buildInitialMedio()]);
    } catch (error) {
      setSubmitError(error?.message || (isCobro ? "No se pudo crear el cobro." : "No se pudo crear el pago."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitleClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500";
  const secondaryButtonClass =
    "rounded-xl border border-stone-800 bg-stone-800/80 px-3 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50";
  const cardClass =
    "rounded-[1.2rem] border border-stone-800/80 bg-stone-900/40 p-3.5 shadow-xl text-white";

  return (
    <div className="mx-auto w-full px-0 pb-2 pt-1 text-left">
      <div className="overflow-hidden rounded-[1.5rem] border border-stone-800/80 bg-stone-900/20 p-3 shadow-lg md:p-3.5">
        <form className="grid gap-3 xl:min-h-[calc(100vh-185px)] xl:grid-rows-[auto_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
          {loadError ? <p className="text-sm text-rose-400">{loadError}</p> : null}
          {submitError ? <p className="text-sm text-rose-400">{submitError}</p> : null}
          {submitOk ? <p className="text-sm text-emerald-400">{submitOk}</p> : null}

          <section className={`${cardClass} grid gap-3 xl:grid-cols-[1fr_340px] xl:items-center`}>
            <div className="grid gap-2 md:grid-cols-[auto_auto_1fr] md:items-center">
              <div>
                <p className="text-xl font-semibold tracking-tight text-white">
                  {isCobro ? "Nuevo cobro" : "Nuevo pago"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 px-3 py-1 md:min-w-[290px]">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Total</p>
                  <p className="text-base font-semibold text-stone-200">{formatArs(totalMedios)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Imputado</p>
                  <p className="text-base font-semibold text-stone-200">{formatArs(totalAplicado)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Disponible</p>
                  <p className={`text-base font-semibold ${saldoSinImputar < 0 ? "text-rose-500 font-bold" : "text-[#CAED4E] font-bold"}`}>
                    {formatArs(saldoSinImputar)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <SearchableSelect
                options={entidadOptions}
                value={entidadId}
                onChange={handleEntidadChange}
                placeholder={isCobro ? "Buscar cliente" : "Buscar proveedor"}
                noOptionsText={isCobro ? "Sin clientes" : "Sin proveedores"}
              />
            </div>
          </section>

          <div className="grid min-h-0 gap-3 xl:grid-cols-[1.35fr_1fr]">
            <section className={`${cardClass} min-h-0`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={sectionTitleClass}>
                    {isCobro ? "Ventas Aplicadas" : "Compras Aplicadas"}
                  </p>
                  <h3 className="mt-0.5 text-xl font-semibold text-white">Imputacion opcional</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" className={secondaryButtonClass} onClick={handleAddDetalle} disabled={!entidadId}>
                    {isCobro ? "Agregar venta" : "Agregar compra"}
                  </Button>
                  <Button type="button" className={secondaryButtonClass} onClick={handleAplicarSaldoTotal} disabled={detalles.length === 0}>
                    Completar saldos
                  </Button>
                </div>
              </div>

              <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1 xl:max-h-[300px]">
                {detalles.length === 0 ? (
                  <div className="rounded-[1rem] border border-dashed border-stone-800 bg-stone-950/20 px-4 py-6 text-center text-sm text-stone-500">
                    {isCobro ? "Sin ventas aplicadas por ahora." : "Sin compras aplicadas por ahora."}
                  </div>
                ) : null}
                {detalles.map((detalle, index) => (
                  <div key={`detalle-${index}`} className="rounded-[1rem] border border-stone-800/70 bg-stone-950/50 p-2.5 shadow-md">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-300">
                        {isCobro ? "Venta" : "Compra"} {index + 1}
                      </p>
                      <Button type="button" className="text-sm font-medium text-rose-400 hover:text-rose-300" onClick={() => handleRemoveDetalle(index)}>
                        Quitar
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1.6fr_0.72fr_0.72fr]">
                      <div>
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                          {isCobro ? "Venta" : "Compra"}
                        </label>
                        <div className="mt-1">
                          <SearchableSelect
                            options={comprobanteOptions}
                            value={detalle.comprobanteId}
                            onChange={(value) => handleDetalleChange(index, "comprobanteId", value)}
                            placeholder={isCobro ? "Buscar venta" : "Buscar compra"}
                            disabled={!entidadId}
                            noOptionsText={isCobro ? "Sin ventas pendientes" : "Sin compras pendientes"}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Saldo</label>
                        <div className="mt-1 rounded-xl border border-stone-800 bg-stone-950/40 px-3 py-2.5 text-sm font-medium text-stone-300">
                          {detalle.comprobanteId ? formatArs(comprobantesById[String(detalle.comprobanteId)]?.saldo_pendiente) : "-"}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Monto</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="mt-1 w-full rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-2.5 text-sm text-white placeholder-stone-700 outline-none transition focus:border-stone-700"
                          value={detalle.montoAplicado}
                          onChange={(event) => handleDetalleChange(index, "montoAplicado", event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${cardClass} min-h-0`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={sectionTitleClass}>Medios De Pago</p>
                  <h3 className="mt-0.5 text-xl font-semibold text-white">Desglose</h3>
                </div>
                <Button type="button" className={secondaryButtonClass} onClick={handleAddMedioPago}>
                  Agregar
                </Button>
              </div>
              <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1 xl:max-h-[300px]">
                {mediosPago.map((medio, index) => (
                  <div key={`medio-${index}`} className="grid gap-2 rounded-[1rem] border border-stone-800/70 bg-stone-950/50 p-2.5 shadow-md md:grid-cols-[1fr_0.72fr_auto] md:items-end">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Forma de pago</label>
                      <div className="mt-1">
                        <SearchableSelect
                          options={MEDIOS_PAGO_OPTIONS}
                          value={medio.medioPago}
                          onChange={(value) => handleMedioPagoChange(index, "medioPago", value)}
                          placeholder="Seleccionar medio"
                          noOptionsText="Sin opciones"
                          size="sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Monto</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-1 w-full rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-2.5 text-sm text-white placeholder-stone-700 outline-none transition focus:border-stone-700"
                        value={medio.monto}
                        onChange={(event) => handleMedioPagoChange(index, "monto", event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      className="rounded-xl border border-rose-955/40 bg-rose-955/20 px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-900/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => handleRemoveMedioPago(index)}
                      disabled={mediosPago.length === 1}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className={`${cardClass} grid gap-3 xl:grid-cols-[1.35fr_0.72fr]`}>
            <div>
              <p className={sectionTitleClass}>Observaciones</p>
              <h3 className="mt-0.5 text-xl font-semibold text-white">Contexto del movimiento</h3>
              <textarea
                rows={3}
                className="mt-2 w-full rounded-[1rem] border border-stone-800 bg-stone-950/60 px-4 py-3 text-sm text-white placeholder-stone-700 outline-none transition focus:border-stone-700"
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder={isCobro ? "Notas internas, referencia bancaria, observaciones del cobro..." : "Notas internas, referencia bancaria, observaciones del pago..."}
              />
            </div>
            <div className="rounded-[1rem] border border-stone-800 bg-stone-950/40 p-3">
              <p className={sectionTitleClass}>Resumen</p>
              <div className="mt-2 space-y-2 text-sm text-stone-400">
                <div className="flex items-center justify-between">
                  <span>{isCobro ? "Total del cobro" : "Total del pago"}</span>
                  <span className="font-semibold text-stone-200">{formatArs(totalMedios)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total imputado</span>
                  <span className="font-semibold text-stone-200">{formatArs(totalAplicado)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-800 pt-3">
                  <span>Saldo disponible</span>
                  <span className={`font-semibold ${saldoSinImputar < 0 ? "text-rose-500" : "text-[#CAED4E]"}`}>
                    {formatArs(saldoSinImputar)}
                  </span>
                </div>
              </div>
              <Button
                type="submit"
                className="mt-3 w-full rounded-[1rem] bg-[#CAED4E] px-4 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 transition duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : (isCobro ? "Crear cobro" : "Crear pago")}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
