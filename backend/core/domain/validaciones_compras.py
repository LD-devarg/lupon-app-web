from rest_framework.exceptions import ValidationError


def validar_compra(validated_data, detalles_data=None):
    detalles_data = detalles_data or []

    if not detalles_data:
        extra = validated_data.get("extra", 0)
        if not extra or extra <= 0:
            raise ValidationError("La compra debe contener al menos un detalle o un monto extra positivo (gasto).")
        return True

    for d in detalles_data:
        if d.get("cantidad", 0) <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero.")
        if d.get("precio_unitario", 0) <= 0:
            raise ValidationError("El precio unitario debe ser mayor a cero.")

    return True


FLUJO_ESTADOS_COMPRA = {
    'pendiente': ['recibida', 'cancelada'],
    'recibida':  [],
    'cancelada': [],
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
