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
      "w-full rounded-lg px-3 py-2 text-sm font-medium",
      "neuro-shadow-button",
      isActive ? "bg-neutral-200 text-gray-800" : "bg-neutral-300 text-gray-700",
    ].join(" ");

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Caja</h2>
      <p className="mt-1 text-sm text-gray-600">
        Selecciona el movimiento y la vista para operar.
      </p>

      <div className="mt-4 space-y-3 rounded-xl pedidos-shadow p-4 text-left">
        <div>
          <p className="text-sm font-medium text-gray-700">Movimiento</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              className={getToggleClass(tipo === "cobro")}
              onClick={() => handleSetTipo("cobro")}
            >
              Cobros
            </Button>
            <Button
              type="button"
              className={getToggleClass(tipo === "pago")}
              onClick={() => handleSetTipo("pago")}
            >
              Pagos
            </Button>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Vista</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              className={getToggleClass(vista === "nuevo")}
              onClick={() => handleSetVista("nuevo")}
            >
              Nuevo
            </Button>
            <Button
              type="button"
              className={getToggleClass(vista === "listado")}
              onClick={() => handleSetVista("listado")}
            >
              Listado
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {tipo === "cobro" && vista === "nuevo" ? <Cobros /> : null}
        {tipo === "cobro" && vista === "listado" ? <CobrosListado /> : null}
        {tipo === "pago" && vista === "nuevo" ? <Pagos /> : null}
        {tipo === "pago" && vista === "listado" ? <PagosListado /> : null}
      </div>
    </div>
  );
}
