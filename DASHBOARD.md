# Dashboard Financiero – Especificación Funcional y Técnica

Este documento define **qué métricas se exponen**, **cómo se calculan** y **qué filtros aplican** para el dashboard financiero del sistema. La especificación está **100% alineada** con los modelos, serializers y views existentes (Ventas, Compras, Cobros, Pagos, Contactos, Notas de Crédito).

El objetivo del dashboard es **operativo y financiero**: permitir tomar decisiones sobre rentabilidad, liquidez, deuda y riesgo, sin reinterpretaciones contables fuera del modelo actual.

---

## 1. Alcance y principios

* Fuente de verdad: **base de datos** (no cálculos en frontend).
* Se respetan:

  * estados (`estado_venta`, `estado_cobro`, `estado_compra`, `estado_pago`)
  * saldos persistidos (`saldo_pendiente`, `saldo_contacto`, `saldo_disponible`)
* El dashboard **no modifica datos**, solo consulta.
* Todas las métricas soportan **filtros por rango de fechas**.

---

## 2. Filtros globales del dashboard

### 2.1 Rango de fechas

**Campo base según entidad:**

* Ventas → `fecha_venta`
* Compras → `fecha_compra`
* Cobros → `fecha_cobro`
* Pagos → `fecha_pago`

El rango afecta **todas las métricas**, salvo que se indique explícitamente lo contrario.

### 2.2 Filtros adicionales (opcionales)

* Cliente (`Contactos.tipo = cliente`)
* Proveedor (`Contactos.tipo = proveedor`)
* Forma de pago
* Estado de cobro / pago

---

## 3. Métricas financieras (Cards principales)

### 3.1 Ventas Totales

**Definición**

```
Σ Ventas.total
```

**Condiciones**

* `estado_venta != 'cancelada'`
* Dentro del rango de fechas

**Desglose recomendado**

* Ventas cobradas: `estado_cobro = 'cobrado'`
* Ventas parciales: `estado_cobro = 'parcial'`
* Ventas pendientes: `estado_cobro = 'pendiente'`

---

### 3.2 Compras Totales

**Definición**

```
Σ Compras.total
```

**Condiciones**

* `estado_compra != 'cancelada'`
* Dentro del rango de fechas

**Desglose**

* Compras pagadas (`estado_pago = 'pagado'`)
* Compras parciales
* Compras pendientes

---

### 3.3 Ganancia Bruta

**Definición**

```
Ganancia Bruta = Σ Ventas.total − Σ Compras.total
```

**Notas importantes**

* No contempla gastos operativos (fletes, estructura, etc.).
* Es una métrica **operativa**, no contable.

---

### 3.4 Margen Bruto (%)

**Definición**

```
Margen = Ganancia Bruta / Ventas Totales
```

---

## 4. Liquidez y caja

### 4.1 Ingresos de Caja

**Definición**

```
Σ Cobros.monto
```

**Condiciones**

* Fecha dentro del rango

**Desglose**

* Por `medio_pago` (efectivo / transferencia)

---

### 4.2 Egresos de Caja

**Definición**

```
Σ Pagos.monto
```

---

### 4.3 Flujo Neto de Caja

**Definición**

```
Flujo Neto = Ingresos de Caja − Egresos de Caja
```

> ⚠️ No es ganancia. Refleja **movimiento de dinero**, no rentabilidad.

---

## 5. Deuda y riesgo financiero

### 5.1 Deuda Total de Clientes

**Definición**

```
Σ Ventas.saldo_pendiente
```

**Condiciones**

* `estado_venta != 'cancelada'`
* `saldo_pendiente > 0`

---

### 5.2 Clientes con Deuda (tabla)

**Fuente**: `Contactos`

**Columnas sugeridas**

* Cliente
* Deuda total (`saldo_contacto`)
* Cantidad de ventas pendientes
* Último cobro

**Orden por defecto**

* Deuda descendente

---

### 5.3 Documentos por Vencer (Ventas)

**Condición**

```
Ventas.vencimiento >= hoy
AND saldo_pendiente > 0
```

**Agrupación**

* Hoy
* Próximos 7 días
* Próximos 30 días

---

### 5.4 Documentos Vencidos

**Condición**

```
Ventas.vencimiento < hoy
AND saldo_pendiente > 0
```

---

## 6. Compras y obligaciones

### 6.1 Deuda con Proveedores

**Definición**

```
Σ Compras.saldo_pendiente
```

**Condiciones**

* `estado_compra != 'cancelada'`

---

### 6.2 Compras Pendientes de Pago

Tabla con:

* Proveedor
* Número de documento
* Fecha compra
* Saldo pendiente
* Estado de pago

---

## 7. Notas de Crédito (impacto en métricas)

### 7.1 Principio

Las **Notas de Crédito ya impactan** en:

* `saldo_pendiente` de ventas o compras
* `saldo_contacto`

Por lo tanto:

* **NO se recalculan manualmente** en el dashboard.
* Las métricas usan los valores persistidos post-aplicación.

---

## 8. Métricas derivadas (fase 2)

Estas métricas pueden incorporarse sin cambiar el modelo:

### 8.1 Ticket promedio

```
Ventas Totales / Cantidad de Ventas
```

### 8.2 Tiempo promedio de cobro

```
fecha_cobro − fecha_venta
```

(promedio por venta)

---

## 9. Métricas explícitamente fuera de alcance

* Costos indirectos
* Resultados contables formales
* Stock (no implementado)
* Proyecciones futuras

---

## 10. Resumen conceptual

* **Ventas y compras** miden rentabilidad
* **Cobros y pagos** miden liquidez
* **Saldos pendientes** miden riesgo
* **Dashboard ≠ contabilidad**

Este README define el contrato funcional para el dashboard. Cualquier nueva métrica debe:

1. Mapearse a un campo existente
2. Respetar estados y automatizaciones actuales
3. No romper coherencia de saldos
