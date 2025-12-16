import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_ventas import validar_cambio_estado_venta


# Mock simple, no usamos el modelo real
class VentaMock:
    def __init__(self, estado_venta):
        self.estado_venta = estado_venta


# -------------------------
# CASOS VÁLIDOS
# -------------------------

def test_venta_en_proceso_puede_cancelarse():
    venta = VentaMock(estado_venta='en proceso')
    assert validar_cambio_estado_venta(venta, 'cancelada') is True


# -------------------------
# CASOS INVÁLIDOS
# -------------------------

def test_venta_no_puede_completarse_manual():
    venta = VentaMock(estado_venta='en proceso')
    with pytest.raises(ValidationError):
        validar_cambio_estado_venta(venta, 'completada')


def test_venta_cancelada_no_puede_cambiar_estado():
    venta = VentaMock(estado_venta='cancelada')
    with pytest.raises(ValidationError):
        validar_cambio_estado_venta(venta, 'en proceso')


def test_venta_completada_no_puede_cancelarse():
    venta = VentaMock(estado_venta='completada')
    with pytest.raises(ValidationError):
        validar_cambio_estado_venta(venta, 'cancelada')


def test_estado_inexistente_lanza_error():
    venta = VentaMock(estado_venta='en proceso')
    with pytest.raises(ValidationError):
        validar_cambio_estado_venta(venta, 'cualquiera')
