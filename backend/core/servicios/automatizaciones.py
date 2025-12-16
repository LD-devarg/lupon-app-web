# ======================================================
# VENTAS & COBROS
# ======================================================

# ----------------------
# Estados derivados (FUENTE ÚNICA DE VERDAD)
# ----------------------

def recalcular_estado_venta(venta):
    if venta.estado_venta == 'cancelada':
        return 'cancelada'
    
    if (
        venta.estado_entrega == 'entregada' and
        venta.saldo_pendiente == 0
    ):
        return 'completada'
    
    return 'en proceso'  # venta sin pagos


def recalcular_estado_cobro(venta):
    # Prioridad absoluta: venta cancelada
    if venta.estado_venta == 'cancelada':
        return 'cancelado'
    
    if venta.saldo_pendiente == 0:
        return 'cobrado'
    
    if 0 < venta.saldo_pendiente < venta.total:
        return 'parcial'
    
    return 'pendiente'  # venta sin pagos


# ----------------------
# Automatizaciones sobre Ventas
# ----------------------

# Al crear una venta: impacta saldo del contacto y saldo pendiente
def saldos_al_crear_venta(venta):
    contacto = venta.cliente
    contacto.saldo_contacto += venta.total
    contacto.save(update_fields=['saldo_contacto'])
    
    venta.saldo_pendiente = venta.total
    venta.save(update_fields=['saldo_pendiente'])


# Al marcar una venta como entregada: completa el pedido de venta
def completar_pedido_venta_al_entregar(venta, estado_entrega):
    estado_entrega = estado_entrega.capitalize()
    
    if estado_entrega == 'Entregada':
        pedido_venta = venta.pedido_venta
        if pedido_venta and pedido_venta.estado not in ['Completado', 'Cancelado']:
            pedido_venta.estado = 'Completado'
            pedido_venta.save(update_fields=['estado'])


# Al cancelar una venta
def cancelar_venta(venta):
    # Desvincular pedido de compra si existe
    if venta.pedido_compra_id:
        venta.pedido_compra = None
        venta.save(update_fields=['pedido_compra'])
    
    # Impacto contable
    contacto = venta.cliente
    contacto.saldo_contacto -= venta.total
    contacto.save(update_fields=['saldo_contacto'])
    
    # Estados derivados
    venta.saldo_pendiente = 0
    venta.estado_venta = 'Cancelada'
    venta.estado_entrega = 'Cancelada'
    venta.estado_cobro = recalcular_estado_cobro(venta)
    venta.save(update_fields=['saldo_pendiente', 'estado_cobro', 'estado_entrega', 'estado_venta'])


# ----------------------
# Automatizaciones sobre Cobros
# ----------------------

# Al crear un cobro
def saldos_al_crear_cobro(cobro):
    contacto = cobro.cliente
    contacto.saldo_contacto -= cobro.monto
    contacto.save(update_fields=['saldo_contacto'])
    
    cobro.saldo_disponible = cobro.monto
    cobro.save(update_fields=['saldo_disponible'])


# Al aplicar un cobro a una venta
def saldos_al_crear_cobro_detalle(cobro_detalle):
    venta = cobro_detalle.venta
    cobro = cobro_detalle.cobro
    
    venta.saldo_pendiente -= cobro_detalle.monto_aplicado
    venta.save(update_fields=['saldo_pendiente'])
    
    cobro.saldo_disponible -= cobro_detalle.monto_aplicado
    cobro.save(update_fields=['saldo_disponible'])


# Recalcular estado de cobro de las ventas afectadas
def actualizar_estado_ventas_al_cobrar(cobro):
    ventas = {detalle.venta for detalle in cobro.detalles.all()}
    for venta in ventas:
        venta.estado_cobro = recalcular_estado_cobro(venta)
        venta.estado_venta = recalcular_estado_venta(venta)
        venta.save(update_fields=['estado_cobro', 'estado_venta'])


# ======================================================
# COMPRAS & PAGOS
# ======================================================

# ----------------------
# Estados derivados (FUENTE ÚNICA DE VERDAD)
# ----------------------

def recalcular_estado_pago(compra):
    if compra.estado_compra == 'Cancelada':
        return 'Cancelado'
    
    if compra.saldo_pendiente == 0:
        return 'Pagado'
    
    if 0 < compra.saldo_pendiente < compra.total:
        return 'Parcial'
    
    return 'Pendiente'  # compra sin pagos


# ----------------------
# Automatizaciones sobre Compras
# ----------------------

# Al cancelar una compra
def cancelar_compra(compra):
    proveedor = compra.proveedor
    proveedor.saldo_contacto -= compra.total
    proveedor.save(update_fields=['saldo_contacto'])
    
    compra.saldo_pendiente = 0
    compra.estado_compra = 'Cancelada'
    compra.estado_pago = recalcular_estado_pago(compra)
    compra.save(update_fields=['saldo_pendiente', 'estado_compra', 'estado_pago'])


# Al cancelar un pedido de compra: desvincular ventas
def cancelar_pedido_compra(pedido_compra):
    ventas_vinculadas = pedido_compra.ventas.all()
    for venta in ventas_vinculadas:
        venta.pedido_compra = None
        venta.save(update_fields=['pedido_compra'])


# ----------------------
# Automatizaciones sobre Pagos
# ----------------------

# Al crear un pago
def saldos_al_crear_pago(pago):
    contacto = pago.proveedor
    contacto.saldo_contacto -= pago.monto
    contacto.save(update_fields=['saldo_contacto'])
    
    pago.saldo_disponible = pago.monto
    pago.save(update_fields=['saldo_disponible'])


# Al aplicar un pago a una compra
def saldo_al_crear_pago_detalle(detalle):
    compra = detalle.compra
    pago = detalle.pago
    
    compra.saldo_pendiente -= detalle.monto_aplicado
    compra.save(update_fields=['saldo_pendiente'])
    
    pago.saldo_disponible -= detalle.monto_aplicado
    pago.save(update_fields=['saldo_disponible'])


# Recalcular estado de pago de las compras afectadas
def actualizar_estado_compras_al_pagar(pago):
    compras = {detalle.compra for detalle in pago.detalles.all()}
    for compra in compras:
        compra.estado_pago = recalcular_estado_pago(compra)
        compra.save(update_fields=['estado_pago'])
