from django.urls import path

from . import views

app_name = "documentos"

urlpatterns = [
    path("preview/", views.preview_index, name="preview_index"),
    path("preview/<slug:template_slug>/", views.preview_documento, name="preview"),
    path("ventas/<int:venta_id>/", views.factura_venta_html, name="factura_venta_html"),
    path("ventas/<int:venta_id>/pdf/", views.factura_venta_pdf, name="factura_venta_pdf"),
]
