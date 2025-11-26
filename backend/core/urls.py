from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContactosViewSet,
    ProductoViewSet,
    PedidosVentasViewSet,
    PedidosVentasDetalleViewSet,
    VentasViewSet,
    CobrosViewSet,
    PedidosComprasViewSet,
    PedidosComprasDetalleViewSet,
    ComprasViewSet,
    ComprasDetalleViewSet,
    PagosViewSet,
    CuentaCorrienteMovimientoViewSet,
    OfertasViewSet,
)

router = DefaultRouter()

# --- CONTACTOS / PRODUCTOS ---
router.register(r'contactos', ContactosViewSet, basename='contactos')
router.register(r'productos',      ProductoViewSet, basename='productos')
router.register(r'ofertas',        OfertasViewSet, basename='ofertas')

# --- VENTAS ---
router.register(r'pedidos_ventas',         PedidosVentasViewSet, basename='pedidos_ventas')
router.register(r'pedidos_ventas_detalle', PedidosVentasDetalleViewSet, basename='pedidos_ventas_detalle')
router.register(r'ventas',                 VentasViewSet, basename='ventas')
router.register(r'cobros',                 CobrosViewSet, basename='cobros')

# --- COMPRAS ---
router.register(r'pedidos_compras',         PedidosComprasViewSet, basename='pedidos_compras')
router.register(r'pedidos_compras_detalle', PedidosComprasDetalleViewSet, basename='pedidos_compras_detalle')
router.register(r'compras',                 ComprasViewSet, basename='compras')
router.register(r'compras_detalle',         ComprasDetalleViewSet, basename='compras_detalle')
router.register(r'pagos',                   PagosViewSet, basename='pagos')

# --- CTA CTE ---
router.register(r'movimientos', CuentaCorrienteMovimientoViewSet, basename='movimientos')

urlpatterns = [
    path('', include(router.urls)),
]

