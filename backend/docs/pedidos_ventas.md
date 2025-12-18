# Pedidos de Venta (API)

Base URL: `/api/pedidos-ventas/`

Recurso que representa la intencion de venta antes de generar una Venta. Se usa en el front para mostrar, editar y convertir un pedido en una venta.

## Modelo
- `id` (int)
- `cliente` (id de contacto tipo cliente)
- `fecha_pedido` (date, por defecto hoy)
- `direccion_entrega` (string, opcional)
- `estado` (string: `pendiente`, `aceptado`, `cancelado`, `completado`*)
- `subtotal` (decimal, calculado por el backend a partir de los detalles)
- `aclaraciones` (string, opcional)
- `motivo_cancelacion` / `fecha_cancelacion` (solo cuando se cancela)
- `detalles` (lista de items: `id`, `producto`, `cantidad`, `precio_unitario`)
- timestamps: `creado_en`, `actualizado_en`

*`completado` se asigna automaticamente cuando la venta asociada se marca como entregada.

### Flujo de estado permitido
- `pendiente` -> `aceptado` | `cancelado`
- `aceptado` -> `completado` (cuando la venta asociada se entrega) | `cancelado`
- `cancelado` y `completado` no se pueden editar.

## Endpoints

### Listar pedidos
`GET /api/pedidos-ventas/`

Query params:
- `estado` (filtra por estado exacto)
- `cliente` (subcadena en el nombre del cliente)

Response 200:
```json
[
  {
    "id": 1,
    "cliente": 3,
    "fecha_pedido": "2024-01-01",
    "estado": "pendiente",
    "subtotal": "300.00"
  }
]
```

### Obtener un pedido
`GET /api/pedidos-ventas/{id}/`

Incluye detalles:
```json
{
  "id": 1,
  "cliente": 3,
  "fecha_pedido": "2024-01-01",
  "estado": "pendiente",
  "subtotal": "300.00",
  "aclaraciones": "",
  "detalles": [
    { "id": 10, "producto": 5, "cantidad": "3.00", "precio_unitario": "100.00" }
  ]
}
```

### Crear pedido
`POST /api/pedidos-ventas/`

Body ejemplo:
```json
{
  "fecha_pedido": "2024-01-01",
  "cliente": 3,
  "estado": "pendiente",
  "aclaraciones": "Entregar por la tarde",
  "detalles": [
    { "producto": 5, "cantidad": 2, "precio_unitario": "120.00" }
  ]
}
```

Notas:
- `detalles` es requerido; el backend calcula y devuelve `subtotal`.
- `estado` inicial debe ser `pendiente`.

### Actualizar pedido
`PUT /api/pedidos-ventas/{id}/` o `PATCH /api/pedidos-ventas/{id}/`

Permite editar campos y/o reemplazar los detalles. Si se cambia `estado`, se valida el flujo permitido. Si se envian `detalles`, se reemplazan todos y se recalcula `subtotal`.

### Cancelar pedido
`POST /api/pedidos-ventas/{id}/cancelar_pedido/`

Body:
```json
{ "motivo_cancelacion": "Cliente se arrepintio", "fecha_cancelacion": "2024-01-02" }
```

Solo permite cancelar si el estado actual habilita el cambio. Devuelve `status` y persiste `motivo_cancelacion/fecha_cancelacion`.

### Agregar detalle
`POST /api/pedidos-ventas/{id}/detalles/`

Body:
```json
{ "producto": 5, "cantidad": 2, "precio_unitario": "120.00" }
```

Solo cuando el pedido esta `pendiente`. Devuelve `nuevo_subtotal` y el detalle creado.

### Modificar detalle
`PATCH /api/pedidos-ventas/{id}/detalles/{detalle_id}/`

Permite cambiar `producto`, `cantidad` o `precio_unitario` mientras el pedido esta `pendiente`. Devuelve `nuevo_subtotal` y el detalle actualizado.

### Eliminar detalle
`DELETE /api/pedidos-ventas/{id}/detalles/{detalle_id}/`

Solo si el pedido esta `pendiente`. Devuelve `nuevo_subtotal` y `detalles_restantes`.

## Reglas clave para el front
- `subtotal` siempre viene del backend; no enviarlo.
- Operaciones sobre detalles (agregar/modificar/eliminar) solo son validas en estado `pendiente`.
- Para cancelar usar la accion dedicada (`/cancelar_pedido/`), no un PATCH directo de `estado`.
- Si se transforma en venta y se entrega, el backend marcara el pedido como `completado`; no es editable en ese punto.
