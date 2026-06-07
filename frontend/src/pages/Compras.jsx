import { useState } from "react";
import { FunnelIcon, PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import ButtonDef from "../components/ui/Button";
import ModalNuevaCompra from "../components/layout/ModalNuevaCompra";

const estadoBadge = {
  Pendiente: "bg-yellow-900/40 text-yellow-300 border border-yellow-800/60",
  Completada: "bg-green-900/40 text-green-300 border border-green-800/60",
  Cancelada: "bg-red-900/30 text-red-300 border border-red-800/60",
};

const comprasData = [
  {
    numero: "12345",
    proveedor: "Proveedor XYZ",
    fecha: "2024-06-01",
    total: "$1,000.00",
    estado: "Pendiente",
  },
  {
    numero: "12346",
    proveedor: "Proveedor ABC",
    fecha: "2024-06-02",
    total: "$500.00",
    estado: "Completada",
  },
  {
    numero: "12347",
    proveedor: "Distribuidora Sur",
    fecha: "2024-06-03",
    total: "$2,340.00",
    estado: "Cancelada",
  },
];

export default function Compras() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Acciones */}
      <div className="flex items-center justify-end gap-2">
        <ButtonDef
          leftIcon={FunnelIcon}
          text="Filtros"
          variant="ghost"
          size="sm"
        />
        <ButtonDef
          leftIcon={PlusIcon}
          text="Nueva Compra"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-stone-800 overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-stone-900/60 border-b border-stone-800">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                N° Compra
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Proveedor
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Fecha
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Total
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Estado
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {comprasData.map((compra) => (
              <tr
                key={compra.numero}
                className="bg-[#111111] hover:bg-[#1a1a1a] transition-colors duration-200 group"
              >
                <td className="px-4 py-3 text-stone-300 font-mono text-xs">
                  #{compra.numero}
                </td>
                <td className="px-4 py-3 text-white font-medium">
                  {compra.proveedor}
                </td>
                <td className="px-4 py-3 text-stone-400">{compra.fecha}</td>
                <td className="px-4 py-3 text-white font-semibold">
                  {compra.total}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      estadoBadge[compra.estado] ?? "bg-stone-800 text-stone-300 border border-stone-700"
                    }`}
                  >
                    {compra.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ButtonDef
                    leftIcon={EyeIcon}
                    text="Ver"
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {comprasData.length === 0 && (
          <div className="py-16 text-center text-stone-500 text-sm bg-[#111111]">
            No hay compras registradas.
          </div>
        )}
      </div>

      <ModalNuevaCompra isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
