import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from core.models import Contactos, Productos, Ventas, VentasDetalle, PedidosVentas

pytestmark = pytest.mark.django_db

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user(api_client):
    user = User.objects.create_user(username='testuser', password='testpass')
    api_client.force_authenticate(user=user)
    return user

@pytest.fixture
def cliente():
    return Contactos.objects.create(
        nombre="Cliente Test",
        tipo="cliente",
        saldo_contacto=Decimal('1000.00')
    )
    
@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test",
        precio_compra=Decimal('150.00')
    )
    
@pytest.fixture
def venta(cliente, producto):
    pedido = PedidosVentas.objects.create(
        cliente=cliente,
        estado="aceptado",
        subtotal=Decimal('300.00')
    )
    venta = Ventas.objects.create(
        pedido_venta=pedido,
        cliente=cliente,
        fecha_venta="2024-01-01",
        forma_pago="contado",
        subtotal=Decimal('300.00'),
        descuento=Decimal('0.00'),
        total=Decimal('300.00'),
        saldo_pendiente=Decimal('300.00')
    )
    VentasDetalle.objects.create(
        venta=venta,
        producto=producto,
        cantidad=2,
        precio_unitario=Decimal('150.00'),
    )
    return venta

def test_crear_nota_credito_viewset(api_client, user, cliente, venta):
    payload = {
        "contacto": cliente.id,
        "tipo": "venta",
        "motivo": "Devolución",
        "detalles": [
            {
                "producto": venta.detalles.first().producto.id,
                "cantidad": 1,
                "precio_unitario": 200
            }
        ],
        "aplicaciones": [
            {
                "venta": venta.id,
                "monto_aplicado": 200
            }
        ]
    }

    response = api_client.post("/api/notas-credito/", payload, format="json")

    assert response.status_code == 201

    venta.refresh_from_db()
    cliente.refresh_from_db()

    assert venta.saldo_pendiente == Decimal("100.00")
    assert cliente.saldo_contacto == Decimal("800.00")


def test_filtro_notas_credito_por_contacto(api_client, user, cliente, venta):
    api_client.post("/api/notas-credito/", {
        "contacto": cliente.id,
        "tipo": "venta",
        "detalles": [{
            "producto": venta.detalles.first().producto.id,
            "cantidad": 1,
            "precio_unitario": 100
        }],
        "aplicaciones": [{
            "venta": venta.id,
            "monto_aplicado": 100
        }]
    }, format="json")

    response = api_client.get(f"/api/notas-credito/?contacto={cliente.id}")
    assert response.status_code == 200
    assert len(response.data) == 1

def test_no_permite_eliminar_nc(api_client, user, cliente, venta):
    res = api_client.post("/api/notas-credito/", {
        "contacto": cliente.id,
        "tipo": "venta",
        "detalles": [{
            "producto": venta.detalles.first().producto.id,
            "cantidad": 1,
            "precio_unitario": 100
        }],
        "aplicaciones": [{
            "venta": venta.id,
            "monto_aplicado": 100
        }]
    }, format="json")

    nc_id = res.data["id"]

    delete = api_client.delete(f"/api/notas-credito/{nc_id}/")
    assert delete.status_code == 405

def test_nc_total_cancela_saldo_y_actualiza_estados(api_client, user, cliente, venta):
    payload = {
        "contacto": cliente.id,
        "tipo": "venta",
        "motivo": "Anulación total",
        "detalles": [
            {
                "producto": venta.detalles.first().producto.id,
                "cantidad": 2,
                "precio_unitario": 150
            }
        ],
        "aplicaciones": [
            {
                "venta": venta.id,
                "monto_aplicado": 300
            }
        ]
    }

    response = api_client.post("/api/notas-credito/", payload, format="json")
    assert response.status_code == 201

    venta.refresh_from_db()
    cliente.refresh_from_db()

    # Saldo
    assert venta.saldo_pendiente == Decimal("0.00")

    # Estados
    assert venta.estado_cobro == "cancelado"
    assert venta.estado_venta == "cancelada"

    # Contacto
    assert cliente.saldo_contacto == Decimal("700.00")
