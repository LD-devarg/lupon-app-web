import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import MovimientoForm from "./MovimientoForm.jsx";
import CobrosListado from "./CobrosListado.jsx";
import PagosListado from "./PagosListado.jsx";
import { useHeaderTitle } from "../layouts/DesktopLayout.jsx";

const DEFAULT_TIPO = "cobro";
const DEFAULT_VISTA = "nuevo";

export default function Caja() {
  const { setTitle } = useHeaderTitle();
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoParam = searchParams.get("tipo");
  const vistaParam = searchParams.get("vista");
  const tipo = tipoParam === "pago" ? "pago" : DEFAULT_TIPO;
  const vista = vistaParam === "listado" ? "listado" : DEFAULT_VISTA;

  useEffect(() => {
    setTitle("Caja");
  }, [setTitle]);

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
      "relative overflow-hidden rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 w-full",
      isActive
        ? "bg-[#CAED4E] text-black shadow-md shadow-[#CAED4E]/10"
        : "text-stone-400 hover:text-white bg-transparent",
    ].join(" ");

  return (
    <div className="w-full px-2 text-left text-white">
      <div className="w-full flex flex-row gap-4">
        <div className="w-1/2 bg-stone-950/60 p-1.5">
          <select value={tipo} onChange={(event) => handleSetTipo(event.target.value)} className="w-full md:w-[10rem] border border-stone-700 rounded-xl px-4 py-2 bg-stone-950/60">
            <option value="cobro" >Cobros</option>
            <option value="pago" >Pagos</option>
          </select>
        </div>
        <div className="bg-stone-950/60 p-1.5 flex flex-1 justify-end items-end">
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

      <div className="mt-2 w-full text-left">
        {vista === "nuevo" ? <MovimientoForm tipo={tipo} /> : null}
        {tipo === "cobro" && vista === "listado" ? <CobrosListado /> : null}
        {tipo === "pago" && vista === "listado" ? <PagosListado /> : null}
      </div>
    </div>
  );
}
