from rest_framework.exceptions import ValidationError
from .logica import calcular_monto_aplicado_total


# =====================================================
# VALIDAR PAGO (CREACIÓN)
# =====================================================

def validar_pago(validated_data, detalles_data):
    """
    Valida la creación de un pago.
    - Monto positivo
    - No se aplica más que el monto del pago
    """
    monto = validated_data['monto']

    if monto < 0:
        raise ValidationError("El monto del pago debe ser un valor positivo.")

    if calcular_monto_aplicado_total(detalles_data) > monto:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el monto del pago."
        )

    validar_detalles(detalles_data)
    return True


# =====================================================
# VALIDAR ACTUALIZACIÓN DE PAGO
# =====================================================

def validar_actualizacion_pago(pago, validated_data, detalles_data):
    """
    Valida la actualización de un pago existente.
    - No se puede aplicar más que el saldo disponible
    """
    monto_disponible = pago.saldo_disponible

    if calcular_monto_aplicado_total(detalles_data) > monto_disponible:
        raise ValidationError(
            "La suma de los montos aplicados no puede exceder el saldo disponible."
        )

    validar_detalles(detalles_data)
    return True


# =====================================================
# VALIDAR DETALLES DE PAGO
# =====================================================

def validar_detalles(detalles_data):
    """
    Valida cada detalle de pago.
    Contrato esperado del objeto compra:
    - estado_compra
    - saldo_pendiente
    - id (opcional)
    """

    for d in detalles_data:
        compra = d['compra']
        monto = d['monto_aplicado']

        # No se paga una compra cancelada
        if compra.estado_compra.lower() == 'cancelada':
            raise ValidationError(
                f"La compra con ID {getattr(compra, 'id', 'desconocido')} "
                f"está cancelada y no puede recibir pagos."
            )

        # No se puede aplicar más que el saldo pendiente
        if monto > compra.saldo_pendiente:
            raise ValidationError(
                "El monto aplicado excede el saldo pendiente de la compra."
            )

        # No se permiten montos inválidos
        if monto <= 0:
            raise ValidationError(
                "El monto aplicado debe ser un valor positivo."
            )

    return True
