from core.servicios.automatizaciones import (
    cancelar_compra,
    recalcular_estado_pago,
)


# =====================================================
# MOCKS DE DOMINIO
# =====================================================

class ProveedorMock:
    def __init__(self, saldo_contacto):
        self.saldo_contacto = saldo_contacto


class CompraMock:
    def __init__(
        self,
        total,
        saldo_pendiente,
        estado_compra='pendiente',
        proveedor=None
    ):
        self.total = total
        self.saldo_pendiente = saldo_pendiente
        self.estado_compra = estado_compra
        self.estado_pago = 'pendiente'
        self.proveedor = proveedor


# =====================================================
# TESTS
# =====================================================

def test_cancelar_compra_setea_estados_y_saldos_correctos():
    """
    Al cancelar una compra:
    - saldo_pendiente = 0
    - estado_compra = cancelada
    - estado_pago = cancelado
    - saldo del proveedor se ajusta
    """

    proveedor = ProveedorMock(saldo_contacto=1000)

    compra = CompraMock(
        total=400,
        saldo_pendiente=400,
        estado_compra='pendiente',
        proveedor=proveedor
    )

    cancelar_compra(compra)

    assert compra.saldo_pendiente == 0
    assert compra.estado_compra == 'cancelada'
    assert compra.estado_pago == 'cancelado'
    assert proveedor.saldo_contacto == 600


def test_estado_pago_pendiente_si_no_hay_pagos():
    """
    Sin pagos:
    - estado_pago debe ser pendiente
    """

    compra = CompraMock(
        total=300,
        saldo_pendiente=300,
        estado_compra='pendiente'
    )

    estado = recalcular_estado_pago(compra)
    assert estado == 'pendiente'


def test_estado_pago_parcial():
    """
    Pago parcial:
    - saldo_pendiente > 0
    - estado_pago = parcial
    """

    compra = CompraMock(
        total=300,
        saldo_pendiente=100,
        estado_compra='pendiente'
    )

    estado = recalcular_estado_pago(compra)
    assert estado == 'parcial'


def test_estado_pago_pagado():
    """
    Pago total:
    - saldo_pendiente = 0
    - estado_pago = pagado
    """

    compra = CompraMock(
        total=300,
        saldo_pendiente=0,
        estado_compra='pendiente'
    )

    estado = recalcular_estado_pago(compra)
    assert estado == 'pagado'


def test_estado_pago_cancelado_domina():
    """
    Si la compra está cancelada:
    - estado_pago debe ser cancelado
    """

    compra = CompraMock(
        total=300,
        saldo_pendiente=0,
        estado_compra='cancelada'
    )

    estado = recalcular_estado_pago(compra)
    assert estado == 'cancelado'
