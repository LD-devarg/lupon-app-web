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
    Cobros,
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
        nombre="Cliente Cobro",
        tipo="cliente",
        email="cliente_cobro@test.com",
        forma_pago="contado",
        dias_cc=0,
        saldo_contacto=Decimal("0.00"),
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Cobro",
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


def test_crear_cobro(api_client, user, cliente, venta):
    payload = {
        "cliente": cliente.id,
        "medio_pago": "efectivo",
        "monto": "150.00",
        "detalles": [
            {"venta": venta.id, "monto_aplicado": "150.00"},
        ],
    }

    res = api_client.post("/api/cobros/", payload, format="json")
    assert res.status_code == 201

    cobro = Cobros.objects.get(id=res.data["id"])
    venta.refresh_from_db()
    cliente.refresh_from_db()

    assert cobro.saldo_disponible == Decimal("0.00")
    assert venta.saldo_pendiente == Decimal("50.00")
    assert venta.estado_cobro == "parcial"
    assert cliente.saldo_contacto == Decimal("50.00")


def test_no_crea_cobro_si_monto_aplicado_excede(api_client, user, cliente, venta):
    payload = {
        "cliente": cliente.id,
        "medio_pago": "efectivo",
        "monto": "100.00",
        "detalles": [
            {"venta": venta.id, "monto_aplicado": "150.00"},
        ],
    }

    res = api_client.post("/api/cobros/", payload, format="json")
    assert res.status_code == 400
    venta.refresh_from_db()
    assert venta.saldo_pendiente == Decimal("200.00")


def test_agregar_detalle_cobro(api_client, user, cliente, venta):
    # Cobro inicial con saldo disponible
    cobro = api_client.post(
        "/api/cobros/",
        {
            "cliente": cliente.id,
            "medio_pago": "efectivo",
            "monto": "200.00",
            "detalles": [
                {"venta": venta.id, "monto_aplicado": "100.00"},
            ],
        },
        format="json",
    )
    assert cobro.status_code == 201
    cobro_id = cobro.data["id"]

    res = api_client.patch(
        f"/api/cobros/{cobro_id}/",
        {
            "detalles": [
                {"venta": venta.id, "monto_aplicado": "100.00"},
            ]
        },
        format="json",
    )

    assert res.status_code == 200
    venta.refresh_from_db()
    cobro_db = Cobros.objects.get(id=cobro_id)

    assert cobro_db.saldo_disponible == Decimal("0.00")
    assert venta.saldo_pendiente == Decimal("0.00")
    assert venta.estado_cobro == "cobrado"


def test_no_cobrar_venta_cancelada(api_client, user, cliente, venta):
    venta.estado_venta = "cancelada"
    venta.save(update_fields=["estado_venta"])

    res = api_client.post(
        "/api/cobros/",
        {
            "cliente": cliente.id,
            "medio_pago": "efectivo",
            "monto": "50.00",
            "detalles": [
                {"venta": venta.id, "monto_aplicado": "50.00"},
            ],
        },
        format="json",
    )

    assert res.status_code == 400
