from django.db import models
from django.utils import timezone as tz


# ============================================================
# CONTACTOS
# ============================================================

class Contactos(models.Model):
    TIPO_CHOICES = [
        ('cliente', 'Cliente'),
        ('proveedor', 'Proveedor'),
    ]
    TIPO_CUENTA_CHOICES = [
        ('contado', 'Contado'),
        ('cuenta corriente', 'Cuenta Corriente'),
    ]

    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    calle = models.CharField(max_length=200, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    provincia = models.CharField(max_length=100, blank=True, default='Buenos Aires')
    tipo_pago = models.CharField(max_length=50, choices=TIPO_CUENTA_CHOICES, blank=True)
    activo = models.BooleanField(default=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Contacto'
        verbose_name_plural = 'Contactos'


# ============================================================
# PRODUCTOS
# ============================================================

class Productos(models.Model):
    RUBRO_CHOICES = [
        ('pollo entero', 'Pollo Entero'),
        ('trozados y derivados', 'Trozados y Derivados'),
        ('prefritos', 'Prefritos'),
        ('elaborados', 'Elaborados'),
        ('huevos', 'Huevos'),
        ('panificados', 'Panificados'),
        ('vegetales', 'Vegetales'),
        ('cerdo', 'Cerdo'),
    ]

    rubro = models.CharField(max_length=30, choices=RUBRO_CHOICES)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    activo = models.BooleanField(default=True)

    creado_en = models.DateField(default=tz.now, null=True)
    actualizado_en = models.DateField(auto_now=True, null=True)

    es_oferta = models.BooleanField(default=False)
    precio_oferta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    fecha_inicio_oferta = models.DateTimeField(null=True, blank=True)
    fecha_fin_oferta = models.DateTimeField(null=True, blank=True)

    @property
    def precio_actual(self):
        if self.es_oferta and self.precio_oferta is not None:
            return self.precio_oferta
        return self.precio

    def __str__(self):
        return self.nombre

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'


# ============================================================
# PEDIDOS DE VENTAS
# ============================================================

class PedidosVentas(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aceptado', 'Aceptado'),
        ('cancelado', 'Cancelado'),
    ]

    cliente = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        limit_choices_to={'tipo': 'cliente'}
    )

    fecha_pedido = models.DateTimeField(default=tz.now)
    fecha_entrega = models.DateTimeField(blank=True, null=True)
    direccion_entrega = models.CharField(max_length=200, blank=True, null=True)

    estado = models.CharField(max_length=50, choices=ESTADO_CHOICES, default='pendiente')

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_pedido']
        verbose_name = 'Pedido de Venta'
        verbose_name_plural = 'Pedidos de Venta'

    def __str__(self):
        return f"Pedido #{self.id} - {self.cliente.nombre}"

    @property
    def total(self):
        return sum(d.cantidad * d.precio_unitario for d in self.detalles.all())


class PedidosVentasDetalle(models.Model):
    pedido = models.ForeignKey(
        PedidosVentas,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        if not self.precio_unitario:
            self.precio_unitario = self.producto.precio
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Pedido #{self.pedido.id})"

    class Meta:
        verbose_name = 'Detalle de Pedido de Venta'
        verbose_name_plural = 'Detalles de Pedidos de Venta'


# ============================================================
# VENTAS
# ============================================================

class Ventas(models.Model):
    ESTADO_ENTREGA_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('entregado', 'Entregada'),
        ('cancelado', 'Cancelada'),
    ]
    FORMA_PAGO_CHOICES = [
        ('cuenta corriente', 'Cuenta Corriente'),
        ('contado', 'Contado'),
    ]
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]
    ESTADO_COBRO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('cobrado', 'Cobrado'),
        ('parcial', 'Parcial'),
    ]

    pedido = models.ForeignKey(PedidosVentas, on_delete=models.CASCADE, related_name='ventas')
    fecha_venta = models.DateField(default=tz.now)
    costo_entrega = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    forma_pago = models.CharField(max_length=50, choices=FORMA_PAGO_CHOICES)
    medio_pago = models.CharField(max_length=50, choices=MEDIO_PAGO_CHOICES)

    estado_entrega = models.CharField(max_length=20, choices=ESTADO_ENTREGA_CHOICES, default='pendiente')
    estado_cobro = models.CharField(max_length=20, choices=ESTADO_COBRO_CHOICES, default='pendiente')

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_venta']

    def __str__(self):
        return f"Venta #{self.id} - Pedido #{self.pedido.id}"

    @property
    def subtotal(self):
        return sum(d.cantidad * d.precio_unitario for d in self.pedido.detalles.all())

    @property
    def total(self):
        return self.subtotal + self.costo_entrega


# ============================================================
# PEDIDOS DE COMPRAS
# ============================================================

class PedidosCompras(models.Model):
    proveedor = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='pedidos_compras',
        limit_choices_to={'tipo': 'proveedor'}
    )
    fecha_pedido = models.DateField(default=tz.now)
    cerrado = models.BooleanField(default=False)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pedido de Compra #{self.id} - {self.proveedor.nombre}"


class PedidosComprasDetalle(models.Model):
    pedido = models.ForeignKey(
        PedidosCompras,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE)

    cantidad_total = models.IntegerField()
    rubro = models.CharField(max_length=30, choices=Productos.RUBRO_CHOICES)


# ============================================================
# COMPRAS
# ============================================================

class Compras(models.Model):
    FORMA_PAGO_CHOICES = [
        ('cuenta corriente', 'Cuenta Corriente'),
        ('contado', 'Contado'),
    ]
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]

    pedido_compra = models.ForeignKey(
        PedidosCompras,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='compras'
    )

    proveedor = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='compras',
        limit_choices_to={'tipo': 'proveedor'}
    )

    fecha_compra = models.DateTimeField(default=tz.now)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    extra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    forma_pago = models.CharField(max_length=50, choices=FORMA_PAGO_CHOICES)
    medio_pago = models.CharField(max_length=50, choices=MEDIO_PAGO_CHOICES)
    estado_pago = models.CharField(max_length=20, default='pendiente')

    observaciones = models.CharField(max_length=255, blank=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_compra']

    def __str__(self):
        if self.pedido_compra:
            return f"Compra #{self.id} - {self.proveedor.nombre} (PC #{self.pedido_compra.id})"
        return f"Compra #{self.id} - {self.proveedor.nombre}"


class ComprasDetalle(models.Model):
    compra = models.ForeignKey(
        Compras,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE)

    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Compra #{self.compra.id})"


# ============================================================
# COBROS / PAGOS
# ============================================================

class Cobros(models.Model):
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]

    cliente = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='cobros',
        limit_choices_to={'tipo': 'cliente'}
    )

    venta = models.ForeignKey(
        'Ventas',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='cobros'
    )

    fecha_cobro = models.DateTimeField(default=tz.now)
    medio_pago = models.CharField(max_length=50, choices=MEDIO_PAGO_CHOICES)
    importe = models.DecimalField(max_digits=12, decimal_places=2)

    referencia = models.CharField(max_length=100, blank=True)
    observaciones = models.CharField(max_length=255, blank=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_cobro']

    def __str__(self):
        return f"Cobro #{self.id} - {self.cliente.nombre} - {self.importe}"


class Pagos(models.Model):
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]

    proveedor = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='pagos',
        limit_choices_to={'tipo': 'proveedor'}
    )

    compra = models.ForeignKey(
        Compras,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='pagos'
    )

    fecha_pago = models.DateTimeField(default=tz.now)
    medio_pago = models.CharField(max_length=50, choices=MEDIO_PAGO_CHOICES)
    importe = models.DecimalField(max_digits=12, decimal_places=2)

    referencia = models.CharField(max_length=100, blank=True)
    observaciones = models.CharField(max_length=255, blank=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_pago']

    def __str__(self):
        return f"Pago #{self.id} - {self.proveedor.nombre} - {self.importe}"


# ============================================================
# CUENTA CORRIENTE
# ============================================================

class CuentaCorrienteMovimiento(models.Model):

    TIPO_CHOICES = [
        ('venta', 'Venta (cliente te debe)'),
        ('cobro', 'Cobro (cliente paga)'),
        ('compra', 'Compra (vos debés al proveedor)'),
        ('pago', 'Pago a proveedor'),
        ('ajuste', 'Ajuste manual'),
    ]

    contacto = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='ctacte_movimientos'
    )

    fecha = models.DateTimeField(default=tz.now)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    detalle = models.CharField(max_length=200, blank=True)
    monto = models.DecimalField(max_digits=12, decimal_places=2)

    venta = models.ForeignKey(
        Ventas,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )
    cobro = models.ForeignKey(
        Cobros,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )
    compra = models.ForeignKey(
        Compras,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )
    pago = models.ForeignKey(
        Pagos,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['fecha', 'id']
        verbose_name = 'Movimiento Cuenta Corriente'
        verbose_name_plural = 'Movimientos de Cuenta Corriente'

    def __str__(self):
        return f"{self.contacto.nombre} - {self.tipo} - {self.monto}"

    @property
    def signo(self):
        if self.tipo in ['venta', 'compra']:
            return +1
        if self.tipo in ['cobro', 'pago']:
            return -1
        return +1


    TIPO_CHOICES = [
        ('venta', 'Venta (cliente te debe)'),
        ('cobro', 'Cobro (cliente paga)'),
        ('compra', 'Compra (vos debés al proveedor)'),
        ('pago', 'Pago a proveedor'),
        ('ajuste', 'Ajuste manual'),
    ]

    contacto = models.ForeignKey(
        'Contactos',
        on_delete=models.CASCADE,
        related_name='ctacte_movimientos'
    )

    fecha = models.DateTimeField(default=tz.now)

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    detalle = models.CharField(max_length=200, blank=True)

    # El monto siempre es positivo.
    monto = models.DecimalField(max_digits=12, decimal_places=2)

    # Relación contable real
    venta = models.ForeignKey(
        'Ventas',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )

    cobro = models.ForeignKey(
        'Cobros',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )

    compra = models.ForeignKey(
        'Compras',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )

    pago = models.ForeignKey(
        'Pagos',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mov_cta_cte'
    )

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['fecha', 'id']
        verbose_name = 'Movimiento Cuenta Corriente'
        verbose_name_plural = 'Movimientos de Cuenta Corriente'

    def __str__(self):
        return f"{self.contacto.nombre} - {self.tipo} - {self.monto}"

    @property
    def signo(self):
        """
        Devuelve +1 o -1 según el tipo de movimiento.
        Esto es el corazón del saldo contable.
        """
        if self.tipo in ['venta', 'compra']:
            return +1
        if self.tipo in ['cobro', 'pago']:
            return -1
        return +1  # ajustes positivos por default