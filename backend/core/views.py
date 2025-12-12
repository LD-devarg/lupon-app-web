from django.utils import timezone
from rest_framework import viewsets
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Usuarios, Contactos, Productos, PedidosVentas, PedidosVentasDetalle, Ventas, VentasDetalle, Cobros, CobrosDetalle, PedidosCompras, PedidosComprasDetalle, Compras, ComprasDetalle
from .serializers import UsuariosSerializer, ResetearContrasenaSerializer, CambiarContrasenaSerializer, CambiarEmailSerializer, CambiarEstadoUsuarioSerializer, ContactosSerializer, ProductosSerializer, PedidosVentasSerializer, PedidosVentasDetalleSerializer, VentasSerializer, CambiarEstadoVentaSerializer, NuevaFechaEntregaSerializer, VentasDetalleSerializer, CancelarPedidoVentaSerializer, CobrosSerializer, CobrosDetalleSerializer, PedidosComprasSerializer, PedidosComprasDetalleSerializer, CancelarVentaSerializer, ComprasSerializer, ComprasDetalleSerializer, CambiarEstadoCompraSerializer, CancelarCompraSerializer
from .domain.logica import calcular_precios_producto, calcular_subtotal
from .domain.validaciones_ventas import validar_cambio_estado_venta, validar_cambio_estado_pedido_venta
from .domain.validaciones_usuarios import validar_cambio_estado_usuario, validar_cambio_contrasena, validar_cambio_email
from .domain.validaciones_compras import validar_cambio_estado_pedido_compra, validar_cambio_estado_compra
from core.servicios.automatizaciones import completar_pedido_venta_al_entregar, cancelar_venta, cancelar_compra
# ============================================================
# ViewSets
# ============================================================

# Usuarios

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

# Contactos

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

# Productos

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
    
# Pedidos de Ventas

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
    
    @action(detail=True, methods=['delete'], url_path='detalles/(?P<detalle_id>[^/.]+)')
    def eliminar_detalle(self, request, pk=None, detalle_id=None):
        pedido_venta = self.get_object()
        
        if pedido_venta.estado != 'Pendiente':
            return Response({"error": "No se pueden eliminar detalles de un Pedido de Venta que no esté en estado 'Pendiente'."}, status=400)
              
        try:
            detalle = pedido_venta.detalles.get(id=detalle_id)
        except PedidosVentasDetalle.DoesNotExist:
            return Response({"error": "Detalle no encontrado para este pedido de venta."}, status=404)
        
        detalle.delete()
        
        nuevo_subtotal = calcular_subtotal(pedido_venta.detalles.all())
        pedido_venta.subtotal = nuevo_subtotal
        pedido_venta.save()
        
        return Response({"status": "Detalle eliminado correctamente.",
                         "nuevo_subtotal": str(nuevo_subtotal),
                         "detalles_restantes": PedidosVentasDetalleSerializer(pedido_venta.detalles.all(), many=True).data
                        })
    
    @action(detail=True, methods=['post'], url_path='detalles')
    def agregar_detalle(self, request, pk=None,):
        
        pedido_venta = self.get_object()
        
        if pedido_venta.estado != 'Pendiente':
            return Response({"error": "No se pueden agregar detalles a un Pedido de Venta que no esté en estado 'Pendiente'."}, status=400)
        
        serializer = PedidosVentasDetalleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        detalle = serializer.save(pedido_venta=pedido_venta)
        
        nuevo_subtotal = calcular_subtotal(pedido_venta.detalles.all())
        pedido_venta.subtotal = nuevo_subtotal
        pedido_venta.save()
        
        return Response({"status": "Detalle agregado correctamente.",
                         "nuevo_subtotal": str(nuevo_subtotal),
                         "detalle": PedidosVentasDetalleSerializer(detalle).data
                        })
    
    @action(detail=True, methods=['patch'], url_path='detalles/(?P<detalle_id>[^/.]+)')
    def modificar_detalle(self, request, pk=None, detalle_id=None):
        pedido_venta = self.get_object()
        
        if pedido_venta.estado != 'Pendiente':
            return Response({"error": "No se pueden modificar detalles de un Pedido de Venta que no esté en estado 'Pendiente'."}, status=400)
        
        try:
            detalle = pedido_venta.detalles.get(id=detalle_id)
        except PedidosVentasDetalle.DoesNotExist:
            return Response({"error": "Detalle no encontrado para este pedido de venta."}, status=404)
        
        serializer = PedidosVentasDetalleSerializer(detalle, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        nuevo_subtotal = calcular_subtotal(pedido_venta.detalles.all())
        pedido_venta.subtotal = nuevo_subtotal
        pedido_venta.save()
        
        return Response({"status": "Detalle modificado correctamente.",
                         "nuevo_subtotal": str(nuevo_subtotal),
                         "detalle": PedidosVentasDetalleSerializer(detalle).data
                        })
    
class PedidosVentasDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosVentasDetalleSerializer
    queryset = PedidosVentasDetalle.objects.all()

# Ventas 
class VentasViewSet(viewsets.ModelViewSet):
    serializer_class = VentasSerializer
    queryset = Ventas.objects.all()
    
    # Cambio de estado de entrega validada en domain/validaciones_ventas.py
    @action(detail=True, methods=['post'], serializer_class=CambiarEstadoVentaSerializer)
    def cambiar_estado_entrega(self, request, pk=None):
        venta = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        estado_entrega = serializer.validated_data['estado_entrega']

        validar_cambio_estado_venta(venta, estado_entrega)
        # Automatizacion para manejar venta cancelada
        if estado_entrega == 'Cancelada':
            serializer = CancelarVentaSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            motivo_cancelacion = serializer.validated_data['motivo_cancelacion']
            venta.motivo_cancelacion = motivo_cancelacion
            venta.fecha_cancelacion = timezone.now().date()
            venta.estado_venta = 'cancelada'
            venta.save(update_fields=['motivo_cancelacion', 'fecha_cancelacion', 'estado_venta'])
            
            cancelar_venta(venta)
            
            return Response({"status": "Venta cancelada correctamente."})
        
        venta.estado_entrega = estado_entrega
        venta.save()
        # automatización: completar pedido de venta si la venta se marca como entregada
        completar_pedido_venta_al_entregar(venta, estado_entrega)

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
    
class VentasDetalleViewSet(ReadOnlyModelViewSet):
    serializer_class = VentasDetalleSerializer
    queryset = VentasDetalle.objects.all()
    
    # Filtros potentes y estándar
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['producto', 'venta']
    ordering_fields = ['cantidad', 'precio_unitario', 'id']
    ordering = ['id']  # default
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtro por nombre de producto (opcional, agregar a tu versión)
        producto = self.request.query_params.get('producto', None)
        if producto:
            queryset = queryset.filter(producto__nombre__icontains=producto)
        # Filtro por ID de venta (más potente que el anterior)
        venta_id = self.request.query_params.get('venta_id', None)
        if venta_id:
            queryset = queryset.filter(venta_id=venta_id)
        return queryset

# Cobros

class CobrosViewSet(viewsets.ModelViewSet):
    serializer_class = CobrosSerializer
    queryset = Cobros.objects.all()
    
class CobrosDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = CobrosDetalleSerializer
    queryset = CobrosDetalle.objects.all()

# Pedidos de Compras
    
class PedidosComprasViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosComprasSerializer
    queryset = PedidosCompras.objects.all()
    
    # Filtrado por estado o busqueda por proveedor
    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get('estado', None)
        proveedor = self.request.query_params.get('proveedor', None)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if proveedor:
            queryset = queryset.filter(proveedor__nombre__icontains=proveedor)
            
        return queryset
    
    @action(detail=True, methods=['delete'], url_path='detalles/(?P<detalle_id>[^/.]+)')
    def eliminar_detalle(self, request, pk=None, detalle_id=None):
        pedido_compra = self.get_object()
        
        if pedido_compra.estado != 'Pendiente':
            return Response({"error": "No se pueden eliminar detalles de un Pedido de Compra que no esté en estado 'Pendiente'."}, status=400)
        
        detalle_id = request.query_params.get('detalle_id', None)
              
        try:
            detalle = PedidosComprasDetalle.objects.get(id=detalle_id, pedido_compra=pedido_compra)
        except PedidosComprasDetalle.DoesNotExist:
            return Response({"error": "Detalle no encontrado para este pedido de compra."}, status=404)
        
        detalle.delete()
        
        nuevo_subtotal = calcular_subtotal(pedido_compra.detalles.all())
        pedido_compra.subtotal = nuevo_subtotal
        pedido_compra.save()
        
        return Response({"status": "Detalle eliminado correctamente.",
                         "nuevo_subtotal": str(nuevo_subtotal),
                         "detalles_restantes": PedidosComprasDetalleSerializer(pedido_compra.detalles.all(), many=True).data
                        })
        
    @action(detail=True, methods=['post'], url_path='detalles/')
    def agregar_detalle(self, request, pk=None,):
        pedido_compra = self.get_object()
        
        if pedido_compra.estado != 'Pendiente':
            return Response({"error": "No se pueden agregar detalles a un Pedido de Compra que no esté en estado 'Pendiente'."}, status=400)
        
        serializer = PedidosComprasDetalleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        detalle = serializer.save(pedido_compra=pedido_compra)
        
        nuevo_subtotal = calcular_subtotal(pedido_compra.detalles.all())
        pedido_compra.subtotal = nuevo_subtotal
        pedido_compra.save()
        
        return Response({"status": "Detalle agregado correctamente.",
                         "nuevo_subtotal": str(nuevo_subtotal),
                         "detalle": PedidosComprasDetalleSerializer(detalle).data
                        })
    
    @action(detail=True, methods=['patch'], url_path='detalles/(?P<detalle_id>[^/.]+)')
    def modificar_detalle(self, request, pk=None, detalle_id=None):
        pedido_compra = self.get_object()
        
        if pedido_compra.estado != 'Pendiente':
            return Response({"error": "No se pueden modificar detalles de un Pedido de Compra que no esté en estado 'Pendiente'."}, status=400)
        
        try:
            detalle = PedidosComprasDetalle.objects.get(id=detalle_id, pedido_compra=pedido_compra)
        except PedidosComprasDetalle.DoesNotExist:
            return Response({"error": "Detalle no encontrado para este pedido de compra."}, status=404)
        
        serializer = PedidosComprasDetalleSerializer(detalle, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        detalle = serializer.save()
        
        nuevo_subtotal = calcular_subtotal(pedido_compra.detalles.all())
        pedido_compra.subtotal = nuevo_subtotal
        pedido_compra.save()
        
        return Response({"status": "Detalle modificado correctamente.",
                         "nuevo_subtotal": str(nuevo_subtotal),
                         "detalle": PedidosComprasDetalleSerializer(detalle).data
                        })
    
class PedidosComprasDetalleViewSet(ReadOnlyModelViewSet):
    serializer_class = PedidosComprasDetalleSerializer
    queryset = PedidosComprasDetalle.objects.all()

    # Filtros potentes y estándar
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['producto', 'pedido_compra']
    ordering_fields = ['cantidad', 'precio_unitario', 'id']
    ordering = ['id']  # default

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por nombre de producto (opcional, agregar a tu versión)
        producto = self.request.query_params.get('producto', None)
        if producto:
            queryset = queryset.filter(producto__nombre__icontains=producto)

        # Filtro por ID de pedido (más potente que el anterior)
        pedido_id = self.request.query_params.get('pedido_id', None)
        if pedido_id:
            queryset = queryset.filter(pedido_compra_id=pedido_id)

        return queryset

# Compras

class ComprasViewSet(viewsets.ModelViewSet):
    serializer_class = ComprasSerializer
    queryset = Compras.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()

        proveedor = self.request.query_params.get('proveedor')
        estado_compra = self.request.query_params.get('estado_compra')
        fecha = self.request.query_params.get('fecha_compra')
        estado_pago = self.request.query_params.get('estado_pago')

        if proveedor:
            queryset = queryset.filter(proveedor__nombre__icontains=proveedor)

        if estado_compra:
            queryset = queryset.filter(estado_compra=estado_compra)

        if fecha:
            queryset = queryset.filter(fecha_compra=fecha)

        if estado_pago:
            queryset = queryset.filter(estado_pago=estado_pago)

        return queryset

    @action(detail=True, methods=['post'], serializer_class=CambiarEstadoCompraSerializer)
    def cambiar_estado_compra(self, request, pk=None):
        compra = self.get_object()

        # Validar estado nuevo
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nuevo_estado = serializer.validated_data["estado_compra"]

        validar_cambio_estado_compra(compra, nuevo_estado)

        # CASO CANCELACIÓN
        if nuevo_estado == "Cancelada":
            cancel_ser = CancelarCompraSerializer(data=request.data)
            cancel_ser.is_valid(raise_exception=True)

            motivo = cancel_ser.validated_data["motivo_cancelacion"]

            compra.motivo_cancelacion = motivo
            compra.fecha_cancelacion = timezone.now().date()
            compra.estado_compra = "Cancelada"
            compra.saldo_pendiente = 0
            compra.save()

            cancelar_compra(compra)

            return Response({"status": "Compra cancelada correctamente."})

        # CASO RECIBIDA
        compra.estado_compra = nuevo_estado
        compra.save()

        return Response({"status": "Estado de compra actualizado correctamente."})  
    
class ComprasDetalleViewSet(ReadOnlyModelViewSet):
    serializer_class = ComprasDetalleSerializer
    queryset = ComprasDetalle.objects.all()
    