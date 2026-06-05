from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuariosViewSet,
    ContactosViewSet,
    ProductosViewSet,
    VentasViewSet,
    VentasDetalleViewSet,
    CobrosViewSet,
    CobrosDetalleViewSet,
    ComprasViewSet,
    ComprasDetalleViewSet,
    PagosViewSet,
    PagosDetalleViewSet,
    NotasCreditoViewSet,
    DashboardView,
)

router = DefaultRouter()

router.register(r'usuarios', UsuariosViewSet, basename='usuarios')
router.register(r'contactos', ContactosViewSet, basename='contactos')
router.register(r'productos', ProductosViewSet, basename='productos')

router.register(r'ventas', VentasViewSet, basename='ventas')
router.register(r'ventas-detalle', VentasDetalleViewSet, basename='ventas-detalle')

router.register(r'cobros', CobrosViewSet, basename='cobros')
router.register(r'cobros-detalle', CobrosDetalleViewSet, basename='cobros-detalle')

router.register(r'compras', ComprasViewSet, basename='compras')
router.register(r'compras-detalle', ComprasDetalleViewSet, basename='compras-detalle')

router.register(r'pagos', PagosViewSet, basename='pagos')
router.register(r'pagos-detalle', PagosDetalleViewSet, basename='pagos-detalle')

router.register(r'notas-credito', NotasCreditoViewSet, basename='notas-credito')

urlpatterns = [
    path('dashboard/', DashboardView.as_view()),
    path('', include(router.urls)),
]
