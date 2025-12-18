import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_compras import validar_compra


# =========================
# Mocks simples
# =========================

class PedidoCompraMock:
    def __init__(self, estado):
        self.estado = estado


# =========================
# Tests
# =========================

def test_falla_si_no_hay_detalles():
    validated_data = {}
    detalles = []

    with pytest.raises(ValidationError):
        validar_compra(validated_data, detalles)


def test_falla_si_cantidad_es_cero():
    validated_data = {}
    detalles = [
        {"cantidad": 0, "precio_unitario": 100}
    ]

    with pytest.raises(ValidationError):
        validar_compra(validated_data, detalles)


def test_falla_si_precio_unitario_es_cero():
    validated_data = {}
    detalles = [
        {"cantidad": 1, "precio_unitario": 0}
    ]

    with pytest.raises(ValidationError):
        validar_compra(validated_data, detalles)


def test_pasa_sin_pedido_compra():
    validated_data = {}
    detalles = [
        {"cantidad": 2, "precio_unitario": 150}
    ]

    assert validar_compra(validated_data, detalles) is True


def test_falla_si_pedido_no_validado():
    pedido = PedidoCompraMock(estado="pendiente")

    validated_data = {
        "pedido_compra": pedido
    }

    detalles = [
        {"cantidad": 1, "precio_unitario": 100}
    ]

    with pytest.raises(ValidationError):
        validar_compra(validated_data, detalles)


def test_falla_si_pedido_cancelado():
    pedido = PedidoCompraMock(estado="cancelado")

    validated_data = {
        "pedido_compra": pedido
    }

    detalles = [
        {"cantidad": 1, "precio_unitario": 100}
    ]

    with pytest.raises(ValidationError):
        validar_compra(validated_data, detalles)


def test_falla_si_pedido_recibido():
    pedido = PedidoCompraMock(estado="recibido")

    validated_data = {
        "pedido_compra": pedido
    }

    detalles = [
        {"cantidad": 1, "precio_unitario": 100}
    ]

    with pytest.raises(ValidationError):
        validar_compra(validated_data, detalles)


def test_pasa_si_pedido_validado():
    pedido = PedidoCompraMock(estado="validado")

    validated_data = {
        "pedido_compra": pedido
    }

    detalles = [
        {"cantidad": 3, "precio_unitario": 200}
    ]

    assert validar_compra(validated_data, detalles) is True
