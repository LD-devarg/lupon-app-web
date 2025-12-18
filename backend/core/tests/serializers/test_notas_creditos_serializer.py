import pytest
from decimal import Decimal
from rest_framework.exceptions import ValidationError

from core.models import (
    Contactos,
    Productos,
    Ventas,
    VentasDetalle,
    PedidosVentas
)
from core.serializers import NotasCreditoSerializer

pytestmark = pytest.mark.django_db


# ---------- FIXTURES ----------
@pytest.fixture
def pedido_venta(cliente):
    return PedidosVentas.objects.create(
        cliente=cliente,
        estado="aceptado",
        subtotal=500,
    )


@pytest.fixture
def cliente():
    return Contactos.objects.create(
        nombre="Cliente Test",
        tipo="cliente",
        saldo_contacto=Decimal("1000.00")
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test"
    )


@pytest.fixture
def venta(cliente, producto, pedido_venta):
    venta = Ventas.objects.create(
        pedido_venta=pedido_venta,
        cliente=cliente,
        subtotal=Decimal("500.00"),
        total=Decimal("500.00"),
        saldo_pendiente=Decimal("500.00"),
    )

    VentasDetalle.objects.create(
        venta=venta,
        producto=producto,
        cantidad=1,
        precio_unitario=Decimal("500.00"),
    )

    return venta


def payload_nc_valido(cliente, venta, **overrides):
    data = {
        "contacto": cliente.id,
        "tipo": "venta",
        "motivo": "Devolución parcial",
        "detalles": [
            {
                "producto": venta.detalles.first().producto.id,
                "cantidad": "1",
                "precio_unitario": "200.00",
            }
        ],
        "aplicaciones": [
            {
                "venta": venta.id,
                "monto_aplicado": "200.00",
            }
        ],
    }
    data.update(overrides)
    return data


# ---------- TESTS ----------

def test_crea_y_aplica_nc_valida(cliente, venta):
    serializer = NotasCreditoSerializer(
        data=payload_nc_valido(cliente, venta)
    )

    assert serializer.is_valid(), serializer.errors
    nc = serializer.save()

    venta.refresh_from_db()
    cliente.refresh_from_db()

    assert nc.estado == "aplicada"
    assert nc.total == Decimal("200.00")
    assert venta.saldo_pendiente == Decimal("300.00")
    assert cliente.saldo_contacto == Decimal("800.00")


def test_falla_si_no_hay_detalles(cliente, venta):
    serializer = NotasCreditoSerializer(
        data=payload_nc_valido(cliente, venta, detalles=[])
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_falla_si_no_hay_aplicaciones(cliente, venta):
    serializer = NotasCreditoSerializer(
        data=payload_nc_valido(cliente, venta, aplicaciones=[])
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_falla_si_monto_aplicado_cero(cliente, venta):
    serializer = NotasCreditoSerializer(
        data=payload_nc_valido(
            cliente,
            venta,
            aplicaciones=[
                {"venta": venta.id, "monto_aplicado": 0}
            ]
        )
    )

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_campos_read_only_no_se_setean(cliente, venta):
    serializer = NotasCreditoSerializer(
        data=payload_nc_valido(
            cliente,
            venta,
            total=9999,
            estado="pendiente"
        )
    )

    assert serializer.is_valid(), serializer.errors
    nc = serializer.save()

    assert nc.total != Decimal("9999")
    assert nc.estado == "aplicada"
