# Notas de Credito (API)

Base URL: `/api/notas-credito/`

Documento para devolver/importes a favor de un contacto, aplicable a ventas o compras segun el tipo. Al crearla impacta saldos y estados de los documentos asociados.

## Modelo
- `id` (int)
- `contacto` (id del cliente/proveedor segun tipo)
- `tipo` (`venta` | `compra`) define a qué se puede aplicar
- `fecha_nota` (date, por defecto hoy)
- `numero_documento` (string, opcional)
- `estado` (`pendiente`, `aplicada`, `cancelada`); se marca `aplicada` al crear
- `motivo` (string, opcional)
- `subtotal`, `total` (decimales, solo lectura; suma de detalles)
- `detalles` (lista: `producto`, `cantidad`, `precio_unitario`)
- `aplicaciones` (lista: `{ venta | compra, monto_aplicado }`, segun tipo)
- timestamps: `creado_en`, `actualizado_en`

### Reglas de validacion
- Debe haber al menos un detalle y al menos una aplicacion.
- Cada detalle requiere `cantidad` > 0 y `precio_unitario` > 0.
- Cada aplicacion requiere una sola referencia: venta O compra.
- El `tipo` debe coincidir: `venta` solo aplica a ventas; `compra` solo a compras.
- `monto_aplicado` > 0 en cada aplicacion.

## Endpoints

### Listar notas de credito
`GET /api/notas-credito/`

Query params:
- `contacto` (id exacto)
- `tipo` (`venta` | `compra`)

Response 200 (ejemplo reducido):
```json
[
  {
    "id": 1,
    "contacto": 3,
    "tipo": "venta",
    "fecha_nota": "2024-01-10",
    "estado": "aplicada",
    "total": "300.00"
  }
]
```

### Obtener una nota
`GET /api/notas-credito/{id}/`

Incluye detalles y aplicaciones:
```json
{
  "id": 1,
  "contacto": 3,
  "tipo": "venta",
  "fecha_nota": "2024-01-10",
  "estado": "aplicada",
  "total": "300.00",
  "detalles": [
    { "producto": 5, "cantidad": "2.00", "precio_unitario": "150.00" }
  ],
  "aplicaciones": [
    { "venta": 10, "monto_aplicado": "300.00" }
  ]
}
```

### Crear nota de credito
`POST /api/notas-credito/`

Body ejemplo (tipo venta):
```json
{
  "contacto": 3,
  "tipo": "venta",
  "motivo": "Devolucion",
  "detalles": [
    { "producto": 5, "cantidad": 2, "precio_unitario": "150.00" }
  ],
  "aplicaciones": [
    { "venta": 10, "monto_aplicado": "300.00" }
  ]
}
```

Comportamiento:
- Calcula `subtotal/total` a partir de los detalles.
- Aplica el monto a las ventas/compras indicadas: reduce `saldo_pendiente` y recalcula `estado_cobro/estado_venta` o `estado_pago` segun corresponda.
- Ajusta `saldo_contacto` del contacto restando el total de la nota.
- Marca la nota como `aplicada`.

### Operaciones no permitidas
- `PUT/PATCH` y `DELETE` devuelven 405: las notas no se editan ni eliminan una vez creadas.

## Reglas clave para el front
- No enviar `subtotal`, `total` ni `estado`; los define el backend.
- Asegurarse de enviar aplicaciones consistentes con el `tipo` y con montos > 0.
- Mostrar la nota como no editable ni eliminable despues de creada.
