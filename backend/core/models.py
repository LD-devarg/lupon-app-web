from django.db import models
from django.utils import timezone as tz
from django.contrib.auth.models import User

class Usuarios(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nombre_completo = models.CharField(max_length=100)
    telefono = models.CharField(max_length=10, blank=True)
    
    # Indica si el usuario tiene permisos de administrador
    es_admin = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    
    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre_completo

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

class Contactos(models.Model):
    TIPO_CHOICES = [
        ('cliente', 'Cliente'),
        ('proveedor', 'Proveedor'),
    ]
    TIPO_CUENTA_CHOICES = [
        ('contado', 'Contado'),
        ('cuenta corriente', 'Cuenta Corriente'),
    ]
    CATEGORIA_CHOICES = [
        ('Mayorista', 'Mayorista'),
        ('Minorista', 'Minorista'),
    ]

    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre = models.CharField(max_length=100)
    nombre_fantasia = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=10, blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    forma_pago = models.CharField(max_length=50, choices=TIPO_CUENTA_CHOICES, blank=True)
    dias_cc = models.IntegerField(default=0)
    saldo_contacto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, blank=True)
    activo = models.BooleanField(default=True)
 
    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Contacto'
        verbose_name_plural = 'Contactos'

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
    
    TIPO_UNIDAD_MEDIDA_CHOICES = [
        ('kg', 'Kilogramo'),
        ('un', 'Unidad'),
    ]

    rubro = models.CharField(max_length=30, choices=RUBRO_CHOICES)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    unidad_medida = models.CharField(max_length=20, choices=TIPO_UNIDAD_MEDIDA_CHOICES)
    
    precio_minorista = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_mayorista = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_oferta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    creado_en = models.DateTimeField(default=tz.now, null=True,)
    actualizado_en = models.DateTimeField(auto_now=True, null=True)
    
    es_oferta = models.BooleanField(default=False)
    fecha_inicio_oferta = models.DateField(null=True, blank=True)
    fecha_fin_oferta = models.DateField(null=True, blank=True)
    
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

class PedidosVentas(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aceptado', 'Aceptado'),
        ('cancelado', 'Cancelado'),
        ('completado', 'Completado'),
    ]

    cliente = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        limit_choices_to={'tipo': 'cliente'}
    )

    fecha_pedido = models.DateField(default=tz.localdate)
    direccion_entrega = models.CharField(max_length=200, blank=True, null=True)
    estado = models.CharField(max_length=50, choices=ESTADO_CHOICES, default='pendiente')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    aclaraciones = models.TextField(blank=True)
    
    motivo_cancelacion = models.TextField(blank=True, null=True)
    fecha_cancelacion = models.DateField(blank=True, null=True)
    
    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_pedido']
        verbose_name = 'Pedido de Venta'
        verbose_name_plural = 'Pedidos de Venta'

    def __str__(self):
        return f"Pedido #{self.id} - {self.cliente.nombre}"

class PedidosVentasDetalle(models.Model):
    pedido_venta = models.ForeignKey(
        PedidosVentas,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=0)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Pedido #{self.pedido_venta.id})"

    class Meta:
        verbose_name = 'Detalle de Pedido de Venta'
        verbose_name_plural = 'Detalles de Pedidos de Venta'

class PedidosCompras(models.Model):
    TIPO_ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('validado', 'Validado'),
        ('cancelado', 'Cancelado'),
        ('recibido', 'Recibido'),
    ]
    
    proveedor = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='pedidos_compras',
        limit_choices_to={'tipo': 'proveedor'}
    )
       
    fecha_pedido = models.DateField(default=tz.localdate)
    estado = models.CharField(max_length=50, choices=TIPO_ESTADO_CHOICES, default='pendiente')
    observaciones = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pedido de Compra #{self.id} - {self.proveedor.nombre}"

class PedidosComprasDetalle(models.Model):
    pedido_compra = models.ForeignKey(
        PedidosCompras,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=0)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Pedido #{self.pedido_compra.id})"
    
    class Meta:
        verbose_name = 'Detalle de Pedido de Compra'
        verbose_name_plural = 'Detalles de Pedidos de Compra'

class Ventas(models.Model):
    ESTADO_ENTREGA_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('entregada', 'Entregada'),
        ('cancelada', 'Cancelada'),
        ('reprogramada', 'Reprogramada'),
    ]
    
    ESTADO_VENTA_CHOICES = [
        ('en proceso', 'En Proceso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]    
    
    FORMA_PAGO_CHOICES = [
        ('cuenta corriente', 'Cuenta Corriente'),
        ('contado', 'Contado'),
        ('contado pendiente', 'Contado Pendiente'),
    ]
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
    ]
    ESTADO_COBRO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('cobrado', 'Cobrado'),
        ('parcial', 'Parcial'),
        ('cancelado', 'Cancelado'),
    ]

    pedido_venta = models.ForeignKey(PedidosVentas, on_delete=models.CASCADE, related_name='ventas')
    pedido_compra = models.ForeignKey(
        PedidosCompras,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='ventas'
    )
    
    fecha_venta = models.DateField(default=tz.localdate)
    cliente = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='ventas',
        limit_choices_to={'tipo': 'cliente'}
    )
    direccion_entrega = models.CharField(max_length=200, blank=True, null=True)
    fecha_entrega = models.DateField(null=True, blank=True)
    fecha_reprogramada = models.DateField(null=True, blank=True)
    
    fecha_cancelacion = models.DateField(null=True, blank=True)
    motivo_cancelacion = models.TextField(blank=True, null=True)
    estado_venta = models.CharField(max_length=20, choices=ESTADO_VENTA_CHOICES, default='en proceso')

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    costo_entrega = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    forma_pago = models.CharField(max_length=50, choices=FORMA_PAGO_CHOICES)

    estado_entrega = models.CharField(max_length=20, choices=ESTADO_ENTREGA_CHOICES, default='pendiente')

    estado_cobro = models.CharField(max_length=20, choices=ESTADO_COBRO_CHOICES, default='pendiente')
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vencimiento = models.DateField(null=True, blank=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_venta']

    def __str__(self):
        return f"Venta #{self.id} - Pedido #{self.pedido_venta.id}" 
       
class VentasDetalle(models.Model):
    venta = models.ForeignKey(
        Ventas,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Venta #{self.venta.id})"
    
class Cobros(models.Model):
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
    ]

    cliente = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='cobros',
        limit_choices_to={'tipo': 'cliente'}
    )

    fecha_cobro = models.DateField(default=tz.localdate)
    medio_pago = models.CharField(max_length=50, choices=MEDIO_PAGO_CHOICES)
    monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    saldo_disponible = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    observaciones = models.CharField(max_length=255, blank=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_cobro']

    def __str__(self):
        return f"Cobro #{self.id} - {self.cliente.nombre} - {self.monto}"
    
class CobrosDetalle(models.Model):
    cobro = models.ForeignKey(
        Cobros,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    venta = models.ForeignKey(
        Ventas,
        on_delete=models.CASCADE,
        related_name='cobros_detalle'
    )
    monto_aplicado = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Cobro Detalle #{self.id} - Cobro #{self.cobro.id} - Venta #{self.venta.id}"

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

    ESTADO_PAGO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('parcial', 'Parcial'),
        ('cancelado', 'Cancelado'),
    ]
    
    ESTADO_COMPRA_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('recibida', 'Recibida'),
        ('cancelada', 'Cancelada'),
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

    fecha_compra = models.DateField(default=tz.localdate)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    extra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    forma_pago = models.CharField(max_length=50, choices=FORMA_PAGO_CHOICES)
    estado_pago = models.CharField(max_length=20, choices=ESTADO_PAGO_CHOICES, default='pendiente')
    estado_compra = models.CharField(max_length=20, choices=ESTADO_COMPRA_CHOICES, default='pendiente')
    motivo_cancelacion = models.TextField(blank=True, null=True)
    fecha_cancelacion = models.DateField(blank=True, null=True)

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
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Compra #{self.compra.id})"

class Pagos(models.Model):
    MEDIO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
    ]

    proveedor = models.ForeignKey(
        Contactos,
        on_delete=models.CASCADE,
        related_name='pagos',
        limit_choices_to={'tipo': 'proveedor'}
    )

    fecha_pago = models.DateField(default=tz.localdate)
    medio_pago = models.CharField(max_length=50, choices=MEDIO_PAGO_CHOICES)
    monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    saldo_disponible = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    observaciones = models.CharField(max_length=255, blank=True)

    creado_en = models.DateTimeField(default=tz.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_pago']

    def __str__(self):
        return f"Pago #{self.id} - {self.proveedor.nombre} - {self.monto}"

class PagosDetalle(models.Model):
    pago = models.ForeignKey(
        Pagos,
        on_delete=models.CASCADE,
        related_name='detalles'
    )
    compra = models.ForeignKey(
        Compras,
        on_delete=models.CASCADE,
        related_name='pagos_detalle'
    )
    monto_aplicado = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Pago Detalle #{self.id} - Pago #{self.pago.id} - Compra #{self.compra.id}"

    class Meta:
        verbose_name = 'Detalle de Pago'
        verbose_name_plural = 'Detalles de Pagos'

