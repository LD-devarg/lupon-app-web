# Validaciones para el modelo de Compras y Pedidos de Compra

# Una compra no puede ser realizada si Pedido de Compra no esta validado
# Una compra no puede ser recibida si su estado no es Validado
# Una compra no puede ser cancelada si su estado es Recibido
# Una compra no puede ser modificada si su estado es Recibido o Cancelado
# Al completar una compra, el estado del pedido de compra asociado debe actualizarse a Recibido si no está Cancelado

from django.core.exceptions import ValidationError
from core.models import PedidosCompras, Compras

FLUJO_ESTADOS_PEDIDO_COMPRA = {
    'Pendiente': ['Validado', 'Cancelado'],
    'Validado': ['Recibido', 'Cancelado'],
    'Recibido': [],
    'Cancelado': []
}


def validar_cambio_estado_pedido_compra(pedido_compra, nuevo_estado):
    estado_actual = pedido_compra.estado
    estado_actual = estado_actual.capitalize()
    nuevo_estado = nuevo_estado.capitalize()
    
    if nuevo_estado not in FLUJO_ESTADOS_PEDIDO_COMPRA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")
    
    estados_permitidos = FLUJO_ESTADOS_PEDIDO_COMPRA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos)
        raise ValidationError(f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. Los estados permitidos son: {permitidos}.")
    
    return True

def validar_modificacion_pedido_compra(pedido_compra):
    estado = pedido_compra.estado

    # No se puede modificar si está Recibido o Cancelado
    if estado in ['Recibido', 'Cancelado']:
        raise ValidationError(f"No se puede modificar un Pedido de Compra que esté en estado {estado}.")
    
    # Si el estado está en 'Validado' solo se puede cambiar el estado, no los detalles
    if estado == 'Validado':
        raise ValidationError("No se pueden modificar los detalles de un Pedido de Compra en estado 'Validado'.")
    
    # Si el estado está en 'Pendiente', puedes modificar detalles y estado
    if estado == 'Pendiente':
        return True

    return True



def validar_compra(validated_data):
    pedido_compra = validated_data.get('pedido_compra')

    # Validar que el pedido de compra esté validado para realizar la compra

    if pedido_compra.estado != 'Validado':
        raise ValidationError("La compra solo puede ser realizada si el Pedido de Compra está en estado 'Validado'.")
    
    return True


FLUJO_ESTADOS_COMPRA = {
    'Pendiente': ['Recibida', 'Cancelada'],
    'Recibida': [],
    'Cancelada': []
}

def validar_cambio_estado_compra(compra, nuevo_estado):
    estado_actual = compra.estado_compra
    estado_actual = estado_actual.capitalize()
    nuevo_estado = nuevo_estado.capitalize()
    
    if nuevo_estado not in FLUJO_ESTADOS_COMPRA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")
    
    estados_permitidos = FLUJO_ESTADOS_COMPRA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos)
        raise ValidationError(f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. Los estados permitidos son: {permitidos}.")
    
    return True
