from rest_framework.exceptions import ValidationError

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


from rest_framework.exceptions import ValidationError


def validar_compra(validated_data, detalles_data=None):
    """
    Validaciones de dominio para la creación de una Compra.
    """

    detalles_data = detalles_data or []
    
    # 1. Debe haber al menos un detalle
    if not detalles_data:
        raise ValidationError("La compra debe contener al menos un detalle.")

    # 2. Validar coherencia de los detalles
    for d in detalles_data:
        if d.get("cantidad", 0) <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero.")
        if d.get("precio_unitario", 0) <= 0:
            raise ValidationError("El precio unitario debe ser mayor a cero.")

    # 3. Validar pedido de compra si existe
    validar_pedido_compra_para_compra(validated_data.get("pedido_compra"))
    
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

def validar_asignacion_ventas_pedido_compra(pedido_compra, ventas):
    """
    Reglas para asignar ventas a un Pedido de Compra:
    - El pedido debe estar en estado 'pendiente' o 'validado'
    - No se pueden asignar ventas a un pedido 'recibido' o 'cancelado'
    - Las ventas:
        - no deben estar canceladas
        - no deben tener ya un pedido_compra distinto asignado
    """

    estado_pedido = pedido_compra.estado.lower()

    if estado_pedido not in ['pendiente', 'validado']:
        raise ValidationError(
            f"No se pueden asignar ventas a un Pedido de Compra en estado '{estado_pedido}'."
        )

    for venta in ventas:
        # Venta cancelada
        if venta.estado_venta == 'cancelada':
            raise ValidationError(
                f"La venta ID {venta.id} está cancelada y no puede asociarse a un Pedido de Compra."
            )

        # Venta ya asociada a otro pedido de compra
        if venta.pedido_compra and venta.pedido_compra != pedido_compra:
            raise ValidationError(
                f"La venta ID {venta.id} ya está asociada al Pedido de Compra"
            )

    return True

def validar_pedido_compra_para_compra(pedido_compra):
    if not pedido_compra:
        return True

    estado = pedido_compra.estado.lower()
    if estado != 'validado':
        raise ValidationError(
            "La compra solo puede realizarse si el Pedido de Compra está en estado 'validado'."
        )

    return True