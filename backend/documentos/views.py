from pathlib import Path
from decimal import Decimal

from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.template import TemplateDoesNotExist
from django.template.loader import get_template

from core.models import Cobros, Contactos, Ventas
from documentos.services.pdf_generator import generar_pdf


def preview_index(request):
    template_dir = Path(__file__).resolve().parent / "templates" / "documentos"
    templates = []
    if template_dir.exists():
        templates = sorted(p.stem for p in template_dir.glob("*.html"))
    return render(request, "documentos/preview_index.html", {"templates": templates})


def preview_documento(request, template_slug):
    template_name = f"documentos/{template_slug}.html"
    try:
        get_template(template_name)
    except TemplateDoesNotExist as exc:
        raise Http404 from exc

    items = [
        {
            "cantidad": 2,
            "producto": {"nombre": "Producto Demo"},
            "precio_unitario": 600,
            "subtotal": 1200,
        }
    ]

    context = {
        "venta": {
            "fecha_venta": "2025-01-01",
            "cliente": {
                "nombre": "Cliente Demo",
                "telefono": "1234567890",
                "direccion": "Calle Falsa 123",
            },
            "forma_pago": "contado",
            "subtotal": 1200,
            "costo_entrega": 0,
            "descuento": 0,
            "total": 1200,
        },
        "items": items,
        "numero": "00000001",
        "vendedor_nombre": "Vendedor Demo",
        "observaciones": "Sin observaciones.",
    }
    return render(request, template_name, context)


def _build_factura_context(venta, user):
    items = []
    for detalle in venta.detalles.select_related("producto").all():
        subtotal = detalle.cantidad * detalle.precio_unitario
        items.append(
            {
                "cantidad": detalle.cantidad,
                "producto": detalle.producto,
                "precio_unitario": detalle.precio_unitario,
                "subtotal": subtotal,
            }
        )

    vendedor_nombre = "-"
    if user and user.is_authenticated:
        vendedor_nombre = user.get_full_name() or user.username or "-"

    return {
        "venta": venta,
        "items": items,
        "numero": f"{venta.id:08d}",
        "vendedor_nombre": vendedor_nombre,
        "observaciones": "",
    }


def _build_cuenta_corriente_context(cliente, fecha_desde=None, fecha_hasta=None):
    ventas_qs = Ventas.objects.filter(cliente=cliente).exclude(estado_venta="cancelada")
    cobros_qs = Cobros.objects.filter(cliente=cliente)

    if fecha_desde:
        ventas_anteriores = ventas_qs.filter(fecha_venta__lt=fecha_desde)
        cobros_anteriores = cobros_qs.filter(fecha_cobro__lt=fecha_desde)
    else:
        ventas_anteriores = ventas_qs.none()
        cobros_anteriores = cobros_qs.none()

    if fecha_desde:
        ventas_qs = ventas_qs.filter(fecha_venta__gte=fecha_desde)
        cobros_qs = cobros_qs.filter(fecha_cobro__gte=fecha_desde)
    if fecha_hasta:
        ventas_qs = ventas_qs.filter(fecha_venta__lte=fecha_hasta)
        cobros_qs = cobros_qs.filter(fecha_cobro__lte=fecha_hasta)

    saldo_inicial = Decimal("0")
    for venta in ventas_anteriores:
        saldo_inicial += venta.total or Decimal("0")
    for cobro in cobros_anteriores:
        saldo_inicial -= cobro.monto or Decimal("0")

    movimientos = [
        *[
            {
                "tipo": "venta",
                "fecha_emision": venta.fecha_venta,
                "detalle": f"Venta #{venta.id}",
                "fecha_vto": venta.vencimiento,
                "debe": venta.total or Decimal("0"),
                "haber": Decimal("0"),
                "id": venta.id,
            }
            for venta in ventas_qs
        ],
        *[
            {
                "tipo": "cobro",
                "fecha_emision": cobro.fecha_cobro,
                "detalle": f"Cobro #{cobro.id}",
                "fecha_vto": None,
                "debe": Decimal("0"),
                "haber": cobro.monto or Decimal("0"),
                "id": cobro.id,
            }
            for cobro in cobros_qs
        ],
    ]

    movimientos.sort(
        key=lambda item: (
            item["fecha_emision"] or "",
            0 if item["tipo"] == "venta" else 1,
            item["id"],
        )
    )

    saldo = saldo_inicial
    movimientos_con_saldo = []
    for item in movimientos:
        saldo += item["debe"] - item["haber"]
        movimientos_con_saldo.append({**item, "saldo": saldo})

    return {
        "cliente": cliente,
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "saldo_inicial": saldo_inicial,
        "saldo_actual": saldo,
        "movimientos": movimientos_con_saldo,
    }


def factura_venta_html(request, venta_id):
    venta = get_object_or_404(Ventas.objects.select_related("cliente"), pk=venta_id)
    context = _build_factura_context(venta, request.user)
    return render(request, "documentos/factura_venta.html", context)


def factura_venta_pdf(request, venta_id):
    venta = get_object_or_404(Ventas.objects.select_related("cliente"), pk=venta_id)
    context = _build_factura_context(venta, request.user)
    pdf = generar_pdf("documentos/factura_venta.html", context)
    filename = f"factura_venta_{venta.id}.pdf"
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


def cuenta_corriente_cliente_html(request, cliente_id):
    cliente = get_object_or_404(Contactos.objects.filter(tipo="cliente"), pk=cliente_id)
    fecha_desde = request.GET.get("fecha_desde") or None
    fecha_hasta = request.GET.get("fecha_hasta") or None
    context = _build_cuenta_corriente_context(cliente, fecha_desde, fecha_hasta)
    return render(request, "documentos/cuenta_corriente_cliente.html", context)


def cuenta_corriente_cliente_pdf(request, cliente_id):
    cliente = get_object_or_404(Contactos.objects.filter(tipo="cliente"), pk=cliente_id)
    fecha_desde = request.GET.get("fecha_desde") or None
    fecha_hasta = request.GET.get("fecha_hasta") or None
    context = _build_cuenta_corriente_context(cliente, fecha_desde, fecha_hasta)
    pdf = generar_pdf("documentos/cuenta_corriente_cliente.html", context)
    filename = f"cuenta_corriente_cliente_{cliente.id}.pdf"
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response
