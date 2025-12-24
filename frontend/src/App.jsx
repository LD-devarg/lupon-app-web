import { Navigate, Route, Routes, Outlet, useLocation } from "react-router-dom";
import MobileLayout from "./layouts/MobileLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PedidosVentasListado from "./pages/pedidosVentasListado.jsx";
import PedidosVentas from "./pages/pedidosVentas.jsx";
import Ventas from "./pages/ventas.jsx";
import VentasListado from "./pages/ventasListado.jsx";
import Cobros from "./pages/cobros.jsx";
import Productos from "./pages/productos.jsx";
import Contactos from "./pages/contactos.jsx";
import CobrosListado from "./pages/cobrosListado.jsx";
import Logistica from "./pages/logistica.jsx";
import PedidosCompras from "./pages/pedidosCompras.jsx";
import PedidosComprasListado from "./pages/pedidosComprasListado.jsx";
import Compras from "./pages/compras.jsx";
import ComprasListado from "./pages/comprasListado.jsx";
import Pagos from "./pages/pagos.jsx";
import PagosListado from "./pages/pagosListado.jsx";
import Caja from "./pages/caja.jsx";
import NotasCredito from "./pages/notasCredito.jsx";
import NotasCreditoListado from "./pages/notasCreditoListado.jsx";
import Dashboard from "./pages/dashboard.jsx";

function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem("authAccessToken");
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <div>
      <MobileLayout>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<RequireAuth />}>
            <Route path="/pedidos-ventas" element={<PedidosVentas />} />
            <Route path="/pedidos-ventas/listado" element={<PedidosVentasListado />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/ventas/listado" element={<VentasListado />} />
            <Route path="/cobros" element={<Cobros />} />
            <Route path="/cobros/listado" element={<CobrosListado />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/contactos" element={<Contactos />} />
            <Route path="/logistica" element={<Logistica />} />
            <Route path="/pedidos-compras" element={<PedidosCompras />} />
            <Route path="/pedidos-compras/listado" element={<PedidosComprasListado />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/compras/listado" element={<ComprasListado />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/pagos/listado" element={<PagosListado />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/notas-credito" element={<NotasCredito />} />
            <Route path="/notas-credito/listado" element={<NotasCreditoListado />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </MobileLayout>
    </div>
  );
}

export default App;
