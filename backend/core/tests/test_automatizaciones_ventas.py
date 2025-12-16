from core.servicios.automatizaciones import cancelar_venta


# =====================================================
# MOCKS SIMPLES
# =====================================================

class ContactoMock:
    def __init__(self, saldo_contacto):
        self.saldo_contacto = saldo_contacto


class VentaMock:
    def __init__(
        self,
        total,
        saldo_pendiente,
        estado_venta,
        estado_entrega,
        cliente
    ):
        self.total = total
        self.saldo_pendiente = saldo_pendiente
        self.estado_venta = estado_venta
        self.estado_entrega = estado_entrega
        self.cliente = cliente


# =====================================================
# TEST: CANCELAR VENTA
# =====================================================

def test_cancelar_venta_setea_estados_y_saldos_correctos():
    """
    Al cancelar una venta:
    - La venta queda cancelada
    - La entrega queda cancelada
    - El saldo pendiente pasa a 0
    - El saldo del contacto se ajusta correctamente
    """

    contacto = ContactoMock(saldo_contacto=1000)

    venta = VentaMock(
        total=300,
        saldo_pendiente=300,
        estado_venta='en proceso',
        estado_entrega='pendiente',
        cliente=contacto
    )

    cancelar_venta(venta)

    # Estados
    assert venta.estado_venta == 'cancelada'
    assert venta.estado_entrega == 'cancelada'

    # Saldos
    assert venta.saldo_pendiente == 0
    assert contacto.saldo_contacto == 700
