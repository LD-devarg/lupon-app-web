from django.contrib import admin
from .models import (
    Usuarios,
    Contactos,
    Productos,
    PedidosVentas,
    PedidosVentasDetalle,
    Ventas,
    VentasDetalle
)

# ============================================================
# USUARIOS
# ============================================================

# Permitir la administración de Usuarios en el admin de Django
@admin.register(Usuarios)
class UsuariosAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "nombre_completo", "es_admin", "activo")
    list_filter = ("es_admin", "activo")
    search_fields = ("user__username", "user__email", "nombre_completo")
    
    # Personalizar la edición de usuarios
    fieldsets = (
        (None, {
            "fields": ("user", "nombre_completo", "telefono", "es_admin", "activo")
        }),
    )
    

# ============================================================
# CONTACTOS
# ============================================================

@admin.register(Contactos)
class ContactosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "tipo", "telefono", "email")
    list_filter = ("tipo", "categoria", "forma_pago")
    search_fields = ("nombre", "telefono", "email")

# ============================================================
# PRODUCTOS
# ============================================================

@admin.register(Productos)
class ProductosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "precio_compra", "precio_minorista", "precio_mayorista", "precio_oferta")
    search_fields = ("nombre",)
    list_filter = ("rubro",)
    
# ============================================================
# PEDIDOS DE VENTAS, con sus detalles
# ============================================================

class PedidosVentasDetalleInline(admin.TabularInline):
    model = PedidosVentasDetalle
    extra = 1

@admin.register(PedidosVentas)
class PedidosVentasAdmin(admin.ModelAdmin):
    inlines = [PedidosVentasDetalleInline]
    list_display = ("id", "cliente", "fecha_pedido", "subtotal")
    search_fields = ("cliente__nombre",)
    list_filter = ("fecha_pedido",)


class VentasDetalleInline(admin.TabularInline):
    model = VentasDetalle
    extra = 1

@admin.register(Ventas)
class VentasAdmin(admin.ModelAdmin):
    inlines = [VentasDetalleInline]
    list_display = ("id", "pedido_venta", "fecha_venta", "total")
    search_fields = ("pedido_venta__cliente__nombre",)
    list_filter = ("fecha_venta",)