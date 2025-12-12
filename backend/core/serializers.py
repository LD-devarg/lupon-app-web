from rest_framework import serializers
from django.utils import timezone 
from .models import Usuarios, Contactos, Productos, PedidosVentas, PedidosVentasDetalle, Ventas, VentasDetalle, Cobros, CobrosDetalle, PedidosCompras, PedidosComprasDetalle, Compras, ComprasDetalle, Pagos, PagosDetalle
from rest_framework.exceptions import ValidationError
from .domain.logica import calcular_subtotal, calcular_total
from .domain.validaciones_ventas import validar_cambio_estado_venta, validar_cambio_estado_pedido_venta, validar_venta
from .domain.validaciones_cobros import validar_cobro, validar_actualizacion_cobro
from .domain.validaciones_compras import validar_cambio_estado_compra, validar_cambio_estado_pedido_compra, validar_compra, validar_modificacion_pedido_compra
from .servicios.automatizaciones import saldos_al_crear_venta, saldos_al_crear_cobro, saldos_al_crear_cobro_detalle, actualizar_estado_ventas_al_cobrar
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction

# ============================================================
# Serializers
# ============================================================

# Usuarios

class UsuariosSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", required=False)
    password = serializers.CharField(write_only=True, required=False)
    username = serializers.CharField(source="user.username", required=False)

    class Meta:
        model = Usuarios
        fields = [
            "id",
            "username",
            "password",
            "email",
            "nombre_completo",
            "telefono",
            "es_admin",
        ]
        read_only_fields = ["nombre_completo"]  # NO se modifica

    def update(self, instance, validated_data):
        # Extraer datos de user
        user_data = validated_data.pop("user", {})

        user = instance.user

        # Username
        if "username" in user_data:
            user.username = user_data["username"]

        # Email
        if "email" in user_data:
            user.email = user_data["email"]

        # Password
        password = validated_data.pop("password", None)
        if password:
            user.set_password(password)

        user.save()

        # Campos del perfil (Usuarios)
        if "telefono" in validated_data:
            instance.telefono = validated_data["telefono"]

        # nombre_completo NO se modifica (read_only lo impide)

        instance.save()
        return instance

class ResetearContrasenaSerializer(serializers.Serializer):
    nueva_contrasena = serializers.CharField(required=True)

class CambiarContrasenaSerializer(serializers.Serializer):
    password_actual = serializers.CharField(required=True)
    password_nueva = serializers.CharField(required=True)
    password_confirmacion = serializers.CharField(required=True)
    
class CambiarEmailSerializer(serializers.Serializer):
    nuevo_email = serializers.EmailField(required=True)
    
class CambiarEstadoUsuarioSerializer(serializers.Serializer):
    TIPO_ESTADO = [
        (True, "Activo"),
        (False, "Inactivo"),
    ]
    
    activo = serializers.ChoiceField(choices=TIPO_ESTADO, required=True)

# Contactos

class ContactosSerializer(serializers.ModelSerializer):
    calle = serializers.CharField(required=False, write_only=True)
    numero = serializers.CharField(required=False, write_only=True)
    ciudad = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = Contactos
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'saldo_contacto', 'direccion']
    
    # Validaciones de input
    
    def create (self, validated_data):
        calle = validated_data.pop('calle', '')
        numero = validated_data.pop('numero', '')
        ciudad = validated_data.pop('ciudad', '')

        validated_data['direccion'] = f"{calle} {numero}, {ciudad}, Buenos Aires, Argentina"
        
        return Contactos.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        calle = validated_data.pop('calle', None)
        numero = validated_data.pop('numero', None)
        ciudad = validated_data.pop('ciudad', None)

        if calle and numero and ciudad:
            instance.direccion = f"{calle} {numero}, {ciudad}, Buenos Aires, Argentina"

        # actualizar el resto de los campos del modelo
        return super().update(instance, validated_data)
    
    def validate(self, data):
        # Si la forma de pago es "Contado" debe tener dias_cc == 0
        if data.get('forma_pago') == 'contado' and data.get('dias_cc', 0) != 0:
            raise ValidationError("Si la forma de pago es 'Contado', los dias de credito deben ser 0.")

        # Si la forma de pago es "Cuenta Corriente" debe tener dias_cc > 0
        if data.get('forma_pago') == 'cuenta corriente' and data.get('dias_cc', 0) == 0:
            raise ValidationError("Si la forma de pago es 'Cuenta Corriente', los dias de credito deben ser mayores a 0.")

        return data
 
            
# Productos

class ProductosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Productos
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'precio_minorista', 'precio_mayorista', 'precio_oferta']

# Pedidos de Ventas

class PedidosVentasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidosVentasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'pedido_venta']

class PedidosVentasSerializer(serializers.ModelSerializer):
    # Vinculular detalles al serializer
    detalles = PedidosVentasDetalleSerializer(many=True)
    
    class Meta:
        model = PedidosVentas
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'subtotal']
        
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        
        pedido = PedidosVentas.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            PedidosVentasDetalle.objects.create(pedido_venta=pedido, **detalle_data)
            
        subtotal = calcular_subtotal(pedido.detalles.all())
        pedido.subtotal = subtotal
        pedido.save()
        
        return pedido
    
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        
        # Si hay cambio de estado, validar
        estado_actual = instance.estado
        nuevo_estado = validated_data.get('estado', estado_actual)
        
        if nuevo_estado != estado_actual:
            validar_cambio_estado_pedido_venta(instance, nuevo_estado)        
        
        # Actualizar campos del pedido
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Actualizar detalles
        if detalles_data is not None:
            instance.detalles.all().delete()
            for detalle_data in detalles_data:
                PedidosVentasDetalle.objects.create(pedido_venta=instance, **detalle_data)
        
        subtotal = calcular_subtotal(instance.detalles.all())
        instance.subtotal = subtotal
        instance.save()
        
        return instance

class CancelarPedidoVentaSerializer(serializers.Serializer):
    motivo_cancelacion = serializers.CharField(required=True)
    fecha_cancelacion = serializers.DateField(required=False)

# Ventas

class VentasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VentasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'venta']

class VentasSerializer(serializers.ModelSerializer):
    # Vinculular detalles al serializer
    detalles = VentasDetalleSerializer(many=True)
    
    class Meta:
        model = Ventas
        fields = [
            'id',
            'pedido_venta',
            'fecha_venta',
            'cliente',
            'direccion_entrega',
            'fecha_entrega',
            'observaciones',
            'detalles',
            'subtotal',
            'costo_entrega',
            'descuento',
            'total',
            'saldo_pendiente',
            'estado_venta',
            'estado_cobro',
            'estado_entrega',
            'vencimiento',
            ]
        read_only_fields = ['subtotal', 'total', 'saldo_pendiente', 'estado_venta', 'estado_cobro', 'vencimiento']
    
    
    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        
        # Validaciones antes de crear la venta
        validar_venta(validated_data)
        
        venta = Ventas.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            VentasDetalle.objects.create(venta=venta, **detalle_data)
            
        subtotal = calcular_subtotal(venta.detalles.all())
        total = calcular_total(subtotal=subtotal, costo_entrega=venta.costo_entrega, descuento=venta.descuento)
        
        venta.subtotal = subtotal
        venta.total = total
        venta.saldo_pendiente = venta.total # Inicialmente el saldo pendiente es igual al total
        venta.save(update_fields=['subtotal', 'total', 'saldo_pendiente'])
        
        saldos_al_crear_venta(venta)
        return venta

class CambiarEstadoVentaSerializer(serializers.Serializer):
    TIPO_ESTADO_ENTREGA = [
        'Pendiente',
        'Reprogramada',
        'Entregada',
        'Cancelada',
    ]
    
    estado_entrega = serializers.ChoiceField(choices=TIPO_ESTADO_ENTREGA, required=True)
class NuevaFechaEntregaSerializer(serializers.Serializer):
    nueva_fecha = serializers.DateField(required=True)

class CancelarVentaSerializer(serializers.Serializer):
    motivo_cancelacion = serializers.CharField(required=True)

# Cobros

class CobrosDetalleSerializer(serializers.ModelSerializer):
    venta = serializers.PrimaryKeyRelatedField(queryset=Ventas.objects.all())
    
    class Meta:
        model = CobrosDetalle
        fields = ['venta', 'monto_aplicado']
        read_only_fields = ['id', 'cobro']

class CobrosSerializer(serializers.ModelSerializer):
    detalles = CobrosDetalleSerializer(many=True)
    
    class Meta:
        model = Cobros
        fields = [
                  'id',
                  'cliente',
                  'fecha_cobro',
                  'medio_pago',
                  'monto',
                  'observaciones',
                  'saldo_disponible',
                  'detalles'
            ]
        read_only_fields = ['creado_en', 'actualizado_en']
        
    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        
        # Validar el cobro antes de crearlo
        validar_cobro(validated_data, detalles_data)
        
        cobro = Cobros.objects.create(**validated_data)
        
        saldos_al_crear_cobro(cobro)

        for detalle_data in detalles_data:
            print("DETALLE DATA:", detalle_data)
            detalle = CobrosDetalle.objects.create(cobro=cobro, **detalle_data)
            
            saldos_al_crear_cobro_detalle(detalle)             
        
        actualizar_estado_ventas_al_cobrar(cobro)
        
        return cobro
    
# Este update NO reemplaza los detalles existentes.
# Solamente agrega nuevos detalles que usan el saldo_disponible.
# Las validaciones del saldo y coherencia están en validar_cobro().

    @transaction.atomic
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)

        validar_actualizacion_cobro(instance, validated_data, detalles_data or [])
        
        # Actualizar datos simples del cobro (si corresponde)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # AGREGAR detalles nuevos, NO borrar los existentes
        if detalles_data:
            
            for detalle_data in detalles_data:

                detalle = CobrosDetalle.objects.create(
                    cobro=instance,
                    **detalle_data
                )

                # Actualiza saldo pendiente de la venta + estado
                saldos_al_crear_cobro_detalle(detalle)

            instance.save(update_fields=['saldo_disponible'])

        # Revisar si alguna venta quedó completamente pagada
        actualizar_estado_ventas_al_cobrar(instance)

        return instance

# Pedidos de Compras

class PedidosComprasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidosComprasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'pedido_compra']

class PedidosComprasSerializer(serializers.ModelSerializer):
    # Vinculular detalles al serializer
    detalles = PedidosComprasDetalleSerializer(many=True)
    
    class Meta:
        model = PedidosCompras
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'subtotal']
        
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        
        pedido = PedidosCompras.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            PedidosComprasDetalle.objects.create(pedido_compra=pedido, **detalle_data)
            
        subtotal = calcular_subtotal(pedido.detalles.all())
        pedido.subtotal = subtotal
        pedido.save()
        
        return pedido
    
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        nuevo_estado = validated_data.get('estado', instance.estado)
        
        if 'estado' in validated_data:
            validar_cambio_estado_pedido_compra(instance, nuevo_estado)
        
        if detalles_data is not None:
            if instance.estado != 'Pendiente':
                raise ValidationError("No se pueden modificar los detalles de un Pedido de Compra que no esté en estado 'Pendiente'.")
            validar_modificacion_pedido_compra(instance)
            
        # Actualizar campos del pedido
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Actualizar detalles
        if detalles_data is not None:
            for detalle_data in detalles_data:
                PedidosComprasDetalle.objects.create(pedido_compra=instance, **detalle_data)
        
        subtotal = calcular_subtotal(instance.detalles.all())
        instance.subtotal = subtotal
        instance.save()
        
        return instance
    
# Compras

class ComprasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComprasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'compra']

class ComprasSerializer(serializers.ModelSerializer):
    detalles = ComprasDetalleSerializer(many=True)

    class Meta:
        model = Compras
        fields = [
            'id',
            'proveedor',
            'pedido_compra',
            'fecha_compra',
            'extra',
            'estado_compra',
            'descuento',
            'observaciones',
            'detalles',
            'subtotal',
            'total',
            'saldo_pendiente',
            'estado_pago',
            ]
        read_only_fields = ['subtotal', 'total', 'saldo_pendiente', 'estado_pago']

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])

        # Validación de negocio principal
        validar_compra(validated_data)

        # Validar detalles antes de crear nada
        if not detalles_data:
            raise ValidationError("La compra debe contener al menos un detalle.")

        for d in detalles_data:
            if d.get("cantidad", 0) <= 0:
                raise ValidationError("La cantidad debe ser mayor a cero.")
            if d.get("precio_unitario", 0) <= 0:
                raise ValidationError("El precio unitario debe ser mayor a cero.")

        # Normalizar valores numéricos
        extra = validated_data.get('extra') or 0
        descuento = validated_data.get('descuento') or 0

        compra = Compras.objects.create(**validated_data)

        # Crear detalles
        for detalle_data in detalles_data:
            ComprasDetalle.objects.create(compra=compra, **detalle_data)

        # Calcular totales
        subtotal = calcular_subtotal(compra.detalles.all())
        total = calcular_total(subtotal=subtotal, extra=extra, descuento=descuento)

        compra.subtotal = subtotal
        compra.total = total
        compra.save(update_fields=['subtotal', 'total'])

        return compra
        
class CambiarEstadoCompraSerializer(serializers.Serializer):
    estado_compra = serializers.CharField(required=True)

class CancelarCompraSerializer(serializers.Serializer):
    motivo_cancelacion = serializers.CharField(required=True)

        
        
# Pagos Serializer

# Pagos Detalle Serializer