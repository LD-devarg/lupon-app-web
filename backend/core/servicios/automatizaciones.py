from decimal import Decimal

from core.domain.logica import calcular_precios_producto, calcular_subtotal

# ======================================================
# VENTAS & COBROS
# ======================================================

def recalcular_estado_cobro(venta):
    if venta.estado_venta == 'cancelada':
        return 'cancelado'

    if (venta.saldo_pendiente == 0 and not venta.cobros_detalle.exists() and venta.notas_credito_aplicadas.exists()):
        return "cancelado"

    if venta.saldo_pendiente == 0:
        return 'cobrado'

    if 0 < venta.saldo_pendiente < venta.total:
        return 'parcial'

    return 'pendiente'


def recalcular_estado_venta(venta):
    if venta.estado_venta == 'cancelada':
        return 'cancelada'

    # NC que cubre el total sin cobros reales → cancelada contablemente
    if (
        venta.saldo_pendiente == 0
        and not venta.cobros_detalle.exists()
        and venta.notas_credito_aplicadas.exists()
    ):
        return 'cancelada'

    return venta.estado_venta


def saldos_al_crear_venta(venta):
    contacto = venta.cliente
    contacto.saldo_contacto += venta.total
    contacto.save(update_fields=['saldo_contacto'])

    venta.saldo_pendiente = venta.total
    venta.save(update_fields=['saldo_pendiente'])


def cancelar_venta_domain(venta):
    contacto = venta.cliente
    contacto.saldo_contacto -= venta.total
    contacto.save(update_fields=['saldo_contacto'])

    venta.saldo_pendiente = 0
    venta.estado_venta = 'cancelada'
    venta.estado_cobro = recalcular_estado_cobro(venta)
    venta.save(update_fields=['saldo_pendiente', 'estado_cobro', 'estado_venta'])


def saldos_al_crear_cobro(cobro):
    contacto = cobro.cliente
    contacto.saldo_contacto -= cobro.monto
    contacto.save(update_fields=['saldo_contacto'])

    cobro.saldo_disponible = cobro.monto
    cobro.save(update_fields=['saldo_disponible'])


def saldos_al_crear_cobro_detalle(cobro_detalle):
    venta = cobro_detalle.venta
    cobro = cobro_detalle.cobro

    venta.saldo_pendiente -= cobro_detalle.monto_aplicado
    venta.save(update_fields=['saldo_pendiente'])

    cobro.saldo_disponible -= cobro_detalle.monto_aplicado
    cobro.save(update_fields=['saldo_disponible'])


def actualizar_estado_ventas_al_cobrar(cobro):
    ventas = {detalle.venta for detalle in cobro.detalles.all()}
    for venta in ventas:
        venta.estado_cobro = recalcular_estado_cobro(venta)
        venta.save(update_fields=['estado_cobro'])


# ======================================================
# COMPRAS & PAGOS
# ======================================================

def recalcular_estado_pago(compra):
    if compra.estado_compra == 'cancelada':
        return 'cancelado'

    if compra.saldo_pendiente == 0:
        return 'pagado'

    if 0 < compra.saldo_pendiente < compra.total:
        return 'parcial'

    return 'pendiente'


def cancelar_compra(compra):
    proveedor = compra.proveedor
    proveedor.saldo_contacto -= compra.total
    proveedor.save(update_fields=['saldo_contacto'])

    compra.saldo_pendiente = 0
    compra.estado_compra = 'cancelada'
    compra.estado_pago = recalcular_estado_pago(compra)
    compra.save(update_fields=['saldo_pendiente', 'estado_compra', 'estado_pago'])


def saldos_al_crear_pago(pago):
    contacto = pago.proveedor
    contacto.saldo_contacto -= pago.monto
    contacto.save(update_fields=['saldo_contacto'])

    pago.saldo_disponible = pago.monto
    pago.save(update_fields=['saldo_disponible'])


def saldo_al_crear_pago_detalle(detalle):
    compra = detalle.compra
    pago = detalle.pago

    compra.saldo_pendiente -= detalle.monto_aplicado
    compra.save(update_fields=['saldo_pendiente'])

    pago.saldo_disponible -= detalle.monto_aplicado
    pago.save(update_fields=['saldo_disponible'])


def actualizar_estado_compras_al_pagar(pago):
    compras = {detalle.compra for detalle in pago.detalles.all()}
    for compra in compras:
        compra.estado_pago = recalcular_estado_pago(compra)
        compra.save(update_fields=['estado_pago'])


def recalcular_precios_producto(producto):
    precios = calcular_precios_producto(producto.precio_compra)

    for campo, valor in precios.items():
        setattr(producto, campo, valor)

    producto.save(update_fields=list(precios.keys()))


def aplicar_nota_credito(nota_credito):
    for aplicacion in nota_credito.aplicaciones.all():
        documento = aplicacion.compra or aplicacion.venta

        documento.saldo_pendiente -= aplicacion.monto_aplicado

        if aplicacion.venta:
            documento.estado_cobro = recalcular_estado_cobro(documento)
            documento.estado_venta = recalcular_estado_venta(documento)
            documento.save(update_fields=[
                'saldo_pendiente',
                'estado_cobro',
                'estado_venta',
            ])
        else:
            documento.estado_pago = recalcular_estado_pago(documento)
            documento.save(update_fields=[
                'saldo_pendiente',
                'estado_pago',
            ])

    contacto = nota_credito.contacto
    contacto.saldo_contacto -= nota_credito.total
    contacto.save(update_fields=['saldo_contacto'])

    nota_credito.estado = 'aplicada'
    nota_credito.save(update_fields=['estado'])
