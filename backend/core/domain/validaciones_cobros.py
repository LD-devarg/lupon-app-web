# ============================
# Validaciones de Cobros
# ============================
from django.db import models
from django.core.exceptions import ValidationError
from core.models import Cobros, CobrosDetalle
from .logica import calcular_monto_aplicado_total
from core.models import Ventas

def validar_cobro(validated_data, detalles_data):
    # Validar que el monto del cobro sea positivo
    if validated_data['monto'] <= 0:
        raise ValidationError("El monto del cobro debe ser un valor positivo.")
        
    # Validar que la suma de monto_aplicado de CobrosDetalle del cobro no exceda el saldo disponible
    if calcular_monto_aplicado_total(detalles_data) > validated_data['monto']:
        raise ValidationError("La suma de los montos aplicados no puede exceder el monto del cobro.")
    
    # Validar detalles
    validar_detalles(detalles_data)
    
    return True

def validar_detalles(detalles_data):
    # Obtener todos los IDs de venta del request
    venta_ids = list({d['venta'] for d in detalles_data})

    # Traer todas las ventas en UNA consulta
    ventas = {v.id: v for v in Ventas.objects.filter(id__in=venta_ids)}

    for d in detalles_data:
        venta = ventas.get(d['venta'])
        
        if venta.estado == 'Cancelada':
            raise ValidationError(f"La venta con ID {venta.id} está cancelada y no puede recibir pagos.")
        
        if d['monto_aplicado'] > venta.saldo_pendiente:
            raise ValidationError(f"El monto aplicado para la venta con ID {venta.id} excede su saldo pendiente.")
        
        if d['monto_aplicado'] <= 0:
            raise ValidationError(f"El monto aplicado para la venta con ID {venta.id} debe ser un valor positivo.")

    return True