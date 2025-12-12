# ============================
# Validaciones de Cobros
# ============================
from django.db import models
from django.core.exceptions import ValidationError
from core.models import Cobros, CobrosDetalle
from .logica import calcular_monto_aplicado_total
from core.models import Ventas

def validar_cobro(validated_data, detalles_data):
    # Validar que el monto del cobro sea positivo para nuevos cobros, pero si es una actualización permitir cero
    
    if validated_data['monto'] < 0:
        raise ValidationError("El monto del cobro debe ser un valor positivo.")
        
    # Validar que la suma de monto_aplicado de CobrosDetalle del cobro no exceda el saldo disponible
    if calcular_monto_aplicado_total(detalles_data) > validated_data['monto']:
        raise ValidationError("La suma de los montos aplicados no puede exceder el monto del cobro.")
    
    # Validar detalles
    validar_detalles(detalles_data)
    
    return True

def validar_actualizacion_cobro(cobro, validated_data, detalles_data):
    
    # Validar que la suma de monto_aplicado de CobrosDetalle del cobro no exceda el saldo disponible
    nuevo_monto = validated_data.get('saldo_disponible', cobro.saldo_disponible)
    if calcular_monto_aplicado_total(detalles_data) > nuevo_monto:
        raise ValidationError("La suma de los montos aplicados no puede exceder el disponible para aplicar.")
    
    # Validar detalles
    validar_detalles(detalles_data)
    
    return True

def validar_detalles(detalles_data):

    # Convertir ventas a IDs siempre
    venta_ids = list({
        d['venta'].id if isinstance(d['venta'], Ventas) else d['venta']
        for d in detalles_data
    })

    ventas = {v.id: v for v in Ventas.objects.filter(id__in=venta_ids)}

    for d in detalles_data:
        
        venta_id = d['venta'].id if isinstance(d['venta'], Ventas) else d['venta']
        venta = ventas.get(venta_id)

        if venta.estado_entrega == 'Cancelada':
            raise ValidationError(f"La venta con ID {venta.id} está cancelada y no puede recibir pagos.")
        
        if d['monto_aplicado'] > venta.saldo_pendiente:
            raise ValidationError(f"El monto aplicado para la venta con ID {venta.id} excede su saldo pendiente.")
        
        if d['monto_aplicado'] <= 0:
            raise ValidationError(f"El monto aplicado para la venta con ID {venta.id} debe ser un valor positivo.")

    return True
