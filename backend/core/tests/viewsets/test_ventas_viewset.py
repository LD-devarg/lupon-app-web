import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from core.models import (
    Contactos,
    Productos,
    PedidosVentas,
    PedidosVentasDetalle,
    Ventas,
)
from core.serializers import VentasSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(api_client):
    user = User.objects.create_user(username="testuser", password="testpass")
    api_client.force_authenticate(user=user)
    return user


@pytest.fixture
def cliente():
    return Contactos.objects.create(
        nombre="Cliente Test",
        tipo="cliente",
        email="cliente@test.com",
        forma_pago="contado",
        dias_cc=0,
        saldo_contacto=Decimal("0.00"),
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test",
        rubro="pollo entero",
        unidad_medida="kg",
        precio_compra=Decimal("100.00"),
    )


@pytest.fixture
def pedido_aceptado(cliente, producto):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="aceptado",
        subtotal=Decimal("200.00"),
    )

    PedidosVentasDetalle.objects.create(
        pedido_venta=pedido,
        producto=producto,
        cantidad=2,
        precio_unitario=Decimal("100.00"),
    )

    return pedido


@pytest.fixture
def venta(pedido_aceptado, producto):
    serializer = VentasSerializer(
        data={
            "pedido_venta": pedido_aceptado.id,
            "cliente": pedido_aceptado.cliente.id,
            "forma_pago": "contado",
            "detalles": [
                {
                    "producto": producto.id,
                    "cantidad": 2,
                    "precio_unitario": "100.00",
                }
            ],
        }
    )
    serializer.is_valid(raise_exception=True)
    return serializer.save()


def test_crear_venta(api_client, user, pedido_aceptado, producto):
    payload = {
        "pedido_venta": pedido_aceptado.id,
        "cliente": pedido_aceptado.cliente.id,
        "forma_pago": "contado",
        "detalles": [
            {
                "producto": producto.id,
                "cantidad": 2,
                "precio_unitario": "100.00",
            }
        ],
    }

    res = api_client.post("/api/ventas/", payload, format="json")
    assert res.status_code == 201

    venta = Ventas.objects.get(id=res.data["id"])
    assert venta.subtotal == Decimal("200.00")
    assert venta.total == Decimal("200.00")
    assert venta.saldo_pendiente == Decimal("200.00")


def test_cambiar_estado_entrega(api_client, user, venta):
    res = api_client.post(
        f"/api/ventas/{venta.id}/cambiar_estado_entrega/",
        {"estado_entrega": "entregada"},
        format="json",
    )

    assert res.status_code == 200
    venta.refresh_from_db()
    assert venta.estado_entrega == "entregada"
    assert venta.pedido_venta.estado == "Completado"


def test_no_cancelar_venta_completada(api_client, user, venta):
    venta.estado_venta = "completada"
    venta.estado_entrega = "entregada"
    venta.saldo_pendiente = Decimal("0.00")
    venta.save(update_fields=["estado_venta", "estado_entrega", "saldo_pendiente"])

    res = api_client.post(
        f"/api/ventas/{venta.id}/cancelar_venta/",
        {"motivo_cancelacion": "Venta ya completada"},
        format="json",
    )

    assert res.status_code == 400


def test_cancelar_venta(api_client, user, venta):
    res = api_client.post(
        f"/api/ventas/{venta.id}/cancelar_venta/",
        {"motivo_cancelacion": "Cliente se arrepintio"},
        format="json",
    )

    assert res.status_code == 200
    venta.refresh_from_db()
    assert venta.estado_venta == "cancelada"
    assert venta.estado_entrega == "cancelada"
    assert venta.saldo_pendiente == Decimal("0.00")
