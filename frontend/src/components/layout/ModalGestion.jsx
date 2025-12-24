import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";

const LINKS = [
  { label: "Ventas", path: "/ventas" },
  { label: "Ventas (Listado)", path: "/ventas/listado" },
  { label: "Cobros", path: "/cobros" },
  { label: "Cobros (Listado)", path: "/cobros/listado" },
  { label: "Pedidos de Venta", path: "/pedidos-ventas" },
  { label: "Pedidos (Listado)", path: "/pedidos-ventas/listado" },
  { label: "Contactos", path: "/contactos" },
  { label: "Productos", path: "/productos" },
];

export default function ModalGestion({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-neutral-300 p-4 shadow-xl">
        <Button
          type="button"
          className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-white hover:bg-gray-100 hover:text-gray-800"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
        >
          X
        </Button>
        <h3 className="text-lg font-semibold text-gray-800">Gestion</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {LINKS.map((link) => (
            <Button
              key={link.path}
              type="button"
              className="w-full text-center p-3 neuro-shadow-div text-sm"
              onClick={() => handleGoTo(link.path)}
              whileHover={{ scale: 1.05 }}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
