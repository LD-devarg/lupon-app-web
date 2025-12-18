import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_cobros import (
    validar_cobro,
    validar_actualizacion_cobro,
    validar_detalles,
)


# =====================================================
# MOCKS SIMPLES
# =====================================================

class VentaMock:
    def __init__(self, id, saldo_pendiente, estado_venta='en proceso'):
        self.id = id
        self.saldo_pendiente = saldo_pendiente
        self.estado_venta = estado_venta


class CobroMock:
    def __init__(self, monto, saldo_disponible=None):
        self.monto = monto
        self.saldo_disponible = saldo_disponible if saldo_disponible is not None else monto


# =====================================================
# HELPERS
# =====================================================

def detalle(venta, monto):
    return {
        'venta': venta,
        'monto_aplicado': monto
    }


# =====================================================
# VALIDAR COBRO (CREACIÓN)
# =====================================================

def test_cobro_con_monto_negativo_falla():
    with pytest.raises(ValidationError):
        validar_cobro({'monto': -10}, [])


def test_cobro_falla_si_aplicado_excede_monto():
    venta = VentaMock(id=1, saldo_pendiente=100)
    detalles = [detalle(venta, 60), detalle(venta, 50)]

    with pytest.raises(ValidationError):
        validar_cobro({'monto': 100}, detalles)


def test_cobro_valido_pasa():
    venta = VentaMock(id=1, saldo_pendiente=100)
    detalles = [detalle(venta, 60)]

    assert validar_cobro({'monto': 100}, detalles) is True


# =====================================================
# VALIDAR ACTUALIZACIÓN DE COBRO
# =====================================================

def test_actualizacion_cobro_falla_si_excede_disponible():
    venta = VentaMock(id=1, saldo_pendiente=100)
    cobro = CobroMock(monto=100, saldo_disponible=40)
    detalles = [detalle(venta, 50)]

    with pytest.raises(ValidationError):
        validar_actualizacion_cobro(cobro, {}, detalles)


def test_actualizacion_cobro_valida_pasa():
    venta = VentaMock(id=1, saldo_pendiente=100)
    cobro = CobroMock(monto=100, saldo_disponible=60)
    detalles = [detalle(venta, 50)]

    assert validar_actualizacion_cobro(cobro, {}, detalles) is True


# =====================================================
# VALIDAR DETALLES
# =====================================================

def test_no_se_puede_cobrar_venta_cancelada():
    venta = VentaMock(id=1, saldo_pendiente=100, estado_venta='cancelada')
    detalles = [detalle(venta, 10)]

    with pytest.raises(ValidationError):
        validar_detalles(detalles)


def test_no_se_puede_aplicar_mas_que_saldo_pendiente():
    venta = VentaMock(id=1, saldo_pendiente=50)
    detalles = [detalle(venta, 60)]

    with pytest.raises(ValidationError):
        validar_detalles(detalles)


def test_no_se_puede_aplicar_monto_cero_o_negativo():
    venta = VentaMock(id=1, saldo_pendiente=100)

    with pytest.raises(ValidationError):
        validar_detalles([detalle(venta, 0)])

    with pytest.raises(ValidationError):
        validar_detalles([detalle(venta, -10)])


def test_detalle_valido_pasa():
    venta = VentaMock(id=1, saldo_pendiente=100)
    detalles = [detalle(venta, 40)]

    assert validar_detalles(detalles) is True
