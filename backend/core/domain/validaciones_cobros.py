from django.core.exceptions import ValidationError
from core.models import Ventas
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
    # El disponible real es el del modelo, no el que venga del front
    monto_disponible = cobro.saldo_disponible

    if calcular_monto_aplicado_total(detalles_data) > monto_disponible:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el saldo disponible."
        )

    validar_detalles(detalles_data)
    return True


def validar_detalles(detalles_data):
    venta_ids = list({
        d['venta'].id if isinstance(d['venta'], Ventas) else d['venta']
        for d in detalles_data
    })

    ventas = {
        v.id: v for v in Ventas.objects.filter(id__in=venta_ids)
    }

    for d in detalles_data:
        venta_id = d['venta'].id if isinstance(d['venta'], Ventas) else d['venta']
        venta = ventas.get(venta_id)

        if venta.estado_venta.lower() == 'cancelada':
            raise ValidationError(
                f"La venta con ID {venta.id} está cancelada y no puede recibir cobros."
            )

        if d['monto_aplicado'] > venta.saldo_pendiente:
            raise ValidationError(
                f"El monto aplicado para la venta con ID {venta.id} excede su saldo pendiente."
            )

        if d['monto_aplicado'] <= 0:
            raise ValidationError(
                f"El monto aplicado para la venta con ID {venta.id} debe ser positivo."
            )

    return True
