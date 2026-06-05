import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Cobros from "./cobros.jsx";
import CobrosListado from "./cobrosListado.jsx";
import Pagos from "./pagos.jsx";
import PagosListado from "./pagosListado.jsx";

const DEFAULT_TIPO = "cobro";
const DEFAULT_VISTA = "nuevo";

export default function Caja() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoParam = searchParams.get("tipo");
  const vistaParam = searchParams.get("vista");
  const tipo = tipoParam === "pago" ? "pago" : DEFAULT_TIPO;
  const vista = vistaParam === "listado" ? "listado" : DEFAULT_VISTA;

  useEffect(() => {
    if (!tipoParam || !vistaParam) {
      const params = new URLSearchParams(searchParams);
      if (!tipoParam) params.set("tipo", tipo);
      if (!vistaParam) params.set("vista", vista);
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, tipoParam, vistaParam, tipo, vista]);

  const handleSetTipo = (nextTipo) => {
    const params = new URLSearchParams(searchParams);
    params.set("tipo", nextTipo);
    if (nextTipo === "cobro") {
      params.delete("compra");
    } else {
      params.delete("venta");
    }
    setSearchParams(params);
  };

  const handleSetVista = (nextVista) => {
    const params = new URLSearchParams(searchParams);
    params.set("vista", nextVista);
    setSearchParams(params);
  };

  const getToggleClass = (isActive) =>
    [
      "relative overflow-hidden rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition",
      isActive
        ? "bg-[linear-gradient(135deg,#2563eb,#3b82f6)] text-white shadow-[0_20px_40px_-22px_rgba(37,99,235,0.95)]"
        : "bg-white/70 text-slate-700 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.7)] hover:text-slate-900",
    ].join(" ");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-2 text-center">
      <div className="rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(241,245,249,0.95)_52%,_rgba(226,232,240,0.92))] px-4 py-5 shadow-[0_35px_100px_-50px_rgba(15,23,42,0.5)] md:px-6 md:py-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-600">Caja</p>
        </div>

        <div className="mx-auto mt-2 max-w-4xl rounded-[1.5rem] border border-white/80 bg-white/65 p-2.5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.7)]">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-[1.2rem] bg-slate-100/90 p-1.5">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" className={getToggleClass(tipo === "cobro")} onClick={() => handleSetTipo("cobro")}>
                  Cobros
                </Button>
                <Button type="button" className={getToggleClass(tipo === "pago")} onClick={() => handleSetTipo("pago")}>
                  Pagos
                </Button>
              </div>
            </div>
            <div className="rounded-[1.2rem] bg-slate-100/90 p-1.5">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" className={getToggleClass(vista === "nuevo")} onClick={() => handleSetVista("nuevo")}>
                  Nuevo
                </Button>
                <Button type="button" className={getToggleClass(vista === "listado")} onClick={() => handleSetVista("listado")}>
                  Listado
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-left">
          {tipo === "cobro" && vista === "nuevo" ? <Cobros /> : null}
          {tipo === "cobro" && vista === "listado" ? <CobrosListado /> : null}
          {tipo === "pago" && vista === "nuevo" ? <Pagos /> : null}
          {tipo === "pago" && vista === "listado" ? <PagosListado /> : null}
        </div>
      </div>
    </div>
  );
}
