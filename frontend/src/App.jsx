import { Navigate, Route, Routes, Outlet, useLocation } from "react-router-dom";
import DesktopLayout from "./layouts/DesktopLayout.jsx";
import Login from "./pages/Login.jsx";
import Ventas from "./pages/Ventas.jsx";
import MovimientoForm from "./pages/MovimientoForm.jsx";
import Productos from "./pages/Productos.jsx";
import Contactos from "./pages/Contactos.jsx";
import CobrosListado from "./pages/CobrosListado.jsx";
import Logistica from "./pages/Logistica.jsx";
import ComprasListado from "./pages/ComprasListado.jsx";
import PagosListado from "./pages/PagosListado.jsx";
import Caja from "./pages/Caja.jsx";
import NotasCredito from "./pages/NotasCredito.jsx";
import NotasCreditoListado from "./pages/NotasCreditoListado.jsx";
import CuentaCorrienteClientes from "./pages/CuentaCorrienteClientes.jsx";
import Home from "./pages/Home.jsx";
import Configuraciones from "./pages/Configuraciones.jsx"

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
      <DesktopLayout>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/home" element={<Home />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/cobros" element={<MovimientoForm tipo="cobro" />} />
            <Route path="/cobros/listado" element={<CobrosListado />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/contactos" element={<Contactos />} />
            <Route path="/logistica" element={<Logistica />} />
            <Route path="/compras" element={<ComprasListado />} />
            <Route path="/compras/listado" element={<ComprasListado />} />
            <Route path="/pagos" element={<MovimientoForm tipo="pago" />} />
            <Route path="/pagos/listado" element={<PagosListado />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/notas-credito" element={<NotasCredito />} />
            <Route path="/notas-credito/listado" element={<NotasCreditoListado />} />
            <Route path="/configuraciones" element={<Configuraciones />} />
            <Route path="/cuenta-corriente-clientes" element={<CuentaCorrienteClientes />} />
          </Route>
        </Routes>
      </DesktopLayout>
    </div>
  );
}

export default App;
