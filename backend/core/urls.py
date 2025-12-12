from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuariosViewSet,
    ContactosViewSet,
    ProductosViewSet,
    PedidosVentasViewSet,
    PedidosVentasDetalleViewSet,
    VentasViewSet,
    VentasDetalleViewSet,
    CobrosViewSet,
    CobrosDetalleViewSet,
    PedidosComprasViewSet,
    PedidosComprasDetalleViewSet,
    ComprasViewSet,
    ComprasDetalleViewSet
)

router = DefaultRouter()

# --- USUARIOS / CONTACTOS / PRODUCTOS ---
# Usuarios con las actions personalizadas
router.register(r'usuarios', UsuariosViewSet, basename='usuarios')
router.register(r'contactos', ContactosViewSet, basename='contactos')
router.register(r'productos', ProductosViewSet, basename='productos')

# --- PEDIDOS DE VENTAS Y DETALLES ---
router.register(r'pedidos-ventas', PedidosVentasViewSet, basename='pedidos-ventas')
router.register(r'pedidos-ventas-detalle', PedidosVentasDetalleViewSet, basename='pedidos-ventas-detalle')

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

urlpatterns = [
    path('', include(router.urls)),
]

