# Dominio – Reglas de Negocio

Este módulo contiene **todas las reglas de negocio del sistema**, separadas de:
- Django ORM
- Serializers
- Views
- HTTP

El dominio está dividido en:
- Validaciones y lógica pura (`core/domain`)
- Automatizaciones con efectos colaterales (`core/servicios`)

---

## 1. Principios de diseño

- El dominio **no importa modelos Django**
- Todas las reglas críticas están **cubiertas por tests unitarios**
- Los estados no se setean manualmente: **son derivados**
- El estado `cancelado` **domina siempre**
- Las automatizaciones toleran ausencia de infraestructura (`save()` opcional)

---

## 2. Estructura del dominio

### `core/domain/`
Contiene reglas puras (sin efectos colaterales):

- `logica.py`  
  Funciones auxiliares de cálculo y soporte.

- `validaciones_ventas.py`  
- `validaciones_entrega.py`  
- `validaciones_cobros.py`  
- `validaciones_compras.py`  
- `validaciones_pagos.py`  

Estas validaciones determinan **qué acciones están permitidas**.

---

### `core/servicios/`
Contiene automatizaciones que **mutan estado**:

- `automatizaciones.py`  
  Aplica efectos derivados luego de acciones válidas.

---

## 3. Estados del sistema

### Ventas
- `estado_venta`: `en proceso` | `cancelada` | `completada`
- `estado_entrega`: `pendiente` | `reprogramada` | `entregada` | `cancelada`
- `estado_cobro`: `pendiente` | `parcial` | `cobrado` | `cancelado`

🔒 `estado_cobro` y `estado_entrega` **no son manuales**

---

### Compras
- `estado_compra`: `pendiente` | `recibida` | `cancelada`
- `estado_pago`: `pendiente` | `parcial` | `pagado` | `cancelado`

🔒 `estado_pago` **es siempre derivado**

---

## 4. Validaciones (qué se puede hacer)

Las validaciones viven en `core/domain/validaciones_*.py`.

### Ventas
- No se puede completar manualmente
- No se puede volver atrás desde `cancelada` o `completada`
- No se puede cobrar una venta cancelada

### Cobros
- No se puede cobrar más que el saldo pendiente
- No se puede aplicar montos ≤ 0

### Compras / Pagos
- No se puede pagar una compra cancelada
- No se puede aplicar más que el saldo pendiente
- No se puede crear compra sin pedido validado

Todas estas reglas están **testeadas**.

---

## 5. Automatizaciones (qué pasa después)

Las automatizaciones viven en `core/servicios/automatizaciones.py`.

### Ventas
- `cancelar_venta`
  - saldo_pendiente → 0
  - estado_entrega → cancelada
  - estado_cobro → cancelado
  - impacto contable en contacto

### Cobros
- Aplicar cobro
  - reduce saldo_pendiente
  - reduce saldo_disponible
  - recalcula estado_cobro

### Compras
- `cancelar_compra`
  - saldo_pendiente → 0
  - estado_compra → cancelada
  - estado_pago → cancelado
  - impacto contable en proveedor

### Pagos
- Aplicar pago
  - reduce saldo_pendiente
  - reduce saldo_disponible
  - recalcula estado_pago

---

## 6. Tests de dominio

Todos los flujos críticos están cubiertos por tests unitarios:

- Validaciones:
  - ventas
  - entrega
  - cobros
  - compras
  - pagos

- Automatizaciones:
  - ventas
  - cobros
  - compras
  - pagos

Los tests:
- no usan DB
- no usan ORM
- no usan HTTP

---

## 7. Contrato para capas superiores

Models, serializers y viewsets **deben cumplir**:

- Ejecutar validaciones antes de mutar estado
- No setear estados derivados manualmente
- Ejecutar automatizaciones luego de acciones válidas
- No duplicar reglas de negocio fuera del dominio

---

## 8. Estado del dominio

✔ Dominio cerrado  
✔ Reglas explícitas  
✔ Tests en verde  
✔ Listo para integrar con capas superiores
