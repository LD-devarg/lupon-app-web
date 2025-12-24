from rest_framework.exceptions import ValidationError
from decimal import Decimal


def validar_monto_nc(monto):
    if monto is None:
        raise ValidationError("La nota de credito debe incluir un monto")
    if monto <= 0:
        raise ValidationError("Monto invalido en nota de credito")
    return True


def validar_detalles_nc(detalles):
    if not detalles:
        return True

    for d in detalles:
        if d["cantidad"] <= 0:
            raise ValidationError("Cantidad invalida en detalle")

        if d["precio_unitario"] <= 0:
            raise ValidationError("Precio unitario invalido en detalle")

    return True


def validar_aplicaciones_nc(aplicaciones):
    if not aplicaciones:
        raise ValidationError("La nota de credito debe tener al menos una aplicacion")

    for a in aplicaciones:
        venta = a.get("venta")
        compra = a.get("compra")

        if not venta and not compra:
            raise ValidationError("Cada aplicacion debe tener una venta o una compra")

        if venta and compra:
            raise ValidationError("Una aplicacion no puede tener venta y compra al mismo tiempo")

        if a["monto_aplicado"] <= 0:
            raise ValidationError("Monto aplicado invalido")

    return True


def validar_total_aplicado(aplicaciones, monto):
    if monto is None:
        return True
    total = Decimal("0")
    for aplicacion in aplicaciones:
        total += Decimal(str(aplicacion.get("monto_aplicado", 0)))
    if total > Decimal(str(monto)):
        raise ValidationError("El total aplicado no puede superar el monto de la nota")
    return True


def validar_tipo_nc(tipo, aplicaciones):
    for a in aplicaciones:
        if tipo == "venta" and not a.get("venta"):
            raise ValidationError("NC de venta aplicada a compra")

        if tipo == "compra" and not a.get("compra"):
            raise ValidationError("NC de compra aplicada a venta")
    return True


def validar_nota_credito(data):
    validar_monto_nc(data.get("monto"))
    validar_detalles_nc(data.get("detalles", []))
    validar_aplicaciones_nc(data.get("aplicaciones", []))
    validar_total_aplicado(data.get("aplicaciones", []), data.get("monto"))
    validar_tipo_nc(data.get("tipo"), data.get("aplicaciones", []))
    return True
