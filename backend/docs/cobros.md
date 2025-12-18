# Cobros (API)

Base URL: `/api/cobros/`

Registra cobros de clientes y aplica montos a ventas para reducir su saldo pendiente. El backend controla saldos, estados y validaciones de coherencia.

## Modelo
- `id` (int)
- `cliente` (id de contacto tipo cliente)
- `fecha_cobro` (date, por defecto hoy)
- `medio_pago` (`efectivo`, `transferencia`)
- `monto` (decimal, total cobrado)
- `saldo_disponible` (decimal, solo lectura; arranca igual a `monto` y baja al aplicar a ventas)
- `observaciones` (string, opcional)
- `detalles` (lista: `id`, `venta`, `monto_aplicado`)
- timestamps: `creado_en`, `actualizado_en`

## Endpoints

### Listar cobros
`GET /api/cobros/`

Query params:
- `cliente` (subcadena en nombre)
- `fecha_cobro` (date exacta)

Response 200 (ejemplo reducido):
```json
[
  {
    "id": 1,
    "cliente": 3,
    "fecha_cobro": "2024-01-10",
    "medio_pago": "efectivo",
    "monto": "200.00",
    "saldo_disponible": "50.00"
  }
]
```

### Obtener un cobro
`GET /api/cobros/{id}/`

Incluye detalles aplicados:
```json
{
  "id": 1,
  "cliente": 3,
  "fecha_cobro": "2024-01-10",
  "medio_pago": "efectivo",
  "monto": "200.00",
  "saldo_disponible": "50.00",
  "detalles": [
    { "id": 10, "venta": 5, "monto_aplicado": "150.00" }
  ]
}
```

### Crear cobro
`POST /api/cobros/`

Body ejemplo:
```json
{
  "cliente": 3,
  "medio_pago": "efectivo",
  "monto": "200.00",
  "observaciones": "Pago parcial",
  "detalles": [
    { "venta": 5, "monto_aplicado": "150.00" }
  ]
}
```

Comportamiento:
- Valida que cada `monto_aplicado` no supere el saldo pendiente de la venta y que la suma de detalles no exceda `monto`.
- Ajusta `saldo_contacto` del cliente (resta el monto cobrado).
- Inicializa `saldo_disponible` y descuenta los montos aplicados.
- Resta `saldo_pendiente` de cada venta y recalcula `estado_cobro/estado_venta`.

### Agregar detalles a un cobro existente
`PATCH /api/cobros/{id}/`

Body (solo se envian nuevos detalles):
```json
{
  "detalles": [
    { "venta": 5, "monto_aplicado": "50.00" }
  ]
}
```

Reglas:
- No reemplaza detalles previos; agrega y descuenta de `saldo_disponible`.
- Valida que exista saldo disponible y que las ventas no esten canceladas ni superen su saldo pendiente.
- Tras aplicar, actualiza `saldo_disponible` y estados de las ventas afectadas.

## Reglas clave para el front
- No enviar `saldo_disponible`; lo calcula el backend.
- Para aplicar saldo en etapas, crear el cobro y luego hacer `PATCH` con mas detalles.
- Si una venta esta cancelada o totalmente cobrada, el backend devuelve 400 al intentar aplicar montos.
- Mantener sincronizado el saldo pendiente de las ventas leyendo la respuesta despues de cada operacion.
