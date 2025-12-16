import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_pagos import (
    validar_pago,
    validar_actualizacion_pago,
    validar_detalles,
)


# =====================================================
# MOCKS SIMPLES (dominio puro)
# =====================================================

class CompraMock:
    def __init__(self, id, saldo_pendiente, estado_compra='pendiente'):
        self.id = id
        self.saldo_pendiente = saldo_pendiente
        self.estado_compra = estado_compra


class PagoMock:
    def __init__(self, monto, saldo_disponible=None):
        self.monto = monto
        self.saldo_disponible = saldo_disponible if saldo_disponible is not None else monto


# =====================================================
# HELPERS
# =====================================================

def detalle(compra, monto):
    return {
        'compra': compra,
        'monto_aplicado': monto
    }


# =====================================================
# VALIDAR PAGO (CREACIÓN)
# =====================================================

def test_pago_con_monto_negativo_falla():
    with pytest.raises(ValidationError):
        validar_pago({'monto': -10}, [])


def test_pago_falla_si_aplicado_excede_monto():
    compra = CompraMock(id=1, saldo_pendiente=100)
    detalles = [detalle(compra, 60), detalle(compra, 50)]

    with pytest.raises(ValidationError):
        validar_pago({'monto': 100}, detalles)


def test_pago_valido_pasa():
    compra = CompraMock(id=1, saldo_pendiente=100)
    detalles = [detalle(compra, 60)]

    assert validar_pago({'monto': 100}, detalles) is True


# =====================================================
# VALIDAR ACTUALIZACIÓN DE PAGO
# =====================================================

def test_actualizacion_pago_falla_si_excede_disponible():
    compra = CompraMock(id=1, saldo_pendiente=100)
    pago = PagoMock(monto=100, saldo_disponible=40)
    detalles = [detalle(compra, 50)]

    with pytest.raises(ValidationError):
        validar_actualizacion_pago(pago, {}, detalles)


def test_actualizacion_pago_valida_pasa():
    compra = CompraMock(id=1, saldo_pendiente=100)
    pago = PagoMock(monto=100, saldo_disponible=60)
    detalles = [detalle(compra, 50)]

    assert validar_actualizacion_pago(pago, {}, detalles) is True


# =====================================================
# VALIDAR DETALLES
# =====================================================

def test_no_se_puede_pagar_compra_cancelada():
    compra = CompraMock(id=1, saldo_pendiente=100, estado_compra='cancelada')
    detalles = [detalle(compra, 10)]

    with pytest.raises(ValidationError):
        validar_detalles(detalles)


def test_no_se_puede_aplicar_mas_que_saldo_pendiente():
    compra = CompraMock(id=1, saldo_pendiente=50)
    detalles = [detalle(compra, 60)]

    with pytest.raises(ValidationError):
        validar_detalles(detalles)


def test_no_se_puede_aplicar_monto_cero_o_negativo():
    compra = CompraMock(id=1, saldo_pendiente=100)

    with pytest.raises(ValidationError):
        validar_detalles([detalle(compra, 0)])

    with pytest.raises(ValidationError):
        validar_detalles([detalle(compra, -10)])


def test_detalle_pago_valido_pasa():
    compra = CompraMock(id=1, saldo_pendiente=100)
    detalles = [detalle(compra, 40)]

    assert validar_detalles(detalles) is True
