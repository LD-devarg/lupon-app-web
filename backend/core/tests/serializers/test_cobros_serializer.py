import pytest
from datetime import date
from rest_framework.exceptions import ValidationError

from core.models import (
    Contactos,
    Productos,
    Ventas,
    VentasDetalle,
    Cobros,
    PedidosVentas,
)
from core.serializers import CobrosSerializer

pytestmark = pytest.mark.django_db


# ---------- FIXTURES ----------

@pytest.fixture
def cliente():
    return Contactos.objects.create(
        nombre="Cliente Test",
        tipo="cliente"
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test"
    )

@pytest.fixture
def pedido_venta(cliente):
    return PedidosVentas.objects.create(
        cliente=cliente,
        estado="aceptado",
        subtotal=100,
    )

@pytest.fixture
def venta(cliente, producto, pedido_venta):
    venta = Ventas.objects.create(
        pedido_venta=pedido_venta,
        cliente=cliente,
        forma_pago="contado",
        subtotal=100,
        total=100,
        saldo_pendiente=100,
    )

    VentasDetalle.objects.create(
        venta=venta,
        producto=producto,
        cantidad=1,
        precio_unitario=100
    )

    return venta


def payload_valido(cliente, venta, **overrides):
    data = {
        "cliente": cliente.id,
        "fecha_cobro": date.today(),
        "medio_pago": "efectivo",
        "monto": 100,
        "detalles": [
            {
                "venta": venta.id,
                "monto_aplicado": 100
            }
        ]
    }
    data.update(overrides)
    return data


# ---------- TESTS ----------

def test_crea_cobro_valido(cliente, venta):
    serializer = CobrosSerializer(
        data=payload_valido(cliente, venta)
    )

    assert serializer.is_valid(), serializer.errors
    cobro = serializer.save()

    venta.refresh_from_db()

    assert cobro.monto == 100
    assert cobro.saldo_disponible == 0
    assert venta.estado_cobro == "cobrado"
    assert venta.saldo_pendiente == 0


def test_falla_si_aplica_mas_que_monto(cliente, venta):
    serializer = CobrosSerializer(
        data=payload_valido(
            cliente,
            venta,
            detalles=[
                {"venta": venta.id, "monto_aplicado": 150}
            ]
        )
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_falla_si_monto_aplicado_cero(cliente, venta):
    serializer = CobrosSerializer(
        data=payload_valido(
            cliente,
            venta,
            detalles=[
                {"venta": venta.id, "monto_aplicado": 0}
            ]
        )
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_falla_si_venta_cancelada(cliente, venta):
    venta.estado_venta = "cancelada"
    venta.save(update_fields=["estado_venta"])

    serializer = CobrosSerializer(
        data=payload_valido(cliente, venta)
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_falla_si_no_hay_detalles(cliente):
    serializer = CobrosSerializer(
        data={
            "cliente": cliente.id,
            "fecha_cobro": date.today(),
            "monto": 100,
            "medio_pago": "efectivo",
            "detalles": []
        }
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_campos_read_only_no_se_setean(cliente, venta):
    serializer = CobrosSerializer(
        data=payload_valido(
            cliente,
            venta,
            saldo_disponible=9999
        )
    )

    assert serializer.is_valid(), serializer.errors
    cobro = serializer.save()

    assert cobro.saldo_disponible != 9999
