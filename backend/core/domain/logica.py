# CALCULOS Y LOGICA DE NEGOCIO DE LUPON ADMIN

# ============================================================
# Calculo de precio de producto segun precio de compra y margen
# ============================================================

# El precio_minorista es = precio_compra + (precio_compra * 0.15)  # 15% de margen
# El precio_mayorista es = precio_compra + (precio_compra * 0.10)  # 10% de margen
# El precio_oferta es = precio_compra + (precio_compra * 0.12)  # 12% de margen

from decimal import Decimal, ROUND_HALF_UP

def calcular_precios_producto(precio_compra):
    precio_minorista = precio_compra * Decimal('1.15')
    precio_mayorista = precio_compra * Decimal('1.10')
    precio_oferta = precio_compra * Decimal('1.12')
    
    return {
        'precio_minorista': round(precio_minorista, 2),
        'precio_mayorista': round(precio_mayorista, 2),
        'precio_oferta': round(precio_oferta, 2)
    }

#============================================================
# Calculo de Subtotal
#============================================================

# Subtotal es = a la suma de (cantidad * precio_unitario) de cada producto en el pedido

def calcular_subtotal(detalles):
    subtotal = Decimal('0.00')
    
    for detalle in detalles:
        subtotal += detalle.cantidad * detalle.precio_unitario
    
    return subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# ============================================================
# Calculo de Total
# ============================================================

# Total en Ventas es = a Subtotal + costo_entrega + extra - descuento, por lo tanto el extra no existe en Pedidos de Venta, mientras que el costo_entrega no existe en Compras pero si el extra.

def calcular_total(subtotal=Decimal('0.00'), costo_entrega=None, extra=None, descuento=None):
    
    costo_entrega = Decimal(costo_entrega or 0)
    extra = Decimal(extra or 0)
    descuento = Decimal(descuento or 0)
    
    total = Decimal(subtotal) + costo_entrega + extra - descuento
    return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# Total en Compras es = a Subtotal + extra - descuento

# ============================================================
# Calculo de Saldo Pendiente
# ============================================================

# Saldo Pendiente es = monto - monto_aplicado

# ============================================================
# Calculo de Monto Aplicado
# ============================================================

# Monto Aplicado es = a la suma de los pagos aplicados a un documento

# ============================================================
# Calculo de Fecha de Vencimiento
# ============================================================

# Fecha de Vencimiento de venta es = a la fecha_venta + cliente.dias_cc
# Fecha de Vencimiento de compra es = a la fecha_compra + proveedor.dias_cc
# Dias de Vencimiento es la diferencia en dias entre la fecha actual y la fecha de vencimiento

# ============================================================
# Calculo para Pedido de Compras proviniente de varias Ventas
# ============================================================

# Los productos en el Pedido de Compras son la lista de productos unicos de todas las Ventas seleccionadas
# La cantidad de cada producto en el Pedido de Compras es la suma de las cantidades de ese producto en todas las Ventas seleccionadas

