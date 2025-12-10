from rest_framework import serializers
from django.utils import timezone 
from .models import Usuarios, Contactos, Productos, PedidosVentas, PedidosVentasDetalle, Ventas, VentasDetalle, Cobros, CobrosDetalle, PedidosCompras, PedidosComprasDetalle, Compras, ComprasDetalle, Pagos, PagosDetalle
from rest_framework.exceptions import ValidationError
from .domain.logica import calcular_subtotal, calcular_total
from .domain.validaciones_ventas import validar_cambio_estado_venta
from django.db import transaction

# ============================================================
# Serializers
# ============================================================

# ============================================================
# Usuarios Serializer
# ============================================================

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

# ===========================================================
# Contactos Serializer
# ===========================================================

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
 
# ============================================================            
# Productos Serializer
# ============================================================

class ProductosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Productos
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'precio_minorista', 'precio_mayorista', 'precio_oferta']

# ============================================================  
# Pedidos de Ventas Serializer
# ============================================================

# Detalles

class PedidosVentasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidosVentasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'pedido_venta']

# Global

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
        detalles_data = validated_data.pop('detalles', [])
        
        # Actualizar campos del pedido
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Actualizar detalles
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

# ============================================================
# Ventas Serializer
# ============================================================

# Detalles

class VentasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VentasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'venta']

# Global

class VentasSerializer(serializers.ModelSerializer):
    # Vinculular detalles al serializer
    detalles = VentasDetalleSerializer(many=True)
    
    class Meta:
        model = Ventas
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'subtotal', 'total', 'saldo_pendiente']
    
    
    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        
        venta = Ventas.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            VentasDetalle.objects.create(venta=venta, **detalle_data)
            
        subtotal = calcular_subtotal(venta.detalles.all())
        total = calcular_total(subtotal=subtotal, costo_entrega=venta.costo_entrega, descuento=venta.descuento)
        
        venta.subtotal = subtotal
        venta.total = total
        venta.saldo_pendiente = venta.total # Inicialmente el saldo pendiente es igual al total
        venta.save(update_fields=['subtotal', 'total', 'saldo_pendiente'])
        
        return venta

class CambiarEstadoVentaSerializer(serializers.Serializer):
    TIPO_ESTADO_ENTREGA = [
        'Pendiente',
        'Reprogramada',
        'Entregada',
        'Cancelada',
    ]
    
    nuevo_estado = serializers.ChoiceField(choices=TIPO_ESTADO_ENTREGA, required=True)

class NuevaFechaEntregaSerializer(serializers.Serializer):
    nueva_fecha = serializers.DateField(required=True)

# Cobros Serializer

# Cobros Detalle Serializer

# Pedidos de Compras Serializer

# Pedidos de Compras Detalle Serializer

# Compras Serializer

# Compras Detalle Serializer

# Pagos Serializer

# Pagos Detalle Serializer