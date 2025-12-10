from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Usuarios, Contactos, Productos, PedidosVentas, PedidosVentasDetalle, Ventas, VentasDetalle
from .serializers import UsuariosSerializer, ResetearContrasenaSerializer, CambiarContrasenaSerializer, CambiarEmailSerializer, CambiarEstadoUsuarioSerializer, ContactosSerializer, ProductosSerializer, PedidosVentasSerializer, PedidosVentasDetalleSerializer, VentasSerializer, CambiarEstadoVentaSerializer, NuevaFechaEntregaSerializer, VentasDetalleSerializer, CancelarPedidoVentaSerializer
from .domain.logica import calcular_precios_producto, calcular_subtotal
from .domain.validaciones_ventas import validar_cambio_estado_venta, validar_cambio_estado_pedido_venta
from .domain.validaciones_usuarios import validar_cambio_estado_usuario, validar_cambio_contrasena, validar_cambio_email
from core.servicios.automatizaciones import completar_pedido_venta_al_entregar

# ============================================================
# ViewSets
# ============================================================

# Usuarios ViewSet
class UsuariosViewSet(viewsets.ModelViewSet):
    serializer_class = UsuariosSerializer
    queryset = Usuarios.objects.all()
    
    # Cambio de estado de usuario
    @action(detail=True, methods=['post'], serializer_class=CambiarEstadoUsuarioSerializer)
    def cambiar_estado(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios
        serializer = CambiarEstadoUsuarioSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        nuevo_estado_raw = serializer.validated_data['activo']

        if nuevo_estado_raw is None:
            return Response({"error": "El nuevo estado 'activo' es requerido."}, status=400)
        # normaliza a booleano
        nuevo_estado = bool(int(nuevo_estado_raw))
        
        try:
            validar_cambio_estado_usuario(usuario_actor, usuario_objetivo, nuevo_estado)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
        
        usuario_objetivo.activo = nuevo_estado
        usuario_objetivo.save()
        return Response({"status": "Estado del usuario actualizado correctamente."})
    
    # cambio de contraseña validada en domain/validaciones_usuarios.py
    @action(detail=True, methods=['post'], serializer_class=CambiarContrasenaSerializer)
    def cambiar_password(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios
        
        serializer = CambiarContrasenaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        password_actual = serializer.validated_data['password_actual']
        password_nueva = serializer.validated_data['password_nueva']
        password_confirmacion = serializer.validated_data['password_confirmacion']
        
        user = usuario_objetivo.user

        if not all([password_actual, password_nueva, password_confirmacion]):
            return Response({"error": "Todos los campos de contraseña son requeridos."}, status=400)
        
        try:
            validar_cambio_contrasena(usuario_objetivo, usuario_actor, password_actual, password_nueva, password_confirmacion)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
        
        user.set_password(password_nueva)
        user.save()
        
        return Response({"status": "Contraseña actualizada correctamente."})
    
    # Resetear contraseña (solo admin)
    @action(detail=True, methods=['post'], serializer_class=ResetearContrasenaSerializer)
    def resetear_password(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios
        
        if not usuario_actor.es_admin:
            return Response({"error": "Solo los administradores pueden resetear contraseñas."}, status=403)
        
        serializer = ResetearContrasenaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        nueva_contrasena = serializer.validated_data['nueva_contrasena']
        
        if not nueva_contrasena:
            return Response({"error": "La nueva contraseña es requerida."}, status=400)
        
        user = usuario_objetivo.user
        user.set_password(nueva_contrasena)
        user.save()
        
        return Response({"status": "Contraseña reseteada correctamente."})
    
    # cambio de email validada en domain/validaciones_usuarios.py
    @action(detail=True, methods=['post'], serializer_class=CambiarEmailSerializer)
    def cambiar_email(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios
        user = usuario_objetivo.user
        serializer = CambiarEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        nuevo_email = serializer.validated_data['nuevo_email']
        if not nuevo_email:
            return Response({"error": "El nuevo email es requerido."}, status=400)

        try:
            validar_cambio_email(usuario_objetivo, usuario_actor, nuevo_email)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
        
        user.email = nuevo_email
        user.save()
        return Response({"status": "Email actualizado correctamente."})

# Contactos ViewSet

class ContactosViewSet(viewsets.ModelViewSet):
    serializer_class = ContactosSerializer
    queryset = Contactos.objects.all()
    
    # Filtrado por tipo de contacto, categoría, o forma de pago, busqueda por nombre
    
    def get_queryset(self):
        queryset = super().get_queryset()
        tipo = self.request.query_params.get('tipo', None)
        categoria = self.request.query_params.get('categoria', None)
        forma_pago = self.request.query_params.get('forma_pago', None)
        nombre = self.request.query_params.get('nombre', None)
        
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if forma_pago:
            queryset = queryset.filter(forma_pago=forma_pago)
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
            
        return queryset

# Productos ViewSet

class ProductosViewSet(viewsets.ModelViewSet):
    serializer_class = ProductosSerializer
    queryset = Productos.objects.all()
    
    # Filtrado por busqueda por nombre
    def get_queryset(self):
        queryset = super().get_queryset()
        nombre = self.request.query_params.get('nombre', None)
        
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)

        return queryset
    
    def perform_create(self, serializer):
        producto = serializer.save()
        precios = calcular_precios_producto(producto.precio_compra)
        
        for key, value in precios.items():
            setattr(producto, key, value)
            
        producto.save()
        
    def perform_update(self, serializer):
        producto = serializer.save()
        precios = calcular_precios_producto(producto.precio_compra)
        
        for key, value in precios.items():
            setattr(producto, key, value)
            
        producto.save()
    
# Pedidos de Ventas ViewSet

class PedidosVentasViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosVentasSerializer
    queryset = PedidosVentas.objects.all()
    
    # Filtrado por estado o busqueda por cliente
    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get('estado', None)
        cliente = self.request.query_params.get('cliente', None)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if cliente:
            queryset = queryset.filter(cliente__nombre__icontains=cliente)
            
        return queryset
    # Cancelar pedido de venta
    @action(detail=True, methods=['post'], serializer_class=CancelarPedidoVentaSerializer)
    def cancelar_pedido(self, request, pk=None):
        pedido_venta = self.get_object()
        estado_actual = pedido_venta.estado
        nuevo_estado = 'Cancelado'
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        #validar con cambio de estado de pedido de venta
        try:
            validar_cambio_estado_pedido_venta(pedido_venta, nuevo_estado)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
        
        motivo_cancelacion = serializer.validated_data['motivo_cancelacion']
        fecha_cancelacion = serializer.validated_data.get('fecha_cancelacion', None)        
        
        pedido_venta.estado = 'Cancelado'
        pedido_venta.motivo_cancelacion = motivo_cancelacion
        pedido_venta.fecha_cancelacion = fecha_cancelacion
        pedido_venta.save()
        return Response({"status": "Pedido cancelado correctamente."})
    
class PedidosVentasDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosVentasDetalleSerializer
    queryset = PedidosVentasDetalle.objects.all()
    
    def perform_create(self, serializer):
        detalle = serializer.save()
        pedido = detalle.pedido_venta
        subtotal = calcular_subtotal(pedido.detalles.all())
        pedido.subtotal = subtotal
        pedido.save()
        
    def perform_update(self, serializer):
        detalle = serializer.save()
        pedido = detalle.pedido_venta
        subtotal = calcular_subtotal(pedido.detalles.all())
        pedido.subtotal = subtotal
        pedido.save()
        
    def perform_destroy(self, instance):
        pedido = instance.pedido_venta
        super().perform_destroy(instance)
        subtotal = calcular_subtotal(pedido.detalles.all())
        pedido.subtotal = subtotal
        pedido.save()
    
    # Agregar mas productos 

# Ventas ViewSet

class VentasViewSet(viewsets.ModelViewSet):
    serializer_class = VentasSerializer
    queryset = Ventas.objects.all()
    
    # Cambio de estado de entrega validada en domain/validaciones_ventas.py
    @action(detail=True, methods=['post'], serializer_class=CambiarEstadoVentaSerializer)
    def cambiar_estado_entrega(self, request, pk=None):
        venta = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        nuevo_estado = serializer.validated_data['nuevo_estado']
        
        try:
            validar_cambio_estado_venta(venta, nuevo_estado)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
        
        venta.estado_entrega = nuevo_estado
        venta.save()
        # automatización: completar pedido de venta si la venta se marca como entregada
        completar_pedido_venta_al_entregar(venta, nuevo_estado)
        
        return Response({"status": "Estado de entrega actualizado correctamente."})
    
    # Reprogramar fecha de entrega
    @action(detail=True, methods=['post'], serializer_class=NuevaFechaEntregaSerializer)
    def reprogramar_entrega(self, request, pk=None):
        venta = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        nueva_fecha = serializer.validated_data['nueva_fecha']

        venta.fecha_reprogramada = nueva_fecha
        venta.estado_entrega = 'Reprogramada'
        venta.save()
        
        return Response({"status": "Fecha de entrega reprogramada correctamente."})
    
    # Filtrado por estado de entrega o busqueda por cliente
    def get_queryset(self):
        queryset = super().get_queryset()
        estado_entrega = self.request.query_params.get('estado_entrega', None)
        cliente = self.request.query_params.get('cliente', None)
        
        if estado_entrega:
            queryset = queryset.filter(estado_entrega=estado_entrega)
        if cliente:
            queryset = queryset.filter(cliente__nombre__icontains=cliente)
            
        return queryset
    
class VentasDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = VentasDetalleSerializer
    queryset = VentasDetalle.objects.all()
    
    # No es necesario recalcular subtotal, total y saldo pendiente aquí, ya que se maneja en el serializer de Ventas y no se permite modificar detalles directamente desde este ViewSet.
    pass