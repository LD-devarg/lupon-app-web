from rest_framework.exceptions import ValidationError
from .logica import calcular_monto_aplicado_total


def validar_cobro(validated_data, detalles_data):
    monto = validated_data["monto"]

    if monto <= 0:
        raise ValidationError("El monto del cobro debe ser positivo.")

    if calcular_monto_aplicado_total(detalles_data) > monto:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el monto del cobro."
        )

    validar_detalles_cobro(detalles_data)
    return True


def validar_actualizacion_cobro(cobro, validated_data, detalles_data):
    monto_disponible = cobro.saldo_disponible

    if calcular_monto_aplicado_total(detalles_data) > monto_disponible:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el saldo disponible."
        )

    validar_detalles_cobro(detalles_data)
    return True


def validar_detalles_cobro(detalles_data):
    if detalles_data == []:
        raise ValidationError("Debe haber al menos un detalle de cobro.")
    
    for d in detalles_data:
        venta = d["venta"]
        monto = d["monto_aplicado"]

        if venta.estado_venta == "cancelada":
            raise ValidationError(
                f"La venta con ID {venta.id} está cancelada y no puede cobrarse."
            )

        if monto <= 0:
            raise ValidationError(
                "El monto aplicado debe ser mayor a cero."
            )

        if monto > venta.saldo_pendiente:
            raise ValidationError(
                "El monto aplicado excede el saldo pendiente de la venta."
            )

    return True
