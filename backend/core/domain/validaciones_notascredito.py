from rest_framework.exceptions import ValidationError


def validar_detalles_nc(detalles):
    if not detalles:
        raise ValidationError("La nota de crédito debe tener al menos un detalle")

    for d in detalles:
        if d['cantidad'] <= 0:
            raise ValidationError("Cantidad inválida en detalle")

        if d['precio_unitario'] <= 0:
            raise ValidationError("Precio unitario inválido en detalle")
        
    return True

def validar_aplicaciones_nc(aplicaciones):
    if not aplicaciones:
        raise ValidationError("La nota de crédito debe tener al menos una aplicación")

    for a in aplicaciones:
        venta = a.get('venta')
        compra = a.get('compra')

        if not venta and not compra:
            raise ValidationError("Cada aplicación debe tener una venta o una compra")

        if venta and compra:
            raise ValidationError("Una aplicación no puede tener venta y compra al mismo tiempo")

        if a['monto_aplicado'] <= 0:
            raise ValidationError("Monto aplicado inválido")
        
    return True

def validar_tipo_nc(tipo, aplicaciones):
    for a in aplicaciones:
        if tipo == 'venta' and not a.get('venta'):
            raise ValidationError("NC de venta aplicada a compra")

        if tipo == 'compra' and not a.get('compra'):
            raise ValidationError("NC de compra aplicada a venta")
    return True

def validar_nota_credito(data):
    validar_detalles_nc(data.get('detalles', []))
    validar_aplicaciones_nc(data.get('aplicaciones', []))
    validar_tipo_nc(data.get('tipo'), data.get('aplicaciones', []))
    return True