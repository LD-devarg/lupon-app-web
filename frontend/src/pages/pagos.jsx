import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
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

export default function Pagos() {
  const [searchParams] = useSearchParams();
  const compraParam = searchParams.get("compra");

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState("");
  const [mediosPago, setMediosPago] = useState([buildInitialMedio()]);
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

  const proveedoresById = useMemo(
    () =>
      proveedores.reduce((acc, current) => {
        acc[String(current.id)] = current;
        return acc;
      }, {}),
    [proveedores]
  );

  const comprasById = useMemo(
    () =>
      compras.reduce((acc, current) => {
        acc[String(current.id)] = current;
        return acc;
      }, {}),
    [compras]
  );

  const proveedorOptions = useMemo(
    () =>
      proveedores.map((proveedor) => ({
        value: String(proveedor.id),
        label: proveedor.nombre,
      })),
    [proveedores]
  );

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

  const comprasDisponibles = useMemo(
    () =>
      compras.filter((compra) => {
        const saldo = Number(compra.saldo_pendiente || 0);
        return saldo > 0 && compra.estado_compra !== "cancelada";
      }),
    [compras]
  );

  const comprasDisponiblesProveedor = useMemo(() => {
    if (!proveedorId) return comprasDisponibles;
    return comprasDisponibles.filter(
      (compra) => String(compra.proveedor) === String(proveedorId)
    );
  }, [comprasDisponibles, proveedorId]);

  const comprasOptions = useMemo(
    () =>
      comprasDisponiblesProveedor.map((compra) => ({
        value: String(compra.id),
        label: `Compra #${compra.id} - ${compra.fecha_compra} - ${formatArs(compra.saldo_pendiente)}`,
      })),
    [comprasDisponiblesProveedor]
  );

  const hydrateFromCompra = (compra) => {
    const saldo = String(compra.saldo_pendiente || "");
    setProveedorId(String(compra.proveedor));
    setDetalles([{ compra: String(compra.id), montoAplicado: saldo }]);
    setMediosPago([buildInitialMedio(saldo)]);
  };

  useEffect(() => {
    if (!compraParam) return;
    const compraData = compras.find((compra) => String(compra.id) === String(compraParam));
    if (compraData) hydrateFromCompra(compraData);
  }, [compraParam, compras]);

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

  const handleProveedorChange = (nextProveedorId) => {
    setProveedorId(nextProveedorId);
    setDetalles([]);
    resetMessages();
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [...prev, { compra: "", montoAplicado: "" }]);
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
      if (!item.compra) return item;
      const saldo = comprasById[String(item.compra)]?.saldo_pendiente;
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

    if (!proveedorId) {
      setSubmitError("Selecciona un proveedor.");
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
      .filter((item) => item.compra || item.montoAplicado)
      .map((item) => ({ compra: Number(item.compra), monto_aplicado: item.montoAplicado }));

    const detallesInvalidos = detallesPayload.some(
      (item) => !item.compra || !item.monto_aplicado || Number(item.monto_aplicado) <= 0
    );
    if (detallesInvalidos) {
      setSubmitError("Completa compra y monto aplicado en cada imputacion.");
      return;
    }

    if (totalAplicado > totalMedios) {
      setSubmitError("La suma aplicada no puede superar el total del pago.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        proveedor: Number(proveedorId),
        monto: String(totalMedios),
        medios_pago: mediosPayload,
        observaciones: observaciones.trim() || undefined,
        detalles: detallesPayload,
      };
      const response = await createPago(payload);
      setSubmitOk(`Pago #${response?.id || ""} creado.`);
      setProveedorId("");
      setObservaciones("");
      setDetalles([]);
      setMediosPago([buildInitialMedio()]);
    } catch (error) {
      setSubmitError(error?.message || "No se pudo crear el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitleClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const secondaryButtonClass =
    "rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.65)] transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50";
  const cardClass =
    "rounded-[1.2rem] border border-white/80 bg-white/78 p-3.5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]";

  return (
    <div className="mx-auto w-full max-w-6xl px-0 pb-2 pt-1 text-left">
      <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(241,245,249,0.94)_55%,_rgba(226,232,240,0.92))] p-3 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] md:p-3.5">
        <form className="grid gap-3 xl:min-h-[calc(100vh-185px)] xl:grid-rows-[auto_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
          {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          {submitOk ? <p className="text-sm text-emerald-700">{submitOk}</p> : null}

          <section className={`${cardClass} grid gap-3 xl:grid-cols-[1fr_340px] xl:items-center`}>
            <div className="grid gap-2 md:grid-cols-[auto_auto_1fr] md:items-center">
              <div>
                <p className="text-xl font-semibold tracking-tight text-slate-800">Nuevo pago</p>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-[1rem] border border-slate-100 bg-slate-50/90 px-3 py-2 md:min-w-[290px]">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Total</p>
                  <p className="text-base font-semibold text-slate-800">{formatArs(totalMedios)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Imputado</p>
                  <p className="text-base font-semibold text-slate-800">{formatArs(totalAplicado)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Disponible</p>
                  <p className={`text-base font-semibold ${saldoSinImputar < 0 ? "text-red-600" : "text-sky-700"}`}>
                    {formatArs(saldoSinImputar)}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <SearchableSelect
                options={proveedorOptions}
                value={proveedorId}
                onChange={handleProveedorChange}
                placeholder="Buscar proveedor"
                noOptionsText="Sin proveedores"
              />
            </div>
          </section>

          <div className="grid min-h-0 gap-3 xl:grid-cols-[1.35fr_1fr]">
            <section className={`${cardClass} min-h-0`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={sectionTitleClass}>Compras Aplicadas</p>
                  <h3 className="mt-0.5 text-xl font-semibold text-slate-800">Imputacion opcional</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" className={secondaryButtonClass} onClick={handleAddDetalle} disabled={!proveedorId}>
                    Agregar compra
                  </Button>
                  <Button type="button" className={secondaryButtonClass} onClick={handleAplicarSaldoTotal} disabled={detalles.length === 0}>
                    Completar saldos
                  </Button>
                </div>
              </div>

              <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1 xl:max-h-[300px]">
                {detalles.length === 0 ? (
                  <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                    Sin compras aplicadas por ahora.
                  </div>
                ) : null}
                {detalles.map((detalle, index) => (
                  <div key={`detalle-${index}`} className="rounded-[1rem] border border-slate-200 bg-white/85 p-2.5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.6)]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">Compra {index + 1}</p>
                      <Button type="button" className="text-sm font-medium text-rose-600" onClick={() => handleRemoveDetalle(index)}>
                        Quitar
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1.6fr_0.72fr_0.72fr]">
                      <div>
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Compra</label>
                        <div className="mt-1">
                          <SearchableSelect
                            options={comprasOptions}
                            value={detalle.compra}
                            onChange={(value) => handleDetalleChange(index, "compra", value)}
                            placeholder="Buscar compra"
                            disabled={!proveedorId}
                            noOptionsText="Sin compras pendientes"
                            size="sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Saldo</label>
                        <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-700">
                          {detalle.compra ? formatArs(comprasById[String(detalle.compra)]?.saldo_pendiente) : "-"}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Monto</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
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
                  <h3 className="mt-0.5 text-xl font-semibold text-slate-800">Desglose</h3>
                </div>
                <Button type="button" className={secondaryButtonClass} onClick={handleAddMedioPago}>
                  Agregar
                </Button>
              </div>
              <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1 xl:max-h-[300px]">
                {mediosPago.map((medio, index) => (
                  <div key={`medio-${index}`} className="grid gap-2 rounded-[1rem] border border-slate-200 bg-white/85 p-2.5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.6)] md:grid-cols-[1fr_0.72fr_auto] md:items-end">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Forma de pago</label>
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
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Monto</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                        value={medio.monto}
                        onChange={(event) => handleMedioPagoChange(index, "monto", event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      className="rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-medium text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
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
              <h3 className="mt-0.5 text-xl font-semibold text-slate-800">Contexto del movimiento</h3>
              <textarea
                rows={3}
                className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Notas internas, referencia bancaria, observaciones del pago..."
              />
            </div>
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 p-3">
              <p className={sectionTitleClass}>Resumen</p>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Total del pago</span>
                  <span className="font-semibold text-slate-800">{formatArs(totalMedios)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total imputado</span>
                  <span className="font-semibold text-slate-800">{formatArs(totalAplicado)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span>Saldo disponible</span>
                  <span className={`font-semibold ${saldoSinImputar < 0 ? "text-red-600" : "text-sky-700"}`}>
                    {formatArs(saldoSinImputar)}
                  </span>
                </div>
              </div>
              <Button
                type="submit"
                className="mt-3 w-full rounded-[1rem] bg-[linear-gradient(135deg,#2563eb,#3b82f6)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(37,99,235,0.9)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Crear pago"}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
