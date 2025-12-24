from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuariosViewSet,
    ContactosViewSet,
    ProductosViewSet,
    PedidosVentasViewSet,
    VentasViewSet,
    VentasDetalleViewSet,
    CobrosViewSet,
    CobrosDetalleViewSet,
    PedidosComprasViewSet,
    PedidosComprasDetalleViewSet,
    ComprasViewSet,
    ComprasDetalleViewSet,
    PagosViewSet,
    PagosDetalleViewSet,
    NotasCreditoViewSet,
    DashboardView,
)

router = DefaultRouter()

# --- USUARIOS / CONTACTOS / PRODUCTOS ---
# Usuarios con las actions personalizadas
router.register(r'usuarios', UsuariosViewSet, basename='usuarios')
router.register(r'contactos', ContactosViewSet, basename='contactos')
router.register(r'productos', ProductosViewSet, basename='productos')

# --- PEDIDOS DE VENTAS Y DETALLES ---
router.register(r'pedidos-ventas', PedidosVentasViewSet, basename='pedidos-ventas')

# --- VENTAS Y DETALLES ---
router.register(r'ventas', VentasViewSet, basename='ventas')
router.register(r'ventas-detalle', VentasDetalleViewSet, basename='ventas-detalle')

# --- COBROS Y DETALLES ---
router.register(r'cobros', CobrosViewSet, basename='cobros')
router.register(r'cobros-detalle', CobrosDetalleViewSet, basename='cobros-detalle')

# --- PEDIDOS COMPRAS Y DETALLES ---
router.register(r'pedidos-compras', PedidosComprasViewSet, basename='pedidos-compras')
router.register(r'pedidos-compras-detalle', PedidosComprasDetalleViewSet, basename='pedidos-compras-detalle')

# --- COMPRAS Y DETALLES ---
router.register(r'compras', ComprasViewSet, basename='compras')
router.register(r'compras-detalle', ComprasDetalleViewSet, basename='compras-detalle')

# --- PAGOS Y DETALLES ---
router.register(r'pagos', PagosViewSet, basename='pagos')
router.register(r'pagos-detalle', PagosDetalleViewSet, basename='pagos-detalle')


# --- NOTAS DE CRÉDITO Y DETALLES ---
router.register(r'notas-credito', NotasCreditoViewSet, basename='notas-credito')

urlpatterns = [
    path('dashboard/', DashboardView.as_view()),
    path('', include(router.urls)),
]
