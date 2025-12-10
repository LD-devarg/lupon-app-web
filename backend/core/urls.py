from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuariosViewSet,
    ContactosViewSet,
    ProductosViewSet,
    PedidosVentasViewSet,
    PedidosVentasDetalleViewSet,
    VentasViewSet,
    VentasDetalleViewSet
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

urlpatterns = [
    path('', include(router.urls)),
]

