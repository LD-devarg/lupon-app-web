from django.core.exceptions import ValidationError

FLUJO_ESTADOS_PEDIDO_COMPRA = {
    'pendiente': ['validado', 'cancelado'],
    'validado': ['recibido', 'cancelado'],
    'recibido': [],
    'cancelado': []
}


def validar_cambio_estado_pedido_compra(pedido_compra, nuevo_estado):
    estado_actual = pedido_compra.estado.lower()
    nuevo_estado = nuevo_estado.lower()

    if nuevo_estado not in FLUJO_ESTADOS_PEDIDO_COMPRA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")

    estados_permitidos = FLUJO_ESTADOS_PEDIDO_COMPRA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos) or 'ninguno'
        raise ValidationError(
            f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. "
            f"Estados permitidos: {permitidos}."
        )

    return True


def validar_modificacion_pedido_compra(pedido_compra):
    estado = pedido_compra.estado.lower()

    if estado in ['recibido', 'cancelado']:
        raise ValidationError(
            "No se puede modificar un Pedido de Compra que esté Recibido o Cancelado."
        )

    if estado == 'validado':
        raise ValidationError(
            "No se pueden modificar los detalles de un Pedido de Compra en estado 'validado'."
        )

    return True


def validar_compra(validated_data):
    pedido_compra = validated_data.get('pedido_compra')

    if not pedido_compra:
        return True

    if pedido_compra.estado.lower() != 'validado':
        raise ValidationError(
            "La compra solo puede realizarse si el Pedido de Compra está en estado 'validado'."
        )

    return True


FLUJO_ESTADOS_COMPRA = {
    'pendiente': ['recibida', 'cancelada'],
    'recibida': [],
    'cancelada': []
}


def validar_cambio_estado_compra(compra, nuevo_estado):
    estado_actual = compra.estado_compra.lower()
    nuevo_estado = nuevo_estado.lower()

    if nuevo_estado not in FLUJO_ESTADOS_COMPRA:
        raise ValidationError(f"El estado '{nuevo_estado}' no es válido.")

    estados_permitidos = FLUJO_ESTADOS_COMPRA[estado_actual]
    if nuevo_estado not in estados_permitidos:
        permitidos = ', '.join(estados_permitidos) or 'ninguno'
        raise ValidationError(
            f"No se puede cambiar el estado de '{estado_actual}' a '{nuevo_estado}'. "
            f"Estados permitidos: {permitidos}."
        )

    return True
