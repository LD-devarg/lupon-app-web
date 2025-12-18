import pytest
from datetime import date

from core.serializers import ComprasSerializer
from core.models import (
    Contactos,
    Productos,
    Compras,
)

pytestmark = pytest.mark.django_db(transaction=False)


# =========================
# FIXTURES
# =========================

@pytest.fixture
def proveedor():
    return Contactos.objects.create(
        nombre="Proveedor Test",
        tipo="proveedor",
        forma_pago="contado",
        dias_cc=0
    )


@pytest.fixture
def producto():
    return Productos.objects.create(
        nombre="Producto Test",
        precio_compra=100
    )


def get_valid_payload(
    proveedor,
    producto,
    **overrides
):
    payload = {
        "proveedor": proveedor.id,
        "fecha_compra": date.today(),
        "extra": 0,
        "descuento": 0,
        "observaciones": "Compra test",
        "detalles": [
            {
                "producto": producto.id,
                "cantidad": 1,
                "precio_unitario": 100
            }
        ]
    }

    payload.update(overrides)
    return payload


# =========================
# TESTS OK
# =========================

def test_crea_compra_valida(proveedor, producto):
    serializer = ComprasSerializer(
        data=get_valid_payload(proveedor, producto)
    )

    assert serializer.is_valid(), serializer.errors

    compra = serializer.save()

    assert isinstance(compra, Compras)
    assert compra.subtotal == 100
    assert compra.total == 100
    assert compra.saldo_pendiente == 100
    assert compra.estado_pago == "pendiente"
    assert compra.detalles.count() == 1


def test_calcula_totales_con_extra_y_descuento(proveedor, producto):
    serializer = ComprasSerializer(
        data=get_valid_payload(
            proveedor,
            producto,
            extra=50,
            descuento=20
        )
    )

    assert serializer.is_valid(), serializer.errors
    compra = serializer.save()

    assert compra.subtotal == 100
    assert compra.total == 130
    assert compra.saldo_pendiente == 130


# =========================
# VALIDACIONES
# =========================

def test_falla_si_no_hay_detalles(proveedor):
    serializer = ComprasSerializer(
        data={
            "proveedor": proveedor.id,
            "fecha_compra": date.today(),
            "extra": 0,
            "descuento": 0,
            "detalles": []
        }
    )

    assert not serializer.is_valid()
    assert "La compra debe contener al menos un detalle." in str(serializer.errors)


def test_falla_si_cantidad_es_cero(proveedor, producto):
    serializer = ComprasSerializer(
        data={
            "proveedor": proveedor.id,
            "fecha_compra": date.today(),
            "extra": 0,
            "descuento": 0,
            "detalles": [
                {
                    "producto": producto.id,
                    "cantidad": 0,
                    "precio_unitario": 100
                }
            ]
        }
    )

    assert not serializer.is_valid()
    assert "cantidad" in str(serializer.errors).lower()


def test_falla_si_precio_unitario_es_cero(proveedor, producto):
    serializer = ComprasSerializer(
        data={
            "proveedor": proveedor.id,
            "fecha_compra": date.today(),
            "extra": 0,
            "descuento": 0,
            "detalles": [
                {
                    "producto": producto.id,
                    "cantidad": 1,
                    "precio_unitario": 0
                }
            ]
        }
    )

    assert not serializer.is_valid()
    assert "precio" in str(serializer.errors).lower()


# =========================
# READ ONLY FIELDS
# =========================

def test_campos_read_only_no_se_pueden_setear(proveedor, producto):
    serializer = ComprasSerializer(
        data=get_valid_payload(
            proveedor,
            producto,
            subtotal=9999,
            total=9999,
            saldo_pendiente=9999,
            estado_pago="pagado"
        )
    )

    assert serializer.is_valid(), serializer.errors
    compra = serializer.save()

    # Ignora valores enviados
    assert compra.subtotal == 100
    assert compra.total == 100
    assert compra.saldo_pendiente == 100
    assert compra.estado_pago == "pendiente"
