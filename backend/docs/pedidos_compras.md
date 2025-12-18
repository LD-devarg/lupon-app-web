# Pedidos de Compra (API)

Base URL: `/api/pedidos-compras/`

Recurso para planificar compras a proveedores antes de generar una Compra. El backend calcula subtotales, valida el flujo de estados y restringe modificaciones segun el estado.

## Modelo
- `id` (int)
- `proveedor` (id de contacto tipo proveedor)
- `fecha_pedido` (date, por defecto hoy)
- `estado` (`pendiente`, `validado`, `cancelado`, `recibido`)
- `observaciones` (string, opcional)
- `subtotal` (decimal, solo lectura; suma de detalles)
- `detalles` (lista: `id`, `producto`, `cantidad`, `precio_unitario`)
- `ventas_ids` (opcional, lista de ids de ventas a asociar)
- timestamps: `creado_en`, `actualizado_en`

### Flujo de estado permitido
- `pendiente` -> `validado` | `cancelado`
- `validado` -> `recibido` | `cancelado`
- `recibido` y `cancelado` son terminales (sin edicion).

### Regla de modificacion
- Detalles solo se pueden agregar/modificar/eliminar cuando el pedido esta `pendiente`.

## Endpoints

### Listar pedidos
`GET /api/pedidos-compras/`

Query params:
- `estado` (exacto)
- `proveedor` (subcadena en nombre)

Response 200 (ejemplo):
```json
[
  { "id": 1, "proveedor": 7, "estado": "pendiente", "subtotal": "150.00" }
]
```

### Obtener un pedido
`GET /api/pedidos-compras/{id}/`

Incluye detalles:
```json
{
  "id": 1,
  "proveedor": 7,
  "estado": "pendiente",
  "subtotal": "150.00",
  "observaciones": "",
  "detalles": [
    { "id": 10, "producto": 3, "cantidad": "2.00", "precio_unitario": "50.00" }
  ]
}
```

### Crear pedido
`POST /api/pedidos-compras/`

Body ejemplo:
```json
{
  "proveedor": 7,
  "estado": "pendiente",
  "observaciones": "Reposicion semanal",
  "detalles": [
    { "producto": 3, "cantidad": 2, "precio_unitario": "50.00" }
  ],
  "ventas_ids": [5, 6]
}
```

Notas:
- `detalles` es requerido. El backend calcula `subtotal`.
- `ventas_ids` es opcional para vincular ventas; valida que las ventas no esten canceladas ni asociadas a otro pedido.

### Actualizar pedido
`PUT/PATCH /api/pedidos-compras/{id}/`

- Puede cambiar `estado` respetando el flujo permitido.
- Si se envia `detalles`, se reemplazan todos (solo cuando esta `pendiente`).
- Si se envia `ventas_ids`, revalida la asignacion y actualiza los vinculos.

### Agregar detalle
`POST /api/pedidos-compras/{id}/detalles/`

Body:
```json
{ "producto": 3, "cantidad": 1, "precio_unitario": "40.00" }
```

Solo con estado `pendiente`. Devuelve `nuevo_subtotal` y el detalle creado.

### Modificar detalle
`PATCH /api/pedidos-compras/{id}/detalles/{detalle_id}/`

Permite actualizar cantidad/precio/producto si el pedido esta `pendiente`. Devuelve `nuevo_subtotal` y el detalle modificado.

### Eliminar detalle
`DELETE /api/pedidos-compras/{id}/detalles/{detalle_id}/`

Solo con estado `pendiente`. Devuelve `nuevo_subtotal` y `detalles_restantes`.

## Reglas clave para el front
- `subtotal` siempre viene calculado; no enviarlo.
- Bloquear edicion de detalles si el estado no es `pendiente`.
- Cambios de estado deben seguir el flujo; `recibido`/`cancelado` son terminales.
- Si se usan `ventas_ids`, asegurarse que las ventas no esten canceladas ni ya asociadas a otro pedido.
