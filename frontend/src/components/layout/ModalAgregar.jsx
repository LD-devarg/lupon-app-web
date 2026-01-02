import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";

export default function ModalAgregar({ isOpen, onClose }) {
  if (!isOpen) return null;

  const navigate = useNavigate();

  const handleGoToPedidosVentas = () => {
    onClose();
    navigate("/pedidos-ventas");
  };

  const handleGoToPedidosCompras = () => {
    onClose();
    navigate("/pedidos-compras");
  };

  const handleGoToVentas = () => {
    onClose();
    navigate("/ventas");
  };

  const handleGoToCompras = () => {
    onClose();
    navigate("/compras");
  };

  const handleGoToNotasCredito = () => {
    onClose();
    navigate("/notas-credito");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="relative w-full max-w-sm rounded-xl bg-neutral-300 p-4 pt-10 shadow-xl grid gap-4 grid-cols-2 grid-rows-3">
            <Button
                type="button"
                className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-white hover:bg-gray-100 hover:text-gray-800"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
            >
                X
            </Button>
            <div>
                <Button
                  type="button"
                  className="modal-agregar-btn neuro-shadow-div"
                  onClick={handleGoToPedidosVentas}
                  whileHover={{ scale: 1.1 }}
                >
                  <p>Nuevo Pedido de Venta</p>
                </Button>
            </div>
            <div>
                <Button
                  type="button"
                  className="modal-agregar-btn neuro-shadow-div"
                  onClick={handleGoToPedidosCompras}
                  whileHover={{ scale: 1.1 }}
                >
                  <p>Nuevo Pedido de Compra</p>
                </Button>
            </div>
            <div >
                <Button
                  type="button"
                  className="modal-agregar-btn neuro-shadow-div"
                  onClick={handleGoToVentas}
                  whileHover={{ scale: 1.1 }}
                >
                  <p>Nueva Venta</p>
                </Button>
            </div>
            <div>
                <Button
                  type="button"
                  className="modal-agregar-btn neuro-shadow-div"
                  onClick={handleGoToCompras}
                  whileHover={{ scale: 1.1 }}
                >
                  <p>Nueva Compra</p>
                </Button>
            </div>
            <div>
                <Button
                  type="button"
                  className="modal-agregar-btn neuro-shadow-div"
                  onClick={handleGoToNotasCredito}
                  whileHover={{ scale: 1.1 }}
                >
                  <p>Nueva Nota de Credito</p>
                </Button>
            </div>
        </div>
    </div>
  );
}
