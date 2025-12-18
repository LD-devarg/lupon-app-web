# Pagos (API)

Base URL: `/api/pagos/`

Registra pagos a proveedores y aplica montos a compras para reducir su saldo pendiente. El backend controla saldos, estados y validaciones para evitar inconsistencias.

## Modelo
- `id` (int)
- `proveedor` (id de contacto tipo proveedor)
- `fecha_pago` (date, por defecto hoy)
- `medio_pago` (`efectivo`, `transferencia`)
- `monto` (decimal, total pagado)
- `saldo_disponible` (decimal, solo lectura; arranca igual a `monto` y baja al aplicarlo)
- `observaciones` (string, opcional)
- `detalles` (lista: `id`, `compra`, `monto_aplicado`)
- timestamps: `creado_en`, `actualizado_en`

## Endpoints

### Listar pagos
`GET /api/pagos/`

Query params:
- `proveedor` (subcadena en nombre)
- `fecha_pago` (date exacta)

Response 200 (ejemplo reducido):
```json
[
  {
    "id": 1,
    "proveedor": 7,
    "fecha_pago": "2024-01-10",
    "medio_pago": "efectivo",
    "monto": "200.00",
    "saldo_disponible": "50.00"
  }
]
```

### Obtener un pago
`GET /api/pagos/{id}/`

Incluye detalles aplicados:
```json
{
  "id": 1,
  "proveedor": 7,
  "fecha_pago": "2024-01-10",
  "medio_pago": "efectivo",
  "monto": "200.00",
  "saldo_disponible": "50.00",
  "detalles": [
    { "id": 10, "compra": 4, "monto_aplicado": "150.00" }
  ]
}
```

### Crear pago
`POST /api/pagos/`

Body ejemplo:
```json
{
  "proveedor": 7,
  "medio_pago": "efectivo",
  "monto": "200.00",
  "observaciones": "Adelanto",
  "detalles": [
    { "compra": 4, "monto_aplicado": "150.00" }
  ]
}
```

Comportamiento:
- Valida que `monto > 0` y la suma de `monto_aplicado` no supere `monto`.
- Ajusta `saldo_contacto` del proveedor (resta el monto pagado).
- Inicializa `saldo_disponible` y descuenta lo aplicado en los detalles.
- Resta `saldo_pendiente` de cada compra y recalcula `estado_pago`/`estado_compra` segun corresponda.
- No permite pagar compras canceladas ni exceder su saldo pendiente.

### Agregar detalles a un pago existente
`PATCH /api/pagos/{id}/`

Body (solo nuevos detalles):
```json
{
  "detalles": [
    { "compra": 4, "monto_aplicado": "50.00" }
  ]
}
```

Reglas:
- No reemplaza detalles previos; agrega y descuenta de `saldo_disponible`.
- Valida contra el saldo disponible y el saldo pendiente de cada compra.
- Tras aplicar, actualiza `saldo_disponible` y estados de las compras afectadas.

## Reglas clave para el front
- No enviar `saldo_disponible`; lo calcula el backend.
- Para aplicar en etapas, crear el pago y luego hacer `PATCH` con mas detalles.
- Si una compra esta cancelada o totalmente pagada, el backend responde 400 al intentar aplicar montos.
- Mantener sincronizado el saldo pendiente de las compras leyendo la respuesta despues de cada operacion.
