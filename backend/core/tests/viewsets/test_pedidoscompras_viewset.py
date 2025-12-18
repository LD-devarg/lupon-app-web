import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from core.models import (
    Contactos,
    Productos,
    PedidosCompras,
    PedidosComprasDetalle,
)

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
def proveedor():
    return Contactos.objects.create(
        nombre="Proveedor Test",
        tipo="proveedor",
        email="proveedor@test.com",
        forma_pago="contado",
        dias_cc=0,
        saldo_contacto=Decimal("0.00"),
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Compra",
        rubro="pollo entero",
        unidad_medida="kg",
        precio_compra=Decimal("50.00"),
    )


@pytest.fixture
def pedido_pendiente(proveedor, producto):
    pedido = PedidosCompras.objects.create(
        proveedor=proveedor,
        estado="pendiente",
        subtotal=Decimal("0.00"),
    )
    detalle = PedidosComprasDetalle.objects.create(
        pedido_compra=pedido,
        producto=producto,
        cantidad=1,
        precio_unitario=Decimal("50.00"),
    )
    pedido.subtotal = Decimal("50.00")
    pedido.save(update_fields=["subtotal"])
    return pedido


def test_crear_pedido_compra(api_client, user, proveedor, producto):
    payload = {
        "proveedor": proveedor.id,
        "estado": "pendiente",
        "observaciones": "Compra inicial",
        "detalles": [
            {
                "producto": producto.id,
                "cantidad": 2,
                "precio_unitario": "75.00",
            }
        ],
    }

    res = api_client.post("/api/pedidos-compras/", payload, format="json")
    assert res.status_code == 201

    pedido = PedidosCompras.objects.get(id=res.data["id"])
    assert pedido.subtotal == Decimal("150.00")
    assert pedido.estado == "pendiente"


def test_agregar_detalle_pedido_pendiente(api_client, user, pedido_pendiente, producto):
    res = api_client.post(
        f"/api/pedidos-compras/{pedido_pendiente.id}/detalles/",
        {
            "producto": producto.id,
            "cantidad": 3,
            "precio_unitario": "20.00",
        },
        format="json",
    )

    assert res.status_code == 200
    pedido_pendiente.refresh_from_db()
    # subtotal previo 50 + (3*20)
    assert pedido_pendiente.subtotal == Decimal("110.00")


def test_no_agregar_detalle_si_validado(api_client, user, pedido_pendiente, producto):
    pedido_pendiente.estado = "validado"
    pedido_pendiente.save(update_fields=["estado"])

    res = api_client.post(
        f"/api/pedidos-compras/{pedido_pendiente.id}/detalles/",
        {
            "producto": producto.id,
            "cantidad": 1,
            "precio_unitario": "10.00",
        },
        format="json",
    )

    assert res.status_code == 400


def test_modificar_detalle(api_client, user, pedido_pendiente, producto):
    res = api_client.patch(
        f"/api/pedidos-compras/{pedido_pendiente.id}/",
        {
            "detalles": [
                {
                    "producto": producto.id,
                    "cantidad": 4,
                    "precio_unitario": "50.00",
                }
            ]
        },
        format="json",
    )

    assert res.status_code == 200
    pedido_pendiente.refresh_from_db()
    assert pedido_pendiente.subtotal == Decimal("200.00")


def test_eliminar_detalle(api_client, user, pedido_pendiente):
    detalle = pedido_pendiente.detalles.first()

    res = api_client.delete(
        f"/api/pedidos-compras/{pedido_pendiente.id}/detalles/{detalle.id}/"
    )

    assert res.status_code == 200
    pedido_pendiente.refresh_from_db()
    assert pedido_pendiente.subtotal == Decimal("0.00")


def test_cambiar_estado_validado(api_client, user, pedido_pendiente):
    res = api_client.patch(
        f"/api/pedidos-compras/{pedido_pendiente.id}/",
        {"estado": "validado"},
        format="json",
    )

    assert res.status_code == 200
    pedido_pendiente.refresh_from_db()
    assert pedido_pendiente.estado == "validado"


def test_no_cambiar_estado_invalid(api_client, user, pedido_pendiente):
    res = api_client.patch(
        f"/api/pedidos-compras/{pedido_pendiente.id}/",
        {"estado": "recibido"},
        format="json",
    )

    assert res.status_code == 400
