from django.contrib import admin
from .models import (
    Contactos,
    Productos,
    PedidosVentas,
    PedidosVentasDetalle,
    Ventas,
    Cobros,
    PedidosCompras,
    PedidosComprasDetalle,
    Compras,
    ComprasDetalle,
    Pagos,
    CuentaCorrienteMovimiento
)

# ============================================================
# CONTACTOS
# ============================================================

@admin.register(Contactos)
class ContactosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "tipo", "telefono", "email")
    list_filter = ("tipo",)
    search_fields = ("nombre", "telefono", "email")


# ============================================================
# PRODUCTOS
# ============================================================

@admin.register(Productos)
class ProductosAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "rubro", "precio", "activo", "es_oferta")
    list_filter = ("rubro", "activo", "es_oferta")
    search_fields = ("nombre",)
    list_editable = ("precio", "activo")


# ============================================================
# PEDIDOS DE VENTAS
# ============================================================

class PedidosVentasDetalleInline(admin.TabularInline):
    model = PedidosVentasDetalle
    extra = 0

@admin.register(PedidosVentas)
class PedidosVentasAdmin(admin.ModelAdmin):
    list_display = ("id", "cliente", "fecha_pedido", "estado")
    list_filter = ("estado", "fecha_pedido")
    search_fields = ("cliente__nombre",)
    inlines = [PedidosVentasDetalleInline]


@admin.register(PedidosVentasDetalle)
class PedidosVentasDetalleAdmin(admin.ModelAdmin):
    list_display = ("id", "pedido", "producto", "cantidad", "precio_unitario")
    search_fields = ("pedido__id", "producto__nombre")


# ============================================================
# VENTAS
# ============================================================

@admin.register(Ventas)
class VentasAdmin(admin.ModelAdmin):
    list_display = ("id", "pedido", "fecha_venta", "total", "forma_pago")
    list_filter = ("forma_pago", "fecha_venta")
    search_fields = ("pedido__id", "pedido__cliente__nombre")


@admin.register(Cobros)
class CobrosAdmin(admin.ModelAdmin):
    list_display = ("id", "cliente", "fecha_cobro", "importe", "medio_pago")
    list_filter = ("medio_pago", "fecha_cobro")
    search_fields = ("cliente__nombre",)


# ============================================================
# PEDIDOS DE COMPRAS
# ============================================================

class PedidosComprasDetalleInline(admin.TabularInline):
    model = PedidosComprasDetalle
    extra = 0

@admin.register(PedidosCompras)
class PedidosComprasAdmin(admin.ModelAdmin):
    list_display = ("id", "proveedor", "fecha_pedido", "cerrado")
    list_filter = ("cerrado", "fecha_pedido")
    search_fields = ("proveedor__nombre",)
    inlines = [PedidosComprasDetalleInline]


@admin.register(PedidosComprasDetalle)
class PedidosComprasDetalleAdmin(admin.ModelAdmin):
    list_display = ("id", "pedido", "producto", "cantidad_total", "rubro")
    search_fields = ("pedido__id", "producto__nombre")


# ============================================================
# COMPRAS
# ============================================================

class ComprasDetalleInline(admin.TabularInline):
    model = ComprasDetalle
    extra = 0

@admin.register(Compras)
class ComprasAdmin(admin.ModelAdmin):
    list_display = ("id", "proveedor", "fecha_compra", "total", "forma_pago")
    list_filter = ("forma_pago", "fecha_compra")
    search_fields = ("proveedor__nombre",)
    inlines = [ComprasDetalleInline]


@admin.register(ComprasDetalle)
class ComprasDetalleAdmin(admin.ModelAdmin):
    list_display = ("id", "compra", "producto", "cantidad", "precio_unitario")
    search_fields = ("compra__id", "producto__nombre")


# ============================================================
# PAGOS
# ============================================================

@admin.register(Pagos)
class PagosAdmin(admin.ModelAdmin):
    list_display = ("id", "proveedor", "fecha_pago", "importe", "medio_pago")
    list_filter = ("medio_pago", "fecha_pago")
    search_fields = ("proveedor__nombre",)


# ============================================================
# CUENTA CORRIENTE
# ============================================================

@admin.register(CuentaCorrienteMovimiento)
class CuentaCorrienteMovimientoAdmin(admin.ModelAdmin):
    list_display = ("id", "contacto", "fecha", "tipo", "monto", "detalle")
    list_filter = ("tipo", "fecha")
    search_fields = ("contacto__nombre", "detalle")
