from core.servicios.automatizaciones import (
    saldo_al_crear_pago_detalle,
    actualizar_estado_compras_al_pagar,
)


# =====================================================
# MOCKS DE DOMINIO
# =====================================================

class CompraMock:
    def __init__(self, total, saldo_pendiente, estado_compra='pendiente'):
        self.total = total
        self.saldo_pendiente = saldo_pendiente
        self.estado_compra = estado_compra
        self.estado_pago = 'pendiente'


class PagoMock:
    def __init__(self, monto):
        self.monto = monto
        self.saldo_disponible = monto
        self._detalles = []

    @property
    def detalles(self):
        return self

    def all(self):
        return self._detalles


class PagoDetalleMock:
    def __init__(self, pago, compra, monto_aplicado):
        self.pago = pago
        self.compra = compra
        self.monto_aplicado = monto_aplicado


# =====================================================
# TESTS
# =====================================================

def test_aplicar_pago_parcial_actualiza_saldos_y_estado():
    """
    Pago parcial:
    - baja saldo_pendiente
    - baja saldo_disponible
    - estado_pago = parcial
    """

    compra = CompraMock(total=500, saldo_pendiente=500)
    pago = PagoMock(monto=300)

    detalle = PagoDetalleMock(pago=pago, compra=compra, monto_aplicado=300)
    pago._detalles.append(detalle)

    saldo_al_crear_pago_detalle(detalle)
    actualizar_estado_compras_al_pagar(pago)

    assert compra.saldo_pendiente == 200
    assert pago.saldo_disponible == 0
    assert compra.estado_pago == 'parcial'


def test_aplicar_pago_total_actualiza_estado_a_pagado():
    """
    Pago total:
    - saldo_pendiente = 0
    - estado_pago = pagado
    """

    compra = CompraMock(total=500, saldo_pendiente=500)
    pago = PagoMock(monto=500)

    detalle = PagoDetalleMock(pago=pago, compra=compra, monto_aplicado=500)
    pago._detalles.append(detalle)

    saldo_al_crear_pago_detalle(detalle)
    actualizar_estado_compras_al_pagar(pago)

    assert compra.saldo_pendiente == 0
    assert pago.saldo_disponible == 0
    assert compra.estado_pago == 'pagado'


def test_estado_pago_cancelado_si_compra_cancelada():
    """
    Si la compra está cancelada:
    - estado_pago debe ser cancelado
    """

    compra = CompraMock(
        total=500,
        saldo_pendiente=0,
        estado_compra='cancelada'
    )

    pago = PagoMock(monto=200)
    detalle = PagoDetalleMock(pago=pago, compra=compra, monto_aplicado=200)
    pago._detalles.append(detalle)

    actualizar_estado_compras_al_pagar(pago)

    assert compra.estado_pago == 'cancelado'
