import pytest
from datetime import date

from rest_framework.exceptions import ValidationError

from core.models import (
    Ventas,
    VentasDetalle,
    Productos,
    Contactos,
    PedidosVentas,
    PedidosVentasDetalle
)
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


@pytest.fixture
def pedido_venta(cliente, producto):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="aceptado"
    )

    PedidosVentasDetalle.objects.create(
        pedido_venta=pedido,
        producto=producto,
        cantidad=2,
        precio_unitario=100
    )

    # si tu lógica no recalcula automáticamente:
    pedido.subtotal = 200
    pedido.save(update_fields=["subtotal"])

    return pedido


def get_valid_payload(cliente, producto, **overrides):
    data = {
        "pedido_venta": overrides.get("pedido_venta"),
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

def test_crea_venta_valida(cliente, producto, pedido_venta):
    serializer = VentasSerializer(
        data=get_valid_payload(
            cliente,
            producto,
            pedido_venta=pedido_venta.id
        )
    )

    assert serializer.is_valid(), serializer.errors
    venta = serializer.save()

    assert venta.subtotal == 200
    assert venta.total == 200
    assert venta.saldo_pendiente == 200

def test_estados_iniciales(cliente, producto, pedido_venta):
    venta = VentasSerializer(
        data=get_valid_payload(
            cliente,
            producto,
            pedido_venta=pedido_venta.id
        )
    )
    venta.is_valid(raise_exception=True)
    venta = venta.save()

    assert venta.estado_venta == "en proceso"
    assert venta.estado_cobro == "pendiente"
    assert venta.estado_entrega == "pendiente"

def test_calcula_totales(cliente, producto, pedido_venta):
    serializer = VentasSerializer(
        data=get_valid_payload(
            cliente,
            producto,
            pedido_venta=pedido_venta.id,
            costo_entrega=50,
            descuento=20
        )
    )

    assert serializer.is_valid(), serializer.errors
    venta = serializer.save()

    assert venta.subtotal == 200
    assert venta.total == 230

def test_falla_si_no_hay_detalles(cliente, pedido_venta):
    serializer = VentasSerializer(
        data={
            "pedido_venta": pedido_venta.id,
            "fecha_venta": date.today(),
            "cliente": cliente.id,
            "forma_pago": "contado",
            "detalles": []
        }
    )

    assert serializer.is_valid()
    with pytest.raises(ValidationError):
        serializer.save()

def test_falla_si_cantidad_cero(cliente, producto, pedido_venta):
    serializer = VentasSerializer(
        data={
            "pedido_venta": pedido_venta.id,
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

def test_campos_read_only_no_se_setean(cliente, producto, pedido_venta):
    serializer = VentasSerializer(
        data=get_valid_payload(
            cliente,
            producto,
            pedido_venta=pedido_venta.id,
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
