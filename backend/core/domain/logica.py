# CALCULOS Y LOGICA DE NEGOCIO DE LUPON ADMIN

# ============================================================
# Calculo de precio de producto segun precio de compra y margen
# ============================================================

# El precio_minorista es = precio_compra + (precio_compra * 0.15)  # 15% de margen
# El precio_mayorista es = precio_compra + (precio_compra * 0.10)  # 10% de margen
# El precio_oferta es = precio_compra + (precio_compra * 0.12)  # 12% de margen

from decimal import Decimal, ROUND_HALF_UP, ROUND_CEILING

def calcular_precios_producto(precio_compra):
    def redondear_a_500(precio):
        return (precio / Decimal('500')).to_integral_value(rounding=ROUND_CEILING) * Decimal('500')

    precio_minorista = precio_compra * Decimal('1.15')
    precio_mayorista = precio_compra * Decimal('1.10')
    precio_mayorista_exclusivo = precio_compra * Decimal('1.08')  # 8% de margen
    precio_oferta = precio_compra * Decimal('1.12')
    
    return {
        'precio_mayorista_exclusivo': redondear_a_500(precio_mayorista_exclusivo),
        'precio_minorista': redondear_a_500(precio_minorista),
        'precio_mayorista': redondear_a_500(precio_mayorista),
        'precio_oferta': redondear_a_500(precio_oferta)
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
# Calculo de Monto Aplicado Total
# ============================================================

# Monto Aplicado es = a la suma de los pagos aplicados a un documento, y se hace con la data recibida pre guardar los datos por ende se 

def calcular_monto_aplicado_total(detalles_data):
    monto_aplicado_total = Decimal('0.00')
    
    for d in detalles_data:
        monto_aplicado_total += d['monto_aplicado']
    
    return monto_aplicado_total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

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

