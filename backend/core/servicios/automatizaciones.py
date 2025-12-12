

# Al enviar el estado 'Entregada' en Ventas, modificar automaticamente el estado del pedido de venta a 'Completado'
def completar_pedido_venta_al_entregar(venta, estado_entrega):
    estado_entrega = estado_entrega.capitalize()
    
    if estado_entrega == 'Entregada':
        
        pedido_venta = venta.pedido_venta
        if pedido_venta and pedido_venta.estado not in ['Completado', 'Cancelado']:
            
            pedido_venta.estado = 'Completado'
            pedido_venta.save(update_fields=['estado'])
            
# Automatizaciones de saldo_contacto. Cuando se crea una venta se hace saldo_contacto += total, y el saldo_pendiente de la venta es venta.total

def saldos_al_crear_venta(venta):
    contacto = venta.cliente
    contacto.saldo_contacto += venta.total  
    contacto.save(update_fields=['saldo_contacto'])
    
    venta.saldo_pendiente = venta.total
    venta.save(update_fields=['saldo_pendiente'])
    
# Automatizaciones de saldo_contacto. Cuando se crea un cobro se hace saldo_contacto -= monto y cobro.saldo_pendiente = monto
    
def saldos_al_crear_cobro(cobro):
    contacto = cobro.cliente
    contacto.saldo_contacto -= cobro.monto
    contacto.save(update_fields=['saldo_contacto'])
    
    cobro.saldo_disponible = cobro.monto
    cobro.save(update_fields=['saldo_disponible'])
    
def saldos_al_crear_cobro_detalle(cobro_detalle):
    venta = cobro_detalle.venta
    cobro = cobro_detalle.cobro
    contacto = cobro.cliente
    
    # Actualizar saldo_contacto del contacto
    contacto.saldo_contacto -= cobro_detalle.monto_aplicado
    contacto.save(update_fields=['saldo_contacto'])
    
    # Actualizar saldo_pendiente de la venta
    venta.saldo_pendiente -= cobro_detalle.monto_aplicado
    venta.save(update_fields=['saldo_pendiente'])
    
    # Actualizar el saldo_disponible del cobro que es la suma de los montos aplicados 
    cobro.saldo_disponible -= cobro_detalle.monto_aplicado
    cobro.save(update_fields=['saldo_disponible'])
    
# Automatizaciones de saldo_contacto. Cuando se cancela una venta se hace saldo_contacto -= total
def cancelar_venta(venta):
    contacto = venta.cliente
    contacto.saldo_contacto -= venta.total
    contacto.save(update_fields=['saldo_contacto'])
    
    venta.saldo_pendiente = 0
    venta.estado_cobro = 'Cancelado'
    venta.estado_entrega = 'Cancelada'
    venta.save(update_fields=['saldo_pendiente', 'estado_cobro', 'estado_entrega'])
    
# Automatizaciones para cambios de estado de cobro para las ventas al generarse un cobro

def actualizar_estado_ventas_al_cobrar(cobro):
    ventas = {detalle.venta for detalle in cobro.detalles.all()}
    for venta in ventas:
        
        if venta.saldo_pendiente == 0:
            venta.estado_cobro = 'Cobrado'
        
        elif 0 < venta.saldo_pendiente < venta.total:
            venta.estado_cobro = 'Parcial'
        
        else:
            venta.estado_cobro = 'Pendiente'  # venta sin pagos
        
        venta.save(update_fields=['estado_cobro'])

def cancelar_compra(compra):
    proveedor = compra.proveedor
    proveedor.saldo_contacto -= compra.total
    proveedor.save(update_fields=['saldo_contacto'])
    
    compra.saldo_pendiente = 0
    compra.estado_compra = 'Cancelada'
    compra.save(update_fields=['saldo_pendiente', 'estado_compra'])