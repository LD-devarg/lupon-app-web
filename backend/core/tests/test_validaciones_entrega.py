import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_ventas import validar_cambio_estado_entrega


# Mock simple, no usamos el modelo real
class VentaMock:
    def __init__(self, estado_entrega):
        self.estado_entrega = estado_entrega


# =====================================================
# CASOS VÁLIDOS
# =====================================================

def test_entrega_pendiente_puede_reprogramarse():
    venta = VentaMock(estado_entrega='pendiente')
    assert validar_cambio_estado_entrega(venta, 'reprogramada') is True


def test_entrega_pendiente_puede_entregarse():
    venta = VentaMock(estado_entrega='pendiente')
    assert validar_cambio_estado_entrega(venta, 'entregada') is True


def test_entrega_reprogramada_puede_reprogramarse_de_nuevo():
    venta = VentaMock(estado_entrega='reprogramada')
    assert validar_cambio_estado_entrega(venta, 'reprogramada') is True


def test_entrega_reprogramada_puede_entregarse():
    venta = VentaMock(estado_entrega='reprogramada')
    assert validar_cambio_estado_entrega(venta, 'entregada') is True


# =====================================================
# CASOS INVÁLIDOS
# =====================================================

def test_entrega_entregada_no_puede_volver_atras():
    venta = VentaMock(estado_entrega='entregada')
    with pytest.raises(ValidationError):
        validar_cambio_estado_entrega(venta, 'pendiente')


def test_entrega_entregada_no_puede_reprogramarse():
    venta = VentaMock(estado_entrega='entregada')
    with pytest.raises(ValidationError):
        validar_cambio_estado_entrega(venta, 'reprogramada')


def test_entrega_no_puede_cancelarse_manualmente():
    venta = VentaMock(estado_entrega='pendiente')
    with pytest.raises(ValidationError):
        validar_cambio_estado_entrega(venta, 'cancelada')


def test_estado_entrega_inexistente_lanza_error():
    venta = VentaMock(estado_entrega='pendiente')
    with pytest.raises(ValidationError):
        validar_cambio_estado_entrega(venta, 'cualquiera')
