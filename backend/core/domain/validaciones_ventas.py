from rest_framework.exceptions import ValidationError

# Validaciones de la Aplicación Lupon

# =============================================================
# Validaciones Ventas
# =============================================================

# Venta no puede ser realizada si Pedido de Venta no esta aceptado o el subtotal es == 0

def validar_venta(validated_data):
    
    pedido_venta = validated_data.get('pedido_venta')

    if pedido_venta:
        
        if pedido_venta.estado.lower() != 'aceptado':
            raise ValidationError("No se puede realizar una venta si el pedido de venta no está aceptado.")

        if pedido_venta.subtotal == 0:
            raise ValidationError("No se puede realizar una venta si el pedido de venta tiene subtotal igual a 0.")
    
    return True

# =============================================================
# Validaciones Cambio de Estado de Ventas
# =============================================================

# Una venta pendiente puede pasar a Cancelada o Aceptada
# Una venta aceptada puede pasar a Entregada o Cancelada
# Una venta entregada no puede cambiar de estado
# Una venta cancelada no puede cambiar de estado

FLUJO_ESTADO_VENTA = {
    'en proceso': ['cancelada'],
    'cancelada': [],
    'completada': []
}

def validar_cambio_estado_venta(venta, nuevo_estado):
    nuevo_estado = nuevo_estado.lower()
    estado_actual = venta.estado_venta.lower()

    if nuevo_estado not in FLUJO_ESTADO_VENTA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")

    estados_permitidos = FLUJO_ESTADO_VENTA.get(estado_actual, [])

    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos) or 'ninguno'
        raise ValidationError(
            f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. "
            f"Estados permitidos: {permitidos}."
        )

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
    estado_actual = estado_actual.capitalize()
    nuevo_estado = nuevo_estado.capitalize()
    
    if nuevo_estado not in FLUJO_ESTADO_PEDIDO_VENTA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")
    
    estados_permitidos = FLUJO_ESTADO_PEDIDO_VENTA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos)
        raise ValidationError(f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. Los estados permitidos son: {permitidos}.")
    
    return True

FLUJO_ESTADO_ENTREGA = {
    'pendiente': ['entregada', 'reprogramada'],
    'reprogramada': ['entregada', 'reprogramada'],
    'entregada': []
}

def validar_cambio_estado_entrega(venta, nuevo_estado):

    nuevo_estado = nuevo_estado.lower()
    estado_actual = venta.estado_entrega.lower()

    # Estado no permitido manualmente
    if nuevo_estado == 'cancelada':
        raise ValidationError(
            "El estado 'cancelada' no puede seleccionarse manualmente. "
            "La entrega se cancela automáticamente al cancelar la venta."
        )

    # Validar que el estado exista en el flujo
    if estado_actual not in FLUJO_ESTADO_ENTREGA:
        raise ValidationError(
            f"Estado de entrega actual inválido: '{estado_actual}'."
        )

    estados_permitidos = FLUJO_ESTADO_ENTREGA[estado_actual]

    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos) or 'ninguno'
        raise ValidationError(
            f"No se puede cambiar el estado de entrega de '{estado_actual}' a '{nuevo_estado}'. "
            f"Estados permitidos: {permitidos}."
        )

    return True