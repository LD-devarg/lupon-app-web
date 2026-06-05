from rest_framework.exceptions import ValidationError


def validar_venta(validated_data):
    return True


def validar_venta_detalles(detalles):
    if not detalles or len(detalles) == 0:
        raise ValidationError("La venta debe tener al menos un detalle.")

    for d in detalles:
        if d.get("cantidad", 0) <= 0:
            raise ValidationError("La cantidad de un detalle de venta debe ser mayor a 0.")
        if d.get("precio_unitario", 0) < 0:
            raise ValidationError("El precio unitario de un detalle de venta no puede ser negativo.")
    return True


FLUJO_ESTADO_VENTA = {
    'pendiente':  ['confirmada', 'cancelada'],
    'confirmada': ['en_camino', 'cancelada'],
    'en_camino':  ['entregada', 'cancelada'],
    'entregada':  [],
    'cancelada':  [],
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
