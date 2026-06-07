import { useEffect, useMemo, useState } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import ButtonDef from "../ui/Button";
import { getContactos } from "../../services/api/contactos";
import { getProductos } from "../../services/api/productos";
import { getVentas } from "../../services/api/ventas";
import { createCompra } from "../../services/api/compras";

const INPUT = "w-full rounded-lg border border-stone-700 bg-stone-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-stone-500 placeholder:text-stone-500";
const LABEL = "block text-xs font-medium text-stone-400 mb-1";

export default function ModalNuevaCompra({ isOpen, onClose, onCreated }) {
    const [tipoCompra, setTipoCompra] = useState("gastos"); // "gastos" | "productos"
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [proveedorId, setProveedorId] = useState("");
    const [fechaCompra, setFechaCompra] = useState(() => new Date().toISOString().split("T")[0]);
    const [formaPago, setFormaPago] = useState("cuenta corriente");
    const [numeroDocumento, setNumeroDocumento] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Gastos specific state
    const [totalGasto, setTotalGasto] = useState("");

    // Productos specific state
    const [fechaEntrega, setFechaEntrega] = useState("");
    const [loadingSales, setLoadingSales] = useState(false);
    const [groupedItems, setGroupedItems] = useState([]);
    const [extra, setExtra] = useState("");
    const [descuento, setDescuento] = useState("");

    // Load initial data
    useEffect(() => {
        if (!isOpen) return;
        setError("");
        Promise.all([
            getContactos({ tipo: "proveedor" }),
            getProductos()
        ])
        .then(([provs, prods]) => {
            setProveedores(provs || []);
            setProductos(prods || []);
        })
        .catch(() => setError("Error cargando proveedores o productos."));
    }, [isOpen]);

    const productosById = useMemo(() => {
        return productos.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    }, [productos]);

    // Fetch and group sales details when delivery date is selected
    useEffect(() => {
        if (tipoCompra !== "productos" || !fechaEntrega) {
            setGroupedItems([]);
            return;
        }
        let active = true;
        const fetchAndGroup = async () => {
            setLoadingSales(true);
            setError("");
            try {
                const data = await getVentas({ estadoVenta: "confirmada", fechaEntrega });
                if (!active) return;
                const salesList = Array.isArray(data) ? data : (data?.results || []);
                if (salesList.length === 0) {
                    setGroupedItems([]);
                    return;
                }

                const grouped = {};
                salesList.forEach(sale => {
                    if (sale.detalles && Array.isArray(sale.detalles)) {
                        sale.detalles.forEach(d => {
                            const pid = d.producto;
                            const qty = Number(d.cantidad) || 0;
                            if (!grouped[pid]) {
                                const prodInfo = productosById[pid];
                                grouped[pid] = {
                                    producto: pid,
                                    nombre: prodInfo?.nombre || `Producto #${pid}`,
                                    cantidad: 0,
                                    precio_unitario: Number(prodInfo?.precio_compra) || 0
                                };
                            }
                            grouped[pid].cantidad += qty;
                        });
                    }
                });
                setGroupedItems(Object.values(grouped));
            } catch (err) {
                if (active) {
                    setError(err?.message || "Error al cargar ventas de esa fecha.");
                }
            } finally {
                if (active) {
                    setLoadingSales(false);
                }
            }
        };

        fetchAndGroup();
        return () => {
            active = false;
        };
    }, [fechaEntrega, tipoCompra, productosById]);

    const handleGroupedItemChange = (index, field, value) => {
        setGroupedItems(prev => prev.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const subtotal = useMemo(() => {
        return groupedItems.reduce((acc, item) => {
            const qty = Number(item.cantidad) || 0;
            const price = Number(item.precio_unitario) || 0;
            return acc + (qty * price);
        }, 0);
    }, [groupedItems]);

    const totalCalculated = useMemo(() => {
        const ext = Number(extra) || 0;
        const desc = Number(descuento) || 0;
        return subtotal + ext - desc;
    }, [subtotal, extra, descuento]);

    const formatArs = (value) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
        }).format(Number(value) || 0);
    };

    const reset = () => {
        setProveedorId("");
        setFechaCompra(new Date().toISOString().split("T")[0]);
        setFormaPago("cuenta corriente");
        setNumeroDocumento("");
        setObservaciones("");
        setError("");
        setTotalGasto("");
        setFechaEntrega("");
        setGroupedItems([]);
        setExtra("");
        setDescuento("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!proveedorId) {
            setError("Seleccione un proveedor.");
            return;
        }

        const payload = {
            proveedor: Number(proveedorId),
            fecha_compra: fechaCompra,
            forma_pago: formaPago,
            observaciones: observaciones.trim(),
            numero_documento: numeroDocumento.trim(),
            detalles: []
        };

        if (tipoCompra === "gastos") {
            const totalVal = Number(totalGasto) || 0;
            if (totalVal <= 0) {
                setError("El monto del gasto debe ser mayor a cero.");
                return;
            }
            payload.extra = totalVal;
        } else {
            // "productos" purchase
            if (groupedItems.length === 0) {
                setError("Debe haber al menos un producto en la compra. Seleccione una fecha con ventas confirmadas.");
                return;
            }

            const detallesPayload = groupedItems.map(item => ({
                producto: Number(item.producto),
                cantidad: Number(item.cantidad),
                precio_unitario: Number(item.precio_unitario)
            }));

            if (detallesPayload.some(d => !d.producto || d.cantidad <= 0 || d.precio_unitario <= 0)) {
                setError("Cada producto debe tener cantidad y precio unitario mayores a cero.");
                return;
            }

            payload.detalles = detallesPayload;
            if (extra) payload.extra = Number(extra);
            if (descuento) payload.descuento = Number(descuento);
        }

        try {
            setSubmitting(true);
            await createCompra(payload);
            reset();
            onCreated?.();
            onClose();
        } catch (err) {
            setError(err?.message || "Error al crear la compra.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-950 border border-stone-800 shadow-2xl p-6">
                <button
                    type="button"
                    className="absolute right-3 top-3 p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                    onClick={() => { reset(); onClose(); }}
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold text-white mb-4">Nueva Compra</h2>

                {/* Tabs Segmented Control */}
                <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-stone-900/80 rounded-xl border border-stone-800">
                    <button
                        type="button"
                        className={`rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                            tipoCompra === "gastos"
                                ? "bg-[#CAED4E] text-black shadow-md"
                                : "text-stone-400 hover:text-white"
                        }`}
                        onClick={() => { setTipoCompra("gastos"); setError(""); }}
                    >
                        Gasto General
                    </button>
                    <button
                        type="button"
                        className={`rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
                            tipoCompra === "productos"
                                ? "bg-[#CAED4E] text-black shadow-md"
                                : "text-stone-400 hover:text-white"
                        }`}
                        onClick={() => { setTipoCompra("productos"); setError(""); }}
                    >
                        Compra de Productos
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={LABEL}>Proveedor *</label>
                            <select
                                className={INPUT}
                                value={proveedorId}
                                onChange={e => setProveedorId(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar proveedor</option>
                                {proveedores.map(prov => (
                                    <option key={prov.id} value={prov.id}>
                                        {prov.nombre}{prov.nombre_fantasia ? ` · ${prov.nombre_fantasia}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={LABEL}>Fecha de compra</label>
                            <input
                                type="date"
                                className={INPUT}
                                value={fechaCompra}
                                onChange={e => setFechaCompra(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className={LABEL}>Forma de pago</label>
                            <select
                                className={INPUT}
                                value={formaPago}
                                onChange={e => setFormaPago(e.target.value)}
                            >
                                <option value="cuenta corriente">Cuenta corriente</option>
                                <option value="contado">Contado</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className={LABEL}>Número de Documento (Opcional)</label>
                            <input
                                type="text"
                                className={INPUT}
                                placeholder="Ej: Factura A-0001 o Ticket N° 1234"
                                value={numeroDocumento}
                                onChange={e => setNumeroDocumento(e.target.value)}
                            />
                        </div>

                        {/* Gastos Type Fields */}
                        {tipoCompra === "gastos" && (
                            <div className="col-span-2">
                                <label className={LABEL}>Monto Total del Gasto *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={INPUT}
                                    placeholder="0.00"
                                    value={totalGasto}
                                    onChange={e => setTotalGasto(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {/* Productos Type Fields */}
                        {tipoCompra === "productos" && (
                            <>
                                <div className="col-span-2">
                                    <label className={LABEL}>Fecha de entrega de Ventas *</label>
                                    <input
                                        type="date"
                                        className={INPUT}
                                        value={fechaEntrega}
                                        onChange={e => setFechaEntrega(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    {loadingSales && (
                                        <p className="text-sm text-stone-400 py-2">Buscando y agrupando ventas...</p>
                                    )}

                                    {!loadingSales && fechaEntrega && groupedItems.length === 0 && (
                                        <p className="text-sm text-stone-500 py-4 text-center border border-dashed border-stone-850 rounded-lg">
                                            No se encontraron ventas confirmadas con esta fecha de entrega.
                                        </p>
                                    )}

                                    {!loadingSales && groupedItems.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                                    Productos sugeridos (Agrupados)
                                                </span>
                                            </div>
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                {groupedItems.map((item, idx) => (
                                                    <div key={item.producto} className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-white">{item.nombre}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setGroupedItems(prev => prev.filter((_, i) => i !== idx))}
                                                                className="text-stone-500 hover:text-red-400 transition-colors"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] text-stone-500 font-medium">Cantidad</label>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    className={INPUT}
                                                                    value={item.cantidad}
                                                                    onChange={e => handleGroupedItemChange(idx, "cantidad", e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-stone-500 font-medium">Precio Unit. (Costo)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    className={INPUT}
                                                                    value={item.precio_unitario}
                                                                    onChange={e => handleGroupedItemChange(idx, "precio_unitario", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-850">
                                                <div>
                                                    <label className={LABEL}>Gastos Extras (Flete, etc)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className={INPUT}
                                                        placeholder="0.00"
                                                        value={extra}
                                                        onChange={e => setExtra(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>Descuento</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className={INPUT}
                                                        placeholder="0.00"
                                                        value={descuento}
                                                        onChange={e => setDescuento(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-stone-900/60 p-3 rounded-lg border border-stone-800 space-y-1 text-xs mt-3">
                                                <div className="flex justify-between text-stone-400">
                                                    <span>Subtotal productos:</span>
                                                    <span className="font-mono">{formatArs(subtotal)}</span>
                                                </div>
                                                {Number(extra) > 0 && (
                                                    <div className="flex justify-between text-stone-400">
                                                        <span>Extras:</span>
                                                        <span className="font-mono text-emerald-400">+{formatArs(extra)}</span>
                                                    </div>
                                                )}
                                                {Number(descuento) > 0 && (
                                                    <div className="flex justify-between text-stone-400">
                                                        <span>Descuento:</span>
                                                        <span className="font-mono text-rose-400">-{formatArs(descuento)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-stone-800">
                                                    <span>Total estimado:</span>
                                                    <span className="font-mono text-[#CAED4E]">{formatArs(totalCalculated)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="col-span-2">
                            <label className={LABEL}>Observaciones (Opcional)</label>
                            <textarea
                                rows={2}
                                className={INPUT}
                                placeholder="Detalles de la compra..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-stone-800">
                        <ButtonDef
                            text="Cancelar"
                            variant="ghost"
                            size="md"
                            type="button"
                            onClick={() => { reset(); onClose(); }}
                        />
                        <ButtonDef
                            text={submitting ? "Guardando..." : "Crear compra"}
                            variant="primary"
                            size="md"
                            type="submit"
                            disabled={submitting}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}