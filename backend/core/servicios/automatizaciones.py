# Al enviar el estado 'Entregada' en Ventas, modificar automaticamente el estado del pedido de venta a 'Completado'
def completar_pedido_venta_al_entregar(venta, nuevo_estado):
    if nuevo_estado == 'Entregada':
        pedido_venta = venta.pedido_venta
        if pedido_venta and pedido_venta.estado not in ['Completado', 'Cancelado']:
            
            pedido_venta.estado = 'Completado'
            pedido_venta.save(update_fields=['estado'])