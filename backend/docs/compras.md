# Compras (API)

Base URL: `/api/compras/`

Registra compras a proveedores (opcionalmente derivadas de un Pedido de Compra). El backend calcula totales, saldo pendiente y estados de pago/compra, y aplica reglas de validacion de flujo.

## Modelo
- `id` (int)
- `proveedor` (id de contacto tipo proveedor)
- `pedido_compra` (id, opcional; debe estar `validado` para usarlo)
- `fecha_compra` (date, por defecto hoy)
- `estado_compra` (`pendiente`, `recibida`, `cancelada`) calculado/accion dedicada
- `estado_pago` (`pendiente`, `parcial`, `pagado`, `cancelado`) calculado
- `subtotal`, `total`, `saldo_pendiente` (decimales, solo lectura)
- `extra`, `descuento` (decimales opcionales)
- `numero_documento` (string, opcional)
- `observaciones` (string, opcional)
- `detalles` (lista: `id`, `producto`, `cantidad`, `precio_unitario`)
- `motivo_cancelacion`, `fecha_cancelacion` (solo al cancelar)
- timestamps: `creado_en`, `actualizado_en`

### Flujo de estado de compra
- `pendiente` -> `recibida` | `cancelada`
- `recibida` y `cancelada` son terminales.

## Endpoints

### Listar compras
`GET /api/compras/`

Query params:
- `proveedor` (subcadena en nombre)
- `estado_compra`
- `estado_pago`
- `fecha_compra` (date exacta)

Response 200 (ejemplo reducido):
```json
[
  {
    "id": 1,
    "proveedor": 7,
    "estado_compra": "pendiente",
    "estado_pago": "pendiente",
    "total": "160.00",
    "saldo_pendiente": "160.00"
  }
]
```

### Obtener una compra
`GET /api/compras/{id}/`

Incluye detalles:
```json
{
  "id": 1,
  "proveedor": 7,
  "pedido_compra": 3,
  "fecha_compra": "2024-01-01",
  "estado_compra": "pendiente",
  "estado_pago": "pendiente",
  "subtotal": "160.00",
  "extra": "0.00",
  "descuento": "0.00",
  "total": "160.00",
  "saldo_pendiente": "160.00",
  "detalles": [
    { "id": 10, "producto": 4, "cantidad": "2.00", "precio_unitario": "80.00" }
  ]
}
```

### Crear compra
`POST /api/compras/`

Body ejemplo:
```json
{
  "proveedor": 7,
  "pedido_compra": 3,
  "extra": "0",
  "descuento": "0",
  "observaciones": "Recepcion completa",
  "detalles": [
    { "producto": 4, "cantidad": 2, "precio_unitario": "80.00" }
  ]
}
```

Comportamiento:
- `detalles` es requerido; valida cantidades y precios > 0.
- Si se envia `pedido_compra`, debe estar en estado `validado`; de lo contrario devuelve 400.
- Calcula `subtotal`, `total = subtotal + extra - descuento`, y deja `saldo_pendiente = total`.
- Inicializa `estado_compra` en `pendiente` y `estado_pago` en `pendiente`.

### Cambiar estado de compra
`POST /api/compras/{id}/cambiar_estado_compra/`

Body:
```json
{ "estado_compra": "recibida" }
```
o
```json
{ "estado_compra": "cancelada", "motivo_cancelacion": "Error de carga" }
```

Reglas:
- Valida el flujo permitido.
- `cancelada` ajusta `saldo_pendiente` a 0, marca `estado_pago` en `cancelado` y descuenta el total del saldo del proveedor.
- `recibida` recalcula `estado_pago` segun pagos aplicados (si los hubiera).

## Reglas clave para el front
- No enviar `subtotal`, `total`, `saldo_pendiente`, `estado_compra` ni `estado_pago`; los calcula el backend.
- Crear siempre con `detalles` y, si aplica, con `pedido_compra` en estado `validado`.
- Para cancelar o marcar recibida usar la accion `/cambiar_estado_compra/`; no un PATCH directo.
- Si la compra esta `recibida` o `cancelada`, no deberia editarse en el UI.
