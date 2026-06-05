from django.contrib import admin
from .models import (
    Usuarios,
    Contactos,
    Productos,
    Ventas,
    VentasDetalle,
    Cobros,
    CobrosDetalle,
)

@admin.register(Usuarios)
class UsuariosAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "nombre_completo", "es_admin", "activo")
    list_filter = ("es_admin", "activo")
    search_fields = ("user__username", "user__email", "nombre_completo")
    fieldsets = (
        (None, {
            "fields": ("user", "nombre_completo", "telefono", "es_admin", "activo")
        }),
    )

@admin.register(Contactos)
class ContactosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "tipo", "telefono", "email")
    list_filter = ("tipo", "categoria", "forma_pago")
    search_fields = ("nombre", "telefono", "email")

@admin.register(Productos)
class ProductosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "precio_compra", "precio_minorista", "precio_mayorista", "precio_oferta")
    search_fields = ("nombre",)
    list_filter = ("rubro",)

class VentasDetalleInline(admin.TabularInline):
    model = VentasDetalle
    extra = 1

@admin.register(Ventas)
class VentasAdmin(admin.ModelAdmin):
    inlines = [VentasDetalleInline]
    list_display = ("id", "cliente", "fecha_venta", "estado_venta", "total")
    search_fields = ("cliente__nombre",)
    list_filter = ("fecha_venta", "estado_venta")

class CobrosDetalleInline(admin.TabularInline):
    model = CobrosDetalle
    extra = 1

@admin.register(Cobros)
class CobrosAdmin(admin.ModelAdmin):
    inlines = [CobrosDetalleInline]
    list_display = ("id", "cliente", "fecha_cobro", "monto", "saldo_disponible")
    search_fields = ("cliente__nombre",)
    list_filter = ("fecha_cobro",)
