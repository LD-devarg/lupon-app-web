# Ventas (API)

Base URL: `/api/ventas/`

Recurso que materializa un Pedido de Venta y gestiona entrega, cobro y cancelacion. El backend calcula totales, estados derivados y saldos; el front solo envia los datos de entrada.

## Modelo
- `id` (int)
- `pedido_venta` (id, requerido)
- `pedido_compra` (id, opcional)
- `fecha_venta` (date, por defecto hoy)
- `cliente` (id de contacto tipo cliente)
- `direccion_entrega`, `fecha_entrega`, `fecha_reprogramada` (opcionales)
- `estado_entrega` (`pendiente`, `entregada`, `reprogramada`, `cancelada`)
- `estado_venta` (`en proceso`, `completada`, `cancelada`) calculado
- `estado_cobro` (`pendiente`, `parcial`, `cobrado`, `cancelado`) calculado
- `forma_pago` (`contado`, `contado pendiente`, `cuenta corriente`)
- `costo_entrega`, `descuento` (decimal, opcional)
- `subtotal`, `total`, `saldo_pendiente` (decimales, solo lectura; se recalculan)
- `vencimiento` (date, calculado segun forma_pago)
- `motivo_cancelacion`, `fecha_cancelacion` (solo al cancelar)
- `detalles` (lista de items: `id`, `producto`, `cantidad`, `precio_unitario`)
- timestamps: `creado_en`, `actualizado_en`

### Flujo de estado
- Entrega: `pendiente` -> `entregada` | `reprogramada`; `reprogramada` -> `entregada` | `reprogramada`; `entregada` es terminal; `cancelada` solo via cancelar venta.
- Venta: se recalcula con la entrega y cobros (`en proceso` -> `completada` al entregar y cobrar, `cancelada` via accion dedicada).

## Endpoints

### Listar ventas
`GET /api/ventas/`

Query params:
- `estado_entrega` (exacto)
- `cliente` (subcadena en nombre)

Response 200 (ejemplo reducido):
```json
[
  {
    "id": 10,
    "pedido_venta": 5,
    "cliente": 3,
    "fecha_venta": "2024-01-01",
    "estado_entrega": "pendiente",
    "estado_venta": "en proceso",
    "estado_cobro": "pendiente",
    "total": "200.00",
    "saldo_pendiente": "200.00"
  }
]
```

### Obtener una venta
`GET /api/ventas/{id}/`

Incluye detalles y campos derivados:
```json
{
  "id": 10,
  "pedido_venta": 5,
  "cliente": 3,
  "fecha_venta": "2024-01-01",
  "estado_entrega": "pendiente",
  "estado_venta": "en proceso",
  "estado_cobro": "pendiente",
  "forma_pago": "contado",
  "subtotal": "200.00",
  "costo_entrega": "0.00",
  "descuento": "0.00",
  "total": "200.00",
  "saldo_pendiente": "200.00",
  "detalles": [
    { "id": 1, "producto": 8, "cantidad": "2.00", "precio_unitario": "100.00" }
  ]
}
```

### Crear venta
`POST /api/ventas/`

Body ejemplo:
```json
{
  "pedido_venta": 5,
  "cliente": 3,
  "forma_pago": "contado",
  "detalles": [
    { "producto": 8, "cantidad": 2, "precio_unitario": "100.00" }
  ],
  "costo_entrega": "0",
  "descuento": "0",
  "direccion_entrega": "Av. Siempre Viva 123"
}
```

Notas:
- `detalles` es requerido. El backend crea los detalles, calcula `subtotal`, `total`, `saldo_pendiente` y ajusta `saldo_contacto` del cliente.
- `estado_entrega` arranca `pendiente`; `estado_venta` y `estado_cobro` los fija el backend.
- `pedido_compra` es opcional si se vincula con compras.

### Cambiar estado de entrega
`POST /api/ventas/{id}/cambiar_estado_entrega/`

Body:
```json
{ "estado_entrega": "entregada" }
```

Valida el flujo permitido. Si se marca `entregada`, el backend completa el `pedido_venta` asociado y recalcula `estado_venta`.

### Reprogramar entrega
`POST /api/ventas/{id}/reprogramar_entrega/`

Body:
```json
{ "nueva_fecha": "2024-01-05" }
```

Actualiza `fecha_reprogramada` y deja `estado_entrega` en `reprogramada`.

### Cancelar venta
`POST /api/ventas/{id}/cancelar_venta/`

Body:
```json
{ "motivo_cancelacion": "Cliente se arrepintio" }
```

Solo si la venta no esta completada. Ajusta estados (`estado_venta` y `estado_entrega` a `cancelada`), pone `saldo_pendiente` en 0, desasocia `pedido_compra` y revierte el saldo del cliente.

## Reglas clave para el front
- No enviar `subtotal`, `total`, `saldo_pendiente`, `estado_*` ni `vencimiento`; los define el backend.
- No se puede cancelar desde `cambiar_estado_entrega`; usar `/cancelar_venta/`.
- Cambios de entrega y reprogramaciones siguen flujo permitido; si falla, el backend devuelve 400 con mensaje.
- Tras entregar, el `pedido_venta` queda `completado` y ya no se deben editar detalles del pedido.
