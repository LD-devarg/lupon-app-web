from rest_framework.exceptions import ValidationError
from .logica import calcular_monto_aplicado_total


def validar_cobro(validated_data, detalles_data):
    if validated_data['monto'] < 0:
        raise ValidationError("El monto del cobro debe ser un valor positivo.")

    if calcular_monto_aplicado_total(detalles_data) > validated_data['monto']:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el monto del cobro."
        )

    validar_detalles(detalles_data)
    return True


def validar_actualizacion_cobro(cobro, validated_data, detalles_data):
    monto_disponible = cobro.saldo_disponible

    if calcular_monto_aplicado_total(detalles_data) > monto_disponible:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el saldo disponible."
        )

    validar_detalles(detalles_data)
    return True


def validar_detalles(detalles_data):
    for d in detalles_data:
        venta = d['venta']
        monto = d['monto_aplicado']

        # Contrato mínimo esperado del objeto venta
        if venta.estado_venta.lower() == 'cancelada':
            raise ValidationError(
                f"La venta con ID {getattr(venta, 'id', 'desconocido')} "
                f"está cancelada y no puede recibir cobros."
            )

        if monto > venta.saldo_pendiente:
            raise ValidationError(
                f"El monto aplicado excede el saldo pendiente de la venta."
            )

        if monto <= 0:
            raise ValidationError(
                "El monto aplicado debe ser un valor positivo."
            )

    return True
