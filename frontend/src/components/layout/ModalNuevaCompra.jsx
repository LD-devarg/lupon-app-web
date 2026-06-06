import ButtonDef from "../ui/Button";

export default function ModalNuevaCompra({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed backdrop-blur-[2px] inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative w-full max-w-sm rounded-xl bg-zinc-950/50 p-10 shadow-xl border border-stone-800">
                <button
                    type="button"
                    className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-white hover:bg-gray-100 hover:text-gray-800"
                    onClick={onClose}
                >
                    X
                </button>
                <h2 className="text-xl text-white font-bold mb-4 text-center">Nueva Compra</h2>
                <form className="space-y-1">
                    <div>
                        <label className="block text-sm font-medium text-white">Número de Compra</label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-zinc-950/50 text-white placeholder:text-stone-400"
                            placeholder="Ingrese el número de compra"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white">Proveedor</label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-zinc-950/50 text-white placeholder:text-stone-400"
                            placeholder="Ingrese el nombre del proveedor"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white">Fecha</label>
                        <input
                            type="date"
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-zinc-950/50 text-white placeholder:text-stone-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white">Total</label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-zinc-950/50 text-white placeholder:text-stone-400"
                            placeholder="Ingrese el total de la compra"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white">Estado</label>
                        <select
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-zinc-950/50 text-white placeholder:text-stone-400"
                        >
                            <option>Pendiente</option>
                            <option>Completada</option>
                            <option>Cancelada</option>
                        </select>
                    </div>
                    <div className="flex justify-end">  
                        <ButtonDef
                            type="submit"
                            text="Guardar"
                            variant="primary"
                            size="md"
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}