import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, EyeIcon, XMarkIcon, CheckIcon, DocumentTextIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import ButtonDef from "../components/ui/Button";
import { getVentas, cambiarEstadoVenta, cancelarVenta } from "../services/api/ventas";
import { API_BASE } from "../services/api/base";
import ModalNuevaVenta from "../components/layout/ModalNuevaVenta";

const ESTADO_BADGE = {
    pendiente:  "bg-yellow-900/40 text-yellow-300 border border-yellow-800/60",
    confirmada: "bg-blue-900/40 text-blue-300 border border-blue-800/60",
    en_camino:  "bg-orange-900/40 text-orange-300 border border-orange-800/60",
    entregada:  "bg-green-900/40 text-green-300 border border-green-800/60",
    cancelada:  "bg-red-900/30 text-red-300 border border-red-800/60",
};

const ESTADO_LABEL = {
    pendiente:  "Pendiente",
    confirmada: "Confirmada",
    en_camino:  "En Camino",
    entregada:  "Entregada",
    cancelada:  "Cancelada",
};

const COBRO_BADGE = {
    pendiente: "bg-stone-800 text-stone-400 border border-stone-700",
    cobrado:   "bg-green-900/30 text-green-400 border border-green-800/50",
    parcial:   "bg-amber-900/30 text-amber-400 border border-amber-800/50",
};

const COBRO_LABEL = {
    pendiente: "Sin cobrar",
    cobrado:   "Cobrado",
    parcial:   "Parcial",
};

const TRANSICIONES = {
    pendiente:  ["confirmada", "cancelada"],
    confirmada: ["en_camino", "cancelada"],
    en_camino:  ["entregada", "cancelada"],
    entregada:  [],
    cancelada:  [],
};

const fmt = (v) => {
    if (!v) return "-";
    const [y, m, d] = String(v).split("T")[0].split("-");
    return `${d}/${m}/${y}`;
};

const ars = (v) => {
    if (v == null || v === "") return "$0";
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(v));
};

export default function Ventas() {
    const navigate = useNavigate();
    const documentosBase = API_BASE.replace(/\/api\/?$/, "");

    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [estadoFilter, setEstadoFilter] = useState("");
    const [actuando, setActuando] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelMotivo, setCancelMotivo] = useState("");
    const [cancelError, setCancelError] = useState("");

    const cargar = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getVentas({ estadoVenta: estadoFilter || undefined });
            setVentas(Array.isArray(data) ? data : (data?.results || []));
        } catch (e) {
            setError(e?.message || "Error al cargar ventas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, [estadoFilter]);

    const patchVenta = (updated) => {
        setVentas(prev => prev.map(v => v.id === updated.id ? updated : v));
        setSelected(updated);
    };

    const handleCambiarEstado = async (nuevoEstado) => {
        if (!selected || actuando) return;
        try {
            setActuando(true);
            patchVenta(await cambiarEstadoVenta(selected.id, nuevoEstado));
        } catch (e) {
            alert(e?.message || "Error al cambiar estado.");
        } finally {
            setActuando(false);
        }
    };

    const handleCancelar = async () => {
        if (!selected || actuando) return;
        if (!cancelMotivo.trim()) { setCancelError("Ingresa un motivo."); return; }
        try {
            setActuando(true);
            patchVenta(await cancelarVenta(selected.id, cancelMotivo.trim()));
            setCancelModal(false);
            setCancelMotivo("");
            setCancelError("");
        } catch (e) {
            setCancelError(e?.message || "Error al cancelar.");
        } finally {
            setActuando(false);
        }
    };

    const transicionesPrincipales = selected
        ? TRANSICIONES[selected.estado_venta]?.filter(e => e !== "cancelada") ?? []
        : [];
    const puedeCancelar = selected
        ? TRANSICIONES[selected.estado_venta]?.includes("cancelada") ?? false
        : false;
    const esFinal = selected
        ? TRANSICIONES[selected.estado_venta]?.length === 0
        : false;

    return (
        <div className="space-y-4">
            {/* Barra acciones */}
            <div className="flex items-center justify-between gap-2">
                <select
                    className="text-sm rounded-lg border border-stone-800 bg-stone-900/60 text-stone-300 px-3 py-1.5 focus:outline-none focus:border-stone-600"
                    value={estadoFilter}
                    onChange={e => setEstadoFilter(e.target.value)}
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(ESTADO_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
                <ButtonDef leftIcon={PlusIcon} text="Nueva Venta" variant="secondary" size="sm" onClick={() => setOpenModal(true)} />
            </div>

            {/* Tabla */}
            <div className="rounded-xl border border-stone-800 overflow-hidden shadow-lg">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-stone-900/60 border-b border-stone-800">
                            {["N°", "Cliente", "Fecha", "Total", "Estado", "Cobro", ""].map((h, i) => (
                                <th key={i} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400${i === 6 ? " text-right" : ""}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                        {loading ? (
                            <tr><td colSpan={7} className="py-12 text-center text-stone-500 text-sm bg-[#111111]">Cargando...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={7} className="py-12 text-center text-red-400 text-sm bg-[#111111]">{error}</td></tr>
                        ) : ventas.length === 0 ? (
                            <tr><td colSpan={7} className="py-16 text-center text-stone-500 text-sm bg-[#111111]">No hay ventas registradas.</td></tr>
                        ) : ventas.map(v => (
                            <tr key={v.id} className="bg-[#111111] hover:bg-[#1a1a1a] transition-colors duration-200 group">
                                <td className="px-4 py-3 text-stone-300 font-mono text-xs">#{v.id}</td>
                                <td className="px-4 py-3 text-white font-medium">{v.cliente_nombre || "-"}</td>
                                <td className="px-4 py-3 text-stone-400">{fmt(v.fecha_venta)}</td>
                                <td className="px-4 py-3 text-white font-semibold">{ars(v.total)}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[v.estado_venta] ?? "bg-stone-800 text-stone-300 border border-stone-700"}`}>
                                        {ESTADO_LABEL[v.estado_venta] || v.estado_venta}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COBRO_BADGE[v.estado_cobro] ?? "bg-stone-800 text-stone-300 border border-stone-700"}`}>
                                        {COBRO_LABEL[v.estado_cobro] || v.estado_cobro}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <ButtonDef
                                        leftIcon={EyeIcon} text="Ver" variant="ghost" size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        onClick={() => setSelected(v)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal nueva venta */}
            <ModalNuevaVenta
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                onCreated={() => { setOpenModal(false); cargar(); }}
            />

            {/* Panel detalle */}
            {selected && !cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
                    <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-stone-800 shadow-2xl p-6">
                        <button
                            className="absolute right-3 top-3 p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                            onClick={() => setSelected(null)}
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>

                        <p className="text-xs text-stone-500 font-mono mb-1">VENTA #{selected.id}</p>
                        <h2 className="text-lg font-bold text-white mb-0.5">{selected.cliente_nombre}</h2>
                        <p className="text-sm text-stone-400 mb-4">
                            {fmt(selected.fecha_venta)} · {ars(selected.total)}
                            {selected.saldo_pendiente > 0 && (
                                <span className="ml-2 text-amber-400">(saldo: {ars(selected.saldo_pendiente)})</span>
                            )}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[selected.estado_venta] ?? ""}`}>
                                {ESTADO_LABEL[selected.estado_venta] || selected.estado_venta}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COBRO_BADGE[selected.estado_cobro] ?? ""}`}>
                                {COBRO_LABEL[selected.estado_cobro] || selected.estado_cobro}
                            </span>
                        </div>

                        {/* Avanzar estado */}
                        {transicionesPrincipales.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs uppercase tracking-wider text-stone-500 mb-2 font-semibold">Avanzar estado</p>
                                <div className="flex flex-wrap gap-2">
                                    {transicionesPrincipales.map(est => (
                                        <ButtonDef
                                            key={est}
                                            leftIcon={CheckIcon}
                                            text={ESTADO_LABEL[est]}
                                            variant="secondary"
                                            size="sm"
                                            disabled={actuando}
                                            onClick={() => handleCambiarEstado(est)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Acciones rápidas */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <ButtonDef
                                leftIcon={DocumentTextIcon}
                                text="Factura PDF"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${documentosBase}/documentos/ventas/${selected.id}/pdf/`, "_blank", "noopener")}
                            />
                            <ButtonDef
                                leftIcon={BanknotesIcon}
                                text="Generar cobro"
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelected(null); navigate(`/caja?tipo=cobro&vista=nuevo&venta=${selected.id}`); }}
                            />
                        </div>

                        {/* Cancelar */}
                        {puedeCancelar && (
                            <div className="pt-4 border-t border-stone-800">
                                <ButtonDef
                                    leftIcon={XMarkIcon}
                                    text="Cancelar venta"
                                    variant="danger"
                                    size="sm"
                                    disabled={actuando}
                                    onClick={() => { setCancelMotivo(""); setCancelError(""); setCancelModal(true); }}
                                />
                            </div>
                        )}

                        {esFinal && (
                            <p className="text-sm text-stone-500 italic">
                                {selected.estado_venta === "entregada" ? "Venta completada." : "Venta cancelada."}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Modal cancelación */}
            {selected && cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
                    <div className="relative w-full max-w-sm rounded-xl bg-zinc-950 border border-stone-800 shadow-2xl p-6">
                        <button
                            className="absolute right-3 top-3 p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                            onClick={() => setCancelModal(false)}
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                        <h3 className="text-base font-bold text-white mb-1">Cancelar Venta #{selected.id}</h3>
                        <p className="text-sm text-stone-400 mb-4">Ingresa el motivo de cancelación.</p>
                        {cancelError && <p className="text-sm text-red-400 mb-3">{cancelError}</p>}
                        <textarea
                            rows={3}
                            className="w-full rounded-lg border border-stone-700 bg-stone-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-stone-500 placeholder:text-stone-500 mb-4"
                            placeholder="Motivo..."
                            value={cancelMotivo}
                            onChange={e => setCancelMotivo(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <ButtonDef text="Volver" variant="ghost" size="sm" onClick={() => setCancelModal(false)} />
                            <ButtonDef
                                text={actuando ? "Cancelando..." : "Confirmar"}
                                variant="danger"
                                size="sm"
                                disabled={actuando}
                                onClick={handleCancelar}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
