from django.core.exceptions import ValidationError
from core.models import Compras
from .logica import calcular_monto_aplicado_total


def validar_pago(validated_data, detalles_data):
    if validated_data['monto'] < 0:
        raise ValidationError("El monto del pago debe ser un valor positivo.")

    if calcular_monto_aplicado_total(detalles_data) > validated_data['monto']:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el monto del pago."
        )

    validar_detalles(detalles_data)
    return True


def validar_actualizacion_pago(pago, validated_data, detalles_data):
    monto_base = pago.saldo_disponible

    if calcular_monto_aplicado_total(detalles_data) > monto_base:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el saldo disponible."
        )

    validar_detalles(detalles_data)
    return True


def validar_detalles(detalles_data):
    compra_ids = list({
        d['compra'].id if isinstance(d['compra'], Compras) else d['compra']
        for d in detalles_data
    })

    compras = {
        c.id: c for c in Compras.objects.filter(id__in=compra_ids)
    }

    for d in detalles_data:
        compra_id = d['compra'].id if isinstance(d['compra'], Compras) else d['compra']
        compra = compras.get(compra_id)

        if compra.estado_compra.lower() == 'cancelada':
            raise ValidationError(
                f"La compra con ID {compra.id} está cancelada y no puede recibir pagos."
            )

        if d['monto_aplicado'] > compra.saldo_pendiente:
            raise ValidationError(
                f"El monto aplicado para la compra con ID {compra.id} excede su saldo pendiente."
            )

        if d['monto_aplicado'] <= 0:
            raise ValidationError(
                f"El monto aplicado para la compra con ID {compra.id} debe ser positivo."
            )

    return True
