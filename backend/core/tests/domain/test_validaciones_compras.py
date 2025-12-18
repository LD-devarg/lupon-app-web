import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_compras import (
    validar_cambio_estado_pedido_compra,
    validar_cambio_estado_compra,
    validar_compra,
    validar_pedido_compra_para_compra,
)


# =====================================================
# MOCKS SIMPLES (sin DB)
# =====================================================

class PedidoCompraMock:
    def __init__(self, estado):
        self.estado = estado


class CompraMock:
    def __init__(self, estado_compra):
        self.estado_compra = estado_compra


# =====================================================
# VALIDACIONES: PEDIDO DE COMPRA
# =====================================================

def test_pedido_pendiente_puede_validarse():
    pedido = PedidoCompraMock(estado='pendiente')
    assert validar_cambio_estado_pedido_compra(pedido, 'validado') is True


def test_pedido_validado_puede_recibirse():
    pedido = PedidoCompraMock(estado='validado')
    assert validar_cambio_estado_pedido_compra(pedido, 'recibido') is True


def test_pedido_pendiente_puede_cancelarse():
    pedido = PedidoCompraMock(estado='pendiente')
    assert validar_cambio_estado_pedido_compra(pedido, 'cancelado') is True


def test_pedido_recibido_no_puede_volver_atras():
    pedido = PedidoCompraMock(estado='recibido')
    with pytest.raises(ValidationError):
        validar_cambio_estado_pedido_compra(pedido, 'validado')


def test_pedido_cancelado_no_puede_cambiar_estado():
    pedido = PedidoCompraMock(estado='cancelado')
    with pytest.raises(ValidationError):
        validar_cambio_estado_pedido_compra(pedido, 'pendiente')


def test_estado_pedido_inexistente_lanza_error():
    pedido = PedidoCompraMock(estado='pendiente')
    with pytest.raises(ValidationError):
        validar_cambio_estado_pedido_compra(pedido, 'cualquiera')


# =====================================================
# VALIDACIONES: COMPRA
# =====================================================

def test_compra_pendiente_puede_recibirse():
    compra = CompraMock(estado_compra='pendiente')
    assert validar_cambio_estado_compra(compra, 'recibida') is True


def test_compra_pendiente_puede_cancelarse():
    compra = CompraMock(estado_compra='pendiente')
    assert validar_cambio_estado_compra(compra, 'cancelada') is True


def test_compra_recibida_no_puede_volver_atras():
    compra = CompraMock(estado_compra='recibida')
    with pytest.raises(ValidationError):
        validar_cambio_estado_compra(compra, 'pendiente')


def test_compra_cancelada_no_puede_cambiar_estado():
    compra = CompraMock(estado_compra='cancelada')
    with pytest.raises(ValidationError):
        validar_cambio_estado_compra(compra, 'recibida')


def test_estado_compra_inexistente_lanza_error():
    compra = CompraMock(estado_compra='pendiente')
    with pytest.raises(ValidationError):
        validar_cambio_estado_compra(compra, 'cualquiera')


# =====================================================
# VALIDACION: CREACION DE COMPRA
# =====================================================

def test_compra_solo_se_permite_si_pedido_esta_validado():
    pedido = PedidoCompraMock(estado='validado')
    data = {'pedido_compra': pedido}
    assert validar_pedido_compra_para_compra(pedido) is True


def test_compra_falla_si_pedido_no_esta_validado():
    pedido = PedidoCompraMock(estado='pendiente')
    data = {'pedido_compra': pedido}
    with pytest.raises(ValidationError):
        validar_pedido_compra_para_compra(pedido)
