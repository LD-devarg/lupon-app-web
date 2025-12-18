from core.servicios.automatizaciones import (
    saldos_al_crear_cobro_detalle,
    actualizar_estado_ventas_al_cobrar,
)


# =====================================================
# MOCKS DE DOMINIO
# =====================================================

class VentaMock:
    def __init__(self, total, saldo_pendiente, estado_venta='en proceso', estado_entrega='pendiente'):
        self.total = total
        self.saldo_pendiente = saldo_pendiente
        self.estado_venta = estado_venta
        self.estado_entrega = estado_entrega
        self.estado_cobro = 'Pendiente'


class CobroMock:
    def __init__(self, monto):
        self.monto = monto
        self.saldo_disponible = monto
        self._detalles = []

    @property
    def detalles(self):
        # Simula related manager
        return self

    def all(self):
        return self._detalles


class CobroDetalleMock:
    def __init__(self, cobro, venta, monto_aplicado):
        self.cobro = cobro
        self.venta = venta
        self.monto_aplicado = monto_aplicado


# =====================================================
# TESTS
# =====================================================

def test_aplicar_cobro_parcial_actualiza_saldos_y_estado():
    """
    Cobro parcial:
    - Baja saldo_pendiente
    - Baja saldo_disponible
    - Estado de cobro = Parcial
    """

    venta = VentaMock(total=300, saldo_pendiente=300)
    cobro = CobroMock(monto=200)

    detalle = CobroDetalleMock(cobro=cobro, venta=venta, monto_aplicado=200)
    cobro._detalles.append(detalle)

    # Aplicar cobro
    saldos_al_crear_cobro_detalle(detalle)
    actualizar_estado_ventas_al_cobrar(cobro)

    assert venta.saldo_pendiente == 100
    assert cobro.saldo_disponible == 0
    assert venta.estado_cobro == 'parcial'


def test_aplicar_cobro_total_actualiza_estado_a_cobrado():
    """
    Cobro total:
    - saldo_pendiente = 0
    - Estado de cobro = Cobrado
    """

    venta = VentaMock(total=300, saldo_pendiente=300)
    cobro = CobroMock(monto=300)

    detalle = CobroDetalleMock(cobro=cobro, venta=venta, monto_aplicado=300)
    cobro._detalles.append(detalle)

    saldos_al_crear_cobro_detalle(detalle)
    actualizar_estado_ventas_al_cobrar(cobro)

    assert venta.saldo_pendiente == 0
    assert cobro.saldo_disponible == 0
    assert venta.estado_cobro == 'cobrado'


def test_estado_cobro_cancelado_si_venta_cancelada():
    """
    Si la venta está cancelada:
    - El estado de cobro debe quedar Cancelado
    """

    venta = VentaMock(
        total=300,
        saldo_pendiente=0,
        estado_venta='cancelada',
        estado_entrega='cancelada'
    )

    cobro = CobroMock(monto=100)
    detalle = CobroDetalleMock(cobro=cobro, venta=venta, monto_aplicado=100)
    cobro._detalles.append(detalle)

    # Aunque se intente aplicar, el estado manda
    actualizar_estado_ventas_al_cobrar(cobro)

    assert venta.estado_cobro == 'cancelado'
