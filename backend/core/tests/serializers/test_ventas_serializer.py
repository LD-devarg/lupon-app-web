import pytest
from datetime import date

from rest_framework.exceptions import ValidationError

from core.models import Productos, Contactos
from core.serializers import VentasSerializer


pytestmark = pytest.mark.django_db


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


def get_valid_payload(cliente, producto, **overrides):
    data = {
        "fecha_venta": date.today(),
        "cliente": cliente.id,
        "forma_pago": "contado",
        "costo_entrega": 0,
        "descuento": 0,
        "detalles": [
            {
                "producto": producto.id,
                "cantidad": 2,
                "precio_unitario": 100
            }
        ]
    }

    data.update(overrides)
    return data


def test_crea_venta_valida(cliente, producto):
    serializer = VentasSerializer(data=get_valid_payload(cliente, producto))

    assert serializer.is_valid(), serializer.errors
    venta = serializer.save()

    assert venta.subtotal == 200
    assert venta.total == 200
    assert venta.saldo_pendiente == 200


def test_estados_iniciales(cliente, producto):
    venta = VentasSerializer(data=get_valid_payload(cliente, producto))
    venta.is_valid(raise_exception=True)
    venta = venta.save()

    assert venta.estado_venta == "en proceso"
    assert venta.estado_cobro == "pendiente"
    assert venta.estado_entrega == "pendiente"


def test_calcula_totales(cliente, producto):
    serializer = VentasSerializer(
        data=get_valid_payload(
            cliente,
            producto,
            costo_entrega=50,
            descuento=20
        )
    )

    assert serializer.is_valid(), serializer.errors
    venta = serializer.save()

    assert venta.subtotal == 200
    assert venta.total == 230


def test_falla_si_no_hay_detalles(cliente):
    serializer = VentasSerializer(
        data={
            "fecha_venta": date.today(),
            "cliente": cliente.id,
            "forma_pago": "contado",
            "detalles": []
        }
    )

    assert serializer.is_valid()
    with pytest.raises(ValidationError):
        serializer.save()


def test_falla_si_cantidad_cero(cliente, producto):
    serializer = VentasSerializer(
        data={
            "fecha_venta": date.today(),
            "cliente": cliente.id,
            "forma_pago": "contado",
            "detalles": [
                {
                    "producto": producto.id,
                    "cantidad": 0,
                    "precio_unitario": 100
                }
            ]
        }
    )

    assert serializer.is_valid()
    with pytest.raises(ValidationError):
        serializer.save()


def test_campos_read_only_no_se_setean(cliente, producto):
    serializer = VentasSerializer(
        data=get_valid_payload(
            cliente,
            producto,
            subtotal=9999,
            total=9999,
            saldo_pendiente=9999,
            estado_venta="cancelada"
        )
    )

    assert serializer.is_valid(), serializer.errors
    venta = serializer.save()

    assert venta.subtotal != 9999
    assert venta.total != 9999
    assert venta.saldo_pendiente != 9999
    assert venta.estado_venta == "en proceso"
