import pytest
from datetime import date
from decimal import Decimal

from rest_framework.exceptions import ValidationError

from core.models import (
    Contactos,
    Productos,
    Compras,
    ComprasDetalle,
    Pagos
)
from core.serializers import PagosSerializer

pytestmark = pytest.mark.django_db

@pytest.fixture
def proveedor():
    return Contactos.objects.create(
        nombre="Proveedor Test",
        tipo="proveedor"
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test"
    )


@pytest.fixture
def compra_pendiente(proveedor, producto):
    compra = Compras.objects.create(
        proveedor=proveedor,
        fecha_compra=date.today(),
        estado_compra="pendiente",
        subtotal=Decimal("100"),
        total=Decimal("100"),
        saldo_pendiente=Decimal("100")
    )

    ComprasDetalle.objects.create(
        compra=compra,
        producto=producto,
        cantidad=1,
        precio_unitario=100
    )

    return compra


@pytest.fixture
def compra_cancelada(proveedor, producto):
    compra = Compras.objects.create(
        proveedor=proveedor,
        fecha_compra=date.today(),
        estado_compra="cancelada",
        subtotal=Decimal("100"),
        total=Decimal("100"),
        saldo_pendiente=Decimal("100")
    )

    ComprasDetalle.objects.create(
        compra=compra,
        producto=producto,
        cantidad=1,
        precio_unitario=100
    )

    return compra


def test_crea_pago_valido(proveedor, compra_pendiente):
    data = {
        "proveedor": proveedor.id,
        "fecha_pago": date.today(),
        "medio_pago": "efectivo",
        "monto": 100,
        "detalles": [
            {
                "compra": compra_pendiente.id,
                "monto_aplicado": 100
            }
        ]
    }

    serializer = PagosSerializer(data=data)

    assert serializer.is_valid(), serializer.errors

    pago = serializer.save()

    compra_pendiente.refresh_from_db()

    assert pago.monto == Decimal("100")
    assert pago.saldo_disponible == Decimal("0")
    assert compra_pendiente.estado_compra == "pagado"
    assert compra_pendiente.saldo_pendiente == Decimal("0")


def test_falla_si_aplica_mas_que_monto_pago(proveedor, compra_pendiente):
    data = {
        "proveedor": proveedor.id,
        "fecha_pago": date.today(),
        "medio_pago": "efectivo",
        "monto": 50,
        "detalles": [
            {
                "compra": compra_pendiente.id,
                "monto_aplicado": 100
            }
        ]
    }

    serializer = PagosSerializer(data=data)

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()
        
def test_falla_si_compra_cancelada(proveedor, compra_cancelada):
    data = {
        "proveedor": proveedor.id,
        "fecha_pago": date.today(),
        "medio_pago": "efectivo",
        "monto": 100,
        "detalles": [
            {
                "compra": compra_cancelada.id,
                "monto_aplicado": 50
            }
        ]
    }

    serializer = PagosSerializer(data=data)

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()

def test_falla_si_monto_aplicado_cero(proveedor, compra_pendiente):
    data = {
        "proveedor": proveedor.id,
        "fecha_pago": date.today(),
        "medio_pago": "efectivo",
        "monto": 100,
        "detalles": [
            {
                "compra": compra_pendiente.id,
                "monto_aplicado": 0
            }
        ]
    }

    serializer = PagosSerializer(data=data)

    assert serializer.is_valid(), serializer.errors

    with pytest.raises(ValidationError):
        serializer.save()


def test_campos_read_only_no_se_setean(proveedor, compra_pendiente):
    data = {
        "proveedor": proveedor.id,
        "fecha_pago": date.today(),
        "medio_pago": "efectivo",
        "monto": 100,
        "saldo_disponible": 9999,  # intento forzar
        "detalles": [
            {
                "compra": compra_pendiente.id,
                "monto_aplicado": 100
            }
        ]
    }

    serializer = PagosSerializer(data=data)

    assert serializer.is_valid(), serializer.errors

    pago = serializer.save()

    assert pago.saldo_disponible == Decimal("0")


