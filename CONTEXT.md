## Proyecto: lupon-app-web (contexto parcial)

Este archivo resume el estado actual del front para retomar rapido en otra sesion.

### Stack y base
- Front: React + Vite + Tailwind.
- Auth dev: Basic Auth desde `localStorage` en `frontend/src/services/api/base.js`.
  - Keys: `devAuthUser`, `devAuthPass`.

### Estructura de UI
- Layout principal: `frontend/src/layouts/MobileLayout.jsx`.
- Navbar inferior: `frontend/src/components/ui/BottomNavbar.jsx`.
- Botonera de accesos: `frontend/src/components/layout/ModalGestion.jsx` (lista listados).
- Modal de altas rapidas: `frontend/src/components/layout/ModalAgregar.jsx`.
- Boton reusable con `whileTap` 0.95: `frontend/src/components/ui/Button.jsx`.

### Rutas principales (App)
`frontend/src/App.jsx`
- `/login`
- `/pedidos-ventas` (alta pedido venta)
- `/pedidos-ventas/listado`
- `/ventas` (alta venta)
- `/ventas/listado`
- `/cobros` (alta cobro)
- `/cobros/listado`
- `/productos`
- `/contactos`
- `/pedidos-compras`
- `/pedidos-compras/listado`
- `/compras`
- `/compras/listado`
- `/logistica`

### Modulos implementados (front)
Pedidos de Venta:
- Alta: `frontend/src/pages/pedidosVentas.jsx`
- Listado + modal detalle/editar + cancelar con motivo: `frontend/src/pages/pedidosVentasListado.jsx`
- Detalles solo editables si estado `pendiente`.

Ventas:
- Alta: `frontend/src/pages/ventas.jsx` (puede precargar por `?pedido=ID`).
- Listado + modal detalle + cambio estado entrega + reprogramar fecha + cancelar venta:
  `frontend/src/pages/ventasListado.jsx`
- Boton "Ver pedido asociado" abre `/pedidos-ventas/listado?pedido=ID`.

Cobros:
- Alta: `frontend/src/pages/cobros.jsx` (multi-venta, aplica saldo, total aplicado).
- Listado + aplicar saldo disponible a nuevas ventas:
  `frontend/src/pages/cobrosListado.jsx`.

Compras:
- Pedidos de compra (alta y listado):
  `frontend/src/pages/pedidosCompras.jsx`,
  `frontend/src/pages/pedidosComprasListado.jsx`
  (detalle editable solo si `pendiente`, boton "Generar compra").
- Compras (alta y listado):
  `frontend/src/pages/compras.jsx`,
  `frontend/src/pages/comprasListado.jsx`
  (cambio estado compra via action, motivo si cancelada).

Productos:
- CRUD con modal (alta/edicion), filtro en pagina.
- Se muestran `precio_compra`, `precio_minorista`, `precio_mayorista`, oferta activa y fechas.
- Archivo: `frontend/src/pages/productos.jsx`.

Contactos:
- CRUD con modal (alta/edicion), filtro en pagina.
- Se muestra `saldo_contacto`, tipo en Capitalize.
- Archivo: `frontend/src/pages/contactos.jsx`.

Logistica:
- `frontend/src/pages/logistica.jsx`
- Agrupa ventas por fecha entrega (usa `fecha_reprogramada` o `fecha_entrega`).
- Filtro por fecha (default hoy) y cliente.
- Pills con colores segun estado entrega.

### Servicios API (front)
- Base: `frontend/src/services/api/base.js` (get/post/patch/delete + Basic Auth).
- Cache: `frontend/src/services/api/cache.js`
  - Clientes/productos persisten en `localStorage` con TTL (24h).
- Ventas: `frontend/src/services/api/ventas.js`
- Pedidos ventas: `frontend/src/services/api/pedidosVentas.js`
- Pedidos compras: `frontend/src/services/api/pedidosCompras.js`
- Compras: `frontend/src/services/api/compras.js`
- Cobros: `frontend/src/services/api/cobros.js`
- Productos: `frontend/src/services/api/productos.js`
- Contactos: `frontend/src/services/api/contactos.js`

### Formato ARS
- Montos mostrados con `Intl.NumberFormat("es-AR", { currency: "ARS" })`
  en listados de ventas, cobros, pedidos, productos y contactos.

### Pendientes / ideas futuras
- Logistica con mapa y rutas (postergado).
- Mostrar fecha reprogramada/entrega en mas vistas si aplica.
- Revisar accesos rapidos segun flujo real del usuario.
- Mejoras visuales de listados/modales segun necesidad.
