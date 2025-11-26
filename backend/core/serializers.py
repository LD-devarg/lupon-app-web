from django.db.models import Sum, F
from rest_framework import serializers
from django.utils import timezone 
from .models import Contactos, Productos, PedidosVentas, PedidosVentasDetalle, Ventas, Cobros, PedidosCompras, PedidosComprasDetalle, Compras, ComprasDetalle, Pagos, CuentaCorrienteMovimiento

class ContactosSerializer(serializers.ModelSerializer):
    saldo = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    dias_deuda = serializers.IntegerField(read_only=True)
    direccion_completa = serializers.SerializerMethodField()
    
    class Meta:
        model = Contactos
        fields = "__all__"
        extra_fields = ['saldo', 'dias_deuda', 'direccion_completa']
        
    def get_dias_deuda(self, obj):
        saldo = getattr(obj, 'saldo', None)
        if saldo is None or saldo <= 0:
            return 0
        
        movimientos = obj.ctacte_movimientos.filter(tipo__in=['venta', 'compra', 'ajuste']).order_by('fecha')
        
        if not movimientos.exists():
            return 0
        
        first_fecha = movimientos.first().fecha
        if not first_fecha:
            return 0
        
        ahora = timezone.now().date()
        delta = ahora - first_fecha
        return delta.days
    
    def get_direccion_completa(self, obj):
        partes = [obj.calle, obj.numero, obj.ciudad, obj.provincia]
        direccion = ', '.join([p for p in partes if p])
        return direccion
             
class ProductosSerializer(serializers.ModelSerializer):
    precio_actual = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    creado_en = serializers.DateField(read_only=True)
    actualizado_en = serializers.DateField(read_only=True)
    class Meta:
        model = Productos
        fields = [
            "id", "nombre", "descripcion", "rubro",
            "precio", "activo",
            "es_oferta", "precio_oferta",
            "fecha_inicio_oferta", "fecha_fin_oferta",
            "precio_actual",
            "creado_en", "actualizado_en",
        ]
    
class PedidosVentasDetalleSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = PedidosVentasDetalle
        fields = "__all__"
        extra_fields = ['producto_nombre']

class PedidosVentasSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    cliente_direccion = serializers.SerializerMethodField()
    detalles = PedidosVentasDetalleSerializer(many=True, read_only=True)
    total_calculado = serializers.SerializerMethodField()
    
    class Meta:
        model = PedidosVentas
        fields = "__all__"
        extra_fields = ['cliente_nombre', 'cliente_direccion', 'total_calculado']
        
    def validate_cliente(self, value):
        if value.tipo != 'cliente':
            raise serializers.ValidationError("El contacto debe ser un cliente.")
        return value
    def get_cliente_direccion(self, obj):
        c = obj.cliente
        partes = [c.calle, c.numero, c.ciudad, c.provincia]
        direccion = ', '.join([p for p in partes if p])
        return direccion
    def get_total_calculado(self, obj):
        total = obj.detalles.aggregate(
            total=Sum(F('cantidad') * F('precio_unitario'))
        )['total'] or 0
        return total
    
class VentasSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    pedido_cliente_nombre = serializers.CharField(source='pedido.cliente.nombre', read_only=True)
    productos = PedidosVentasDetalleSerializer(source='pedido.detalles', many=True, read_only=True)
    
    class Meta:
        model = Ventas
        fields = "__all__"
        extra_fields = ['subtotal', 'total', 'pedido_cliente_nombre', 'productos']
        
class CobrosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cobros
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en']

class PedidosComprasDetalleSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = PedidosComprasDetalle
        fields = "__all__"

class PedidosComprasSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    
    detalles = PedidosComprasDetalleSerializer(many=True, read_only=True)
    
    class Meta:
        model = PedidosCompras
        fields = "__all__"
        extra_fields = ['proveedor_nombre']
        
    def validate_proveedor(self, value):
        if value.tipo != 'proveedor':
            raise serializers.ValidationError("El contacto debe ser un proveedor.")
        return value

class ComprasDetalleSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = ComprasDetalle
        fields = "__all__"
        
class ComprasSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    detalles = ComprasDetalleSerializer(many=True, read_only=True)
    
    class Meta:
        model = Compras
        fields = "__all__"
        
class PagosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagos
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en']
        
class CuentaCorrienteMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaCorrienteMovimiento
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en']