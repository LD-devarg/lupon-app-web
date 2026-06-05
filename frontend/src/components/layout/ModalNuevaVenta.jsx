import { useEffect, useMemo, useState } from "react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import ButtonDef from "../ui/Button";
import { getClientes } from "../../services/api/clientes";
import { getProductos } from "../../services/api/productos";
import { createVenta } from "../../services/api/ventas";

const INPUT = "w-full rounded-lg border border-stone-700 bg-stone-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-stone-500 placeholder:text-stone-500";
const LABEL = "block text-xs font-medium text-stone-400 mb-1";

const EMPTY_DETALLE = { producto: "", cantidad: "", precioUnitario: "" };

export default function ModalNuevaVenta({ isOpen, onClose, onCreated }) {
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [clienteId, setClienteId] = useState("");
    const [formaPago, setFormaPago] = useState("contado");
    const [direccionEntrega, setDireccionEntrega] = useState("");
    const [fechaEntrega, setFechaEntrega] = useState("");
    const [costoEntrega, setCostoEntrega] = useState("");
    const [descuento, setDescuento] = useState("");
    const [detalles, setDetalles] = useState([{ ...EMPTY_DETALLE }]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([getClientes(), getProductos()])
            .then(([c, p]) => { setClientes(c || []); setProductos(p || []); })
            .catch(() => setError("Error cargando datos."));
    }, [isOpen]);

    const clientesById = useMemo(() => clientes.reduce((a, c) => ({ ...a, [c.id]: c }), {}), [clientes]);
    const productosById = useMemo(() => productos.reduce((a, p) => ({ ...a, [p.id]: p }), {}), [productos]);

    const getPrecio = (productoData, clienteData) => {
        if (!productoData) return "";
        const cat = clienteData?.categoria;
        if (cat === "Minorista")
            return String(productoData.es_oferta && productoData.precio_oferta != null
                ? productoData.precio_oferta
                : productoData.precio_minorista ?? "");
        if (cat === "Mayorista Exclusivo")
            return String(productoData.precio_mayorista_exclusivo ?? productoData.precio_mayorista ?? "");
        if (cat === "Mayorista")
            return String(productoData.precio_mayorista ?? "");
        return "";
    };

    const handleClienteChange = (id) => {
        setClienteId(id);
        const cli = clientesById[id];
        setDetalles(prev => prev.map(d =>
            d.producto ? { ...d, precioUnitario: getPrecio(productosById[d.producto], cli) } : d
        ));
    };

    const handleProductoChange = (i, productoId) => {
        setDetalles(prev => prev.map((d, idx) =>
            idx === i ? { ...d, producto: productoId, precioUnitario: getPrecio(productosById[productoId], clientesById[clienteId]) } : d
        ));
    };

    const handleField = (i, field, value) =>
        setDetalles(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

    const reset = () => {
        setClienteId(""); setFormaPago("contado"); setDireccionEntrega("");
        setFechaEntrega(""); setCostoEntrega(""); setDescuento("");
        setDetalles([{ ...EMPTY_DETALLE }]); setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!clienteId) { setError("Selecciona un cliente."); return; }
        const detallesPayload = detalles.map(d => ({
            producto: Number(d.producto),
            cantidad: Number(d.cantidad),
            precio_unitario: Number(d.precioUnitario),
        }));
        if (detallesPayload.some(d => !d.producto || !d.cantidad || !d.precio_unitario)) {
            setError("Completa producto, cantidad y precio en cada ítem.");
            return;
        }
        const payload = { cliente: Number(clienteId), forma_pago: formaPago, detalles: detallesPayload };
        if (direccionEntrega.trim()) payload.direccion_entrega = direccionEntrega.trim();
        if (fechaEntrega) payload.fecha_entrega = fechaEntrega;
        if (costoEntrega) payload.costo_entrega = Number(costoEntrega);
        if (descuento) payload.descuento = Number(descuento);
        try {
            setSubmitting(true);
            await createVenta(payload);
            reset();
            onCreated?.();
        } catch (err) {
            setError(err?.message || "Error al crear la venta.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-950 border border-stone-800 shadow-2xl p-6">
                <button
                    type="button"
                    className="absolute right-3 top-3 p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                    onClick={() => { reset(); onClose(); }}
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold text-white mb-5">Nueva Venta</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={LABEL}>Cliente *</label>
                            <select className={INPUT} value={clienteId} onChange={e => handleClienteChange(e.target.value)}>
                                <option value="">Seleccionar cliente</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}{c.nombre_fantasia ? ` · ${c.nombre_fantasia}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={LABEL}>Forma de pago</label>
                            <select className={INPUT} value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                                <option value="contado">Contado</option>
                                <option value="contado pendiente">Contado pendiente</option>
                                <option value="cuenta corriente">Cuenta corriente</option>
                            </select>
                        </div>

                        <div>
                            <label className={LABEL}>Costo entrega</label>
                            <input type="number" min="0" className={INPUT} placeholder="0" value={costoEntrega} onChange={e => setCostoEntrega(e.target.value)} />
                        </div>

                        <div className="col-span-2">
                            <label className={LABEL}>Dirección de entrega</label>
                            <input type="text" className={INPUT} value={direccionEntrega} onChange={e => setDireccionEntrega(e.target.value)} />
                        </div>

                        <div>
                            <label className={LABEL}>Fecha de entrega</label>
                            <input type="date" className={INPUT} value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
                        </div>

                        <div>
                            <label className={LABEL}>Descuento</label>
                            <input type="number" min="0" className={INPUT} placeholder="0" value={descuento} onChange={e => setDescuento(e.target.value)} />
                        </div>
                    </div>

                    {/* Productos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Productos</span>
                            <ButtonDef
                                leftIcon={PlusIcon} text="Agregar" variant="ghost" size="sm" type="button"
                                onClick={() => setDetalles(prev => [...prev, { ...EMPTY_DETALLE }])}
                            />
                        </div>
                        <div className="space-y-3">
                            {detalles.map((d, i) => (
                                <div key={i} className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 space-y-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-stone-500">Ítem {i + 1}</span>
                                        {detalles.length > 1 && (
                                            <button type="button" onClick={() => setDetalles(prev => prev.filter((_, idx) => idx !== i))}
                                                className="text-stone-500 hover:text-red-400 transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <select className={INPUT} value={d.producto} onChange={e => handleProductoChange(i, e.target.value)}>
                                        <option value="">Seleccionar producto</option>
                                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" min="1" className={INPUT} placeholder="Cantidad"
                                            value={d.cantidad} onChange={e => handleField(i, "cantidad", e.target.value)} />
                                        <input type="number" min="0" className={INPUT} placeholder="Precio unit."
                                            value={d.precioUnitario} onChange={e => handleField(i, "precioUnitario", e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                        <ButtonDef text="Cancelar" variant="ghost" size="md" type="button" onClick={() => { reset(); onClose(); }} />
                        <ButtonDef text={submitting ? "Guardando..." : "Crear venta"} variant="primary" size="md" type="submit" disabled={submitting} />
                    </div>
                </form>
            </div>
        </div>
    );
}
