from django.urls import path

from . import views

app_name = "documentos"

urlpatterns = [
    path("preview/", views.preview_index, name="preview_index"),
    path("preview/<slug:template_slug>/", views.preview_documento, name="preview"),
    path("ventas/<int:venta_id>/", views.factura_venta_html, name="factura_venta_html"),
    path("ventas/<int:venta_id>/pdf/", views.factura_venta_pdf, name="factura_venta_pdf"),
    path(
        "pedidos-ventas/<int:pedido_venta_id>/",
        views.pedido_venta_html,
        name="pedido_venta_html",
    ),
    path(
        "pedidos-ventas/<int:pedido_venta_id>/pdf/",
        views.pedido_venta_pdf,
        name="pedido_venta_pdf",
    ),
    path(
        "pedidos-compras/<int:pedido_compra_id>/",
        views.pedido_compra_html,
        name="pedido_compra_html",
    ),
    path(
        "pedidos-compras/<int:pedido_compra_id>/pdf/",
        views.pedido_compra_pdf,
        name="pedido_compra_pdf",
    ),
    path(
        "cuenta-corriente/clientes/<int:cliente_id>/",
        views.cuenta_corriente_cliente_html,
        name="cuenta_corriente_cliente_html",
    ),
    path(
        "cuenta-corriente/clientes/<int:cliente_id>/pdf/",
        views.cuenta_corriente_cliente_pdf,
        name="cuenta_corriente_cliente_pdf",
    ),
]
