Tests de viewsets (capa API)

- Qué se prueba: endpoints REST para ventas, compras, cobros, pagos, pedidos de compras y pedidos de ventas. Se crean usuarios autenticados con `APIClient`, se envían payloads JSON y se valida que los códigos HTTP y respuestas sean correctos. Se cubren flujos clave como creación de documentos, cambios de estado de entrega, cancelaciones y añadir detalles, incluyendo restricciones (p.ej. no cancelar ventas completadas ni cobrar ventas canceladas).
- Por qué da confianza: al ejercitar la capa HTTP completa, estos tests aseguran que rutas, permisos, serialización y orquestación con la lógica de dominio funcionan en conjunto. Si una regresión rompiera un flujo crítico, se detecta aquí antes de llegar a producción.
