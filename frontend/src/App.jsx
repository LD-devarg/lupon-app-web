import { Route, Routes } from "react-router-dom";
import MobileLayout from "./layouts/MobileLayout.jsx";
import Login from "./pages/Login.jsx";
import PedidosVentasListado from "./pages/pedidosVentasListado.jsx";
import PedidosVentas from "./pages/pedidosVentas.jsx";
import Ventas from "./pages/ventas.jsx";
import VentasListado from "./pages/ventasListado.jsx";
import Cobros from "./pages/cobros.jsx";
import Productos from "./pages/productos.jsx";
import Contactos from "./pages/contactos.jsx";
import CobrosListado from "./pages/cobrosListado.jsx";

function App() {
  return (
    <div>
      <MobileLayout>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pedidos-ventas" element={<PedidosVentas />} />
          <Route path="/pedidos-ventas/listado" element={<PedidosVentasListado />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/ventas/listado" element={<VentasListado />} />
          <Route path="/cobros" element={<Cobros />} />
          <Route path="/cobros/listado" element={<CobrosListado />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/contactos" element={<Contactos />} />
        </Routes>
      </MobileLayout>
    </div>
  );
}

export default App;
