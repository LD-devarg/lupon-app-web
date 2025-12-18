import pytest
from rest_framework.exceptions import ValidationError

from core.domain.validaciones_compras import validar_asignacion_ventas_pedido_compra


# =========================
# Mocks simples de dominio
# =========================

class PedidoCompraMock:
    def __init__(self, estado):
        self.estado = estado


class VentaMock:
    def __init__(self, id, estado_venta='en proceso', pedido_compra=None):
        self.id = id
        self.estado_venta = estado_venta
        self.pedido_compra = pedido_compra


# =========================
# Tests
# =========================

def test_asignacion_valida_en_pedido_pendiente():
    pedido = PedidoCompraMock(estado='pendiente')
    ventas = [
        VentaMock(id=1),
        VentaMock(id=2)
    ]

    # No debe lanzar excepción
    validar_asignacion_ventas_pedido_compra(pedido, ventas)


def test_asignacion_valida_en_pedido_validado():
    pedido = PedidoCompraMock(estado='validado')
    ventas = [
        VentaMock(id=1),
    ]

    validar_asignacion_ventas_pedido_compra(pedido, ventas)


def test_no_permite_asignar_en_pedido_recibido():
    pedido = PedidoCompraMock(estado='recibido')
    ventas = [VentaMock(id=1)]

    with pytest.raises(ValidationError):
        validar_asignacion_ventas_pedido_compra(pedido, ventas)


def test_no_permite_asignar_en_pedido_cancelado():
    pedido = PedidoCompraMock(estado='cancelado')
    ventas = [VentaMock(id=1)]

    with pytest.raises(ValidationError):
        validar_asignacion_ventas_pedido_compra(pedido, ventas)


def test_no_permite_venta_cancelada():
    pedido = PedidoCompraMock(estado='pendiente')
    ventas = [
        VentaMock(id=1, estado_venta='cancelada')
    ]

    with pytest.raises(ValidationError):
        validar_asignacion_ventas_pedido_compra(pedido, ventas)


def test_no_permite_venta_con_otro_pedido_compra():
    pedido_actual = PedidoCompraMock(estado='pendiente')
    otro_pedido = PedidoCompraMock(estado='pendiente')

    ventas = [
        VentaMock(id=1, pedido_compra=otro_pedido)
    ]

    with pytest.raises(ValidationError):
        validar_asignacion_ventas_pedido_compra(pedido_actual, ventas)


def test_permitemantener_venta_ya_asociada_al_mismo_pedido():
    pedido = PedidoCompraMock(estado='pendiente')

    ventas = [
        VentaMock(id=1, pedido_compra=pedido)
    ]

    # No debe fallar
    validar_asignacion_ventas_pedido_compra(pedido, ventas)
