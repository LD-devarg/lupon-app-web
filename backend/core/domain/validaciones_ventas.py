from rest_framework.exceptions import ValidationError

# Validaciones de la Aplicación Lupon

# =============================================================
# Validaciones Ventas
# =============================================================

# Venta no puede ser realizada si Pedido de Venta no esta aceptado y el monto es == 0

# =============================================================
# Validaciones Cambio de Estado de Ventas
# =============================================================

# Una venta pendiente puede pasar a Cancelada o Aceptada
# Una venta aceptada puede pasar a Entregada o Cancelada
# Una venta entregada no puede cambiar de estado
# Una venta cancelada no puede cambiar de estado

FLUJO_ESTADO_ENTREGA = {
    'Pendiente': ['Entregada', 'Reprogramada', 'Cancelada'],
    'Reprogramada': ['Entregada', 'Cancelada'],
    'Entregada': [],
    'Cancelada': []
}

def validar_cambio_estado_venta(venta, nuevo_estado):
   
    if nuevo_estado not in FLUJO_ESTADO_ENTREGA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")
    
    
    estado_actual = venta.estado_entrega.capitalize()
    nuevo_estado = nuevo_estado.capitalize()
    estados_permitidos = FLUJO_ESTADO_ENTREGA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos)
        raise ValidationError(f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. Los estados permitidos son: {permitidos}.")
    
    return True

# =============================================================
# Validaciones Pedidos de Venta
# =============================================================

FLUJO_ESTADO_PEDIDO_VENTA = {
    'Pendiente': ['Aceptado', 'Cancelado'],
    'Aceptado': ['Entregado', 'Cancelado'],
    'Entregado': [],
    'Cancelado': []
}

def validar_cambio_estado_pedido_venta(pedido_venta, nuevo_estado):
    estado_actual = pedido_venta.estado
    
    if nuevo_estado not in FLUJO_ESTADO_PEDIDO_VENTA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")
    
    estados_permitidos = FLUJO_ESTADO_PEDIDO_VENTA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos)
        raise ValidationError(f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. Los estados permitidos son: {permitidos}.")
    
    return True

# ==============================================================
# Validaciones Cambio de Estado de Pedidos de Venta
# ==============================================================

# Un pedido de venta pendiente puede pasar a Aceptado o Cancelado
# Un pedido de venta aceptado puede pasar a Entregado o Cancelado
# Un pedido de venta entregado no puede cambiar de estado
# Un pedido de venta cancelado no puede cambiar de estado

# =============================================================
# Validaciones Pedidos de Compras
# =============================================================

# ==============================================================
# Validaciones Cambio de Estado de Pedidos de Compras
# ==============================================================

# Un pedido de compra pendiente puede pasar a Validado o Cancelado
# Un pedido de compra validado puede pasar a Recibido o Cancelado
# Un pedido de compra recibido no puede cambiar de estado
# Un pedido de compra cancelado no puede cambiar de estado

# =============================================================
# Validaciones Compras
# =============================================================

# Una compra no puede ser realizada si Pedido de Compra no esta validado y el monto es == 0

# =============================================================
# Validaciones Cambio de Estado de Compras
# =============================================================

# Una compra pendiente puede pasar a Cancelada o Aceptada
# Una compra aceptada puede pasar a Entregada o Cancelada
# Una compra entregada no puede cambiar de estado
# Una compra cancelada no puede cambiar de estado

# =============================================================
# Validaciones Pagos y Cobros
# =============================================================

# Un pago no puede ser realizado si el monto de la compra es == 0
# Un cobro no puede ser realizado si la el monto de la venta es == 0
# No se puede aplicar mas del monto cobrado

# =============================================================
# Validaciones de Forma de Pago
# =============================================================

# Si la forma de pago es "Contado" debe tener monto_cobrado (o monto_abonado) > 0 y tener medio de pago
# si la forma de pago es "Cuenta Corriente" o "Contado Pendiente" no debe tener medio de pago y el monto_cobrado (o monto_abonado) debe ser 0



