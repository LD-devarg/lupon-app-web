Tests de serializers

- Qué se prueba: serializadores de compras, ventas, cobros, pagos y notas de crédito con payloads completos y casos de error. Se valida que campos obligatorios, fechas, formas de pago y detalles anidados sean aceptados o rechazados según reglas, y que los cálculos de subtotal/total y los saldos de contactos o documentos vinculados queden en valores esperados.
- Por qué da confianza: los serializers son la primera línea que convierte requests en objetos persistibles. Al comprobar validaciones y efectos secundarios (creación de detalles, ajuste de saldos), garantizan que la API sólo persista datos coherentes y que la lógica de negocio reciba información limpia.
