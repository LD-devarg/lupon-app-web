import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from core.models import (
    Contactos,
    Productos,
    Compras,
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
        email="proveedor_compras@test.com",
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
        precio_compra=Decimal("80.00"),
    )


def crear_compra(api_client, proveedor, producto, monto=Decimal("200.00")):
    res = api_client.post(
        "/api/compras/",
        {
            "proveedor": proveedor.id,
            "extra": "0.00",
            "descuento": "0.00",
            "detalles": [
                {
                    "producto": producto.id,
                    "cantidad": 2,
                    "precio_unitario": str(monto / 2),
                }
            ],
        },
        format="json",
    )
    assert res.status_code == 201, res.data
    return res


def test_crear_compra(api_client, user, proveedor, producto):
    res = crear_compra(api_client, proveedor, producto, Decimal("160.00"))

    compra = Compras.objects.get(id=res.data["id"])
    assert compra.subtotal == Decimal("160.00")
    assert compra.total == Decimal("160.00")
    assert compra.saldo_pendiente == Decimal("160.00")
    assert compra.estado_compra == "pendiente"
    assert compra.estado_pago == "pendiente"


def test_no_crea_sin_detalles(api_client, user, proveedor):
    res = api_client.post(
        "/api/compras/",
        {
            "proveedor": proveedor.id,
            "detalles": [],
        },
        format="json",
    )

    assert res.status_code == 400
    assert Compras.objects.count() == 0


def test_cambiar_estado_recibida(api_client, user, proveedor, producto):
    res = crear_compra(api_client, proveedor, producto)
    compra_id = res.data["id"]

    res_estado = api_client.post(
        f"/api/compras/{compra_id}/cambiar_estado_compra/",
        {"estado_compra": "recibida"},
        format="json",
    )

    assert res_estado.status_code == 200
    compra = Compras.objects.get(id=compra_id)
    assert compra.estado_compra == "recibida"
    assert compra.estado_pago == "pendiente"


def test_cancelar_compra(api_client, user, proveedor, producto):
    res = crear_compra(api_client, proveedor, producto, Decimal("120.00"))
    compra_id = res.data["id"]

    res_cancel = api_client.post(
        f"/api/compras/{compra_id}/cambiar_estado_compra/",
        {"estado_compra": "cancelada", "motivo_cancelacion": "Error de carga"},
        format="json",
    )

    assert res_cancel.status_code == 200
    compra = Compras.objects.get(id=compra_id)
    proveedor.refresh_from_db()

    assert compra.estado_compra == "cancelada"
    assert compra.estado_pago == "cancelado"
    assert compra.saldo_pendiente == Decimal("0.00")
    assert proveedor.saldo_contacto == Decimal("-120.00")


def test_no_cambiar_estado_invalido(api_client, user, proveedor, producto):
    res = crear_compra(api_client, proveedor, producto)
    compra_id = res.data["id"]

    res_estado = api_client.post(
        f"/api/compras/{compra_id}/cambiar_estado_compra/",
        {"estado_compra": "pendiente"},
        format="json",
    )

    assert res_estado.status_code == 400
