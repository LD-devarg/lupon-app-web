import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from core.models import (
    Contactos,
    Productos,
    PedidosVentas,
    PedidosVentasDetalle,
)

pytestmark = pytest.mark.django_db


# ---------- FIXTURES BASE ----------

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
        saldo_contacto=Decimal("0.00"),
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test",
        precio_compra=Decimal("150.00"),
    )


# ---------- TESTS ----------

def test_crear_pedido_venta(api_client, user, cliente, producto):
    payload = {
        "fecha_pedido": "2024-01-01",
        "cliente": cliente.id,
        "estado": "pendiente",
        "subtotal": "500.00",
        "detalles": [
            {
                "producto": producto.id,
                "cantidad": 5,
                "precio_unitario": "100.00",
            }
        ],
    }

    res = api_client.post("/api/pedidos-ventas/", payload, format="json")
    assert res.status_code == 201

    pedido = PedidosVentas.objects.get(id=res.data["id"])
    assert pedido.estado == "pendiente"


def test_agregar_detalle_pedido_pendiente(api_client, user, cliente, producto):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="pendiente",
        subtotal=Decimal("0.00"),
    )

    payload = {
        "producto": producto.id,
        "cantidad": 2,
        "precio_unitario": "100.00",
    }

    res = api_client.post(
        f"/api/pedidos-ventas/{pedido.id}/detalles/",
        payload,
        format="json",
    )

    assert res.status_code == 200
    pedido.refresh_from_db()
    assert pedido.subtotal == Decimal("200.00")


def test_no_agrega_detalle_si_pedido_no_pendiente(api_client, user, cliente, producto):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="aceptado",
        subtotal=Decimal("0.00"),
    )

    payload = {
        "producto": producto.id,
        "cantidad": 1,
        "precio_unitario": "100.00",
    }

    res = api_client.post(
        f"/api/pedidos-ventas/{pedido.id}/detalles/",
        payload,
        format="json",
    )

    assert res.status_code == 400


def test_eliminar_detalle_pedido_pendiente(api_client, user, cliente, producto):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="pendiente",
        subtotal=Decimal("100.00"),
    )

    detalle = PedidosVentasDetalle.objects.create(
        pedido_venta=pedido,
        producto=producto,
        cantidad=1,
        precio_unitario=Decimal("100.00"),
    )

    res = api_client.delete(
        f"/api/pedidos-ventas/{pedido.id}/detalles/{detalle.id}/"
    )

    assert res.status_code == 200
    pedido.refresh_from_db()
    assert pedido.subtotal == Decimal("0.00")


def test_cancelar_pedido_venta(api_client, user, cliente):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="pendiente",
        subtotal=Decimal("0.00"),
    )

    res = api_client.post(
        f"/api/pedidos-ventas/{pedido.id}/cancelar_pedido/",
        {"motivo_cancelacion": "Cliente se arrepintió"},
        format="json",
    )

    assert res.status_code == 200
    pedido.refresh_from_db()
    assert pedido.estado == "cancelado"
