import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from core.models import (
    Contactos,
    Productos,
    Compras,
    Pagos,
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
        nombre="Proveedor Pagos",
        tipo="proveedor",
        email="proveedor_pagos@test.com",
        forma_pago="contado",
        dias_cc=0,
        saldo_contacto=Decimal("0.00"),
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Pago",
        rubro="pollo entero",
        unidad_medida="kg",
        precio_compra=Decimal("100.00"),
    )


def crear_compra(api_client, proveedor, producto, total=Decimal("200.00")):
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
                    "precio_unitario": str(total / 2),
                }
            ],
        },
        format="json",
    )
    assert res.status_code == 201, res.data
    return Compras.objects.get(id=res.data["id"])


def test_crear_pago(api_client, user, proveedor, producto):
    compra = crear_compra(api_client, proveedor, producto, Decimal("200.00"))

    res = api_client.post(
        "/api/pagos/",
        {
            "proveedor": proveedor.id,
            "medio_pago": "efectivo",
            "monto": "150.00",
            "detalles": [
                {"compra": compra.id, "monto_aplicado": "150.00"},
            ],
        },
        format="json",
    )

    assert res.status_code == 201
    pago = Pagos.objects.get(id=res.data["id"])
    compra.refresh_from_db()
    proveedor.refresh_from_db()

    assert pago.saldo_disponible == Decimal("0.00")
    assert compra.saldo_pendiente == Decimal("50.00")
    assert compra.estado_pago == "parcial"
    assert proveedor.saldo_contacto == Decimal("-150.00")


def test_no_crear_pago_monto_aplicado_excede(api_client, user, proveedor, producto):
    compra = crear_compra(api_client, proveedor, producto, Decimal("200.00"))

    res = api_client.post(
        "/api/pagos/",
        {
            "proveedor": proveedor.id,
            "medio_pago": "efectivo",
            "monto": "100.00",
            "detalles": [
                {"compra": compra.id, "monto_aplicado": "150.00"},
            ],
        },
        format="json",
    )

    assert res.status_code == 400
    compra.refresh_from_db()
    assert compra.saldo_pendiente == Decimal("200.00")


def test_agregar_detalle_pago(api_client, user, proveedor, producto):
    compra = crear_compra(api_client, proveedor, producto, Decimal("200.00"))

    pago = api_client.post(
        "/api/pagos/",
        {
            "proveedor": proveedor.id,
            "medio_pago": "efectivo",
            "monto": "200.00",
            "detalles": [
                {"compra": compra.id, "monto_aplicado": "100.00"},
            ],
        },
        format="json",
    )
    assert pago.status_code == 201
    pago_id = pago.data["id"]

    res = api_client.patch(
        f"/api/pagos/{pago_id}/",
        {
            "detalles": [
                {"compra": compra.id, "monto_aplicado": "100.00"},
            ]
        },
        format="json",
    )

    assert res.status_code == 200
    compra.refresh_from_db()
    pago_db = Pagos.objects.get(id=pago_id)

    assert pago_db.saldo_disponible == Decimal("0.00")
    assert compra.saldo_pendiente == Decimal("0.00")
    assert compra.estado_pago == "pagado"


def test_no_pagar_compra_cancelada(api_client, user, proveedor, producto):
    compra = crear_compra(api_client, proveedor, producto, Decimal("200.00"))
    compra.estado_compra = "cancelada"
    compra.save(update_fields=["estado_compra"])

    res = api_client.post(
        "/api/pagos/",
        {
            "proveedor": proveedor.id,
            "medio_pago": "efectivo",
            "monto": "50.00",
            "detalles": [
                {"compra": compra.id, "monto_aplicado": "50.00"},
            ],
        },
        format="json",
    )

    assert res.status_code == 400
