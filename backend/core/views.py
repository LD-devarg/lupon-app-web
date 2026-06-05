from django.utils import timezone
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db.models import Sum, Count, Max, Q, F
from django.db.models.functions import Coalesce
from datetime import datetime, timedelta
from .models import Usuarios, Contactos, Productos, Ventas, VentasDetalle, Cobros, CobrosDetalle, CobrosMedioPago, Compras, ComprasDetalle, Pagos, PagosDetalle, PagosMedioPago, NotasCredito, NotasCreditoDetalle
from .serializers import UsuariosSerializer, ResetearContrasenaSerializer, CambiarContrasenaSerializer, CambiarEmailSerializer, CambiarEstadoUsuarioSerializer, ContactosSerializer, ProductosSerializer, VentasSerializer, CambiarEstadoVentaSerializer, VentasDetalleSerializer, CancelarVentaSerializer, CobrosSerializer, CobrosDetalleSerializer, ComprasSerializer, ComprasDetalleSerializer, CambiarEstadoCompraSerializer, CancelarCompraSerializer, PagosSerializer, PagosDetalleSerializer, NotasCreditoSerializer
from .domain.logica import calcular_precios_producto, calcular_subtotal
from .domain.validaciones_ventas import validar_cambio_estado_venta
from .domain.validaciones_usuarios import validar_cambio_estado_usuario, validar_cambio_contrasena, validar_cambio_email
from .domain.validaciones_compras import validar_cambio_estado_compra
from .servicios.automatizaciones import cancelar_compra, recalcular_estado_pago, recalcular_precios_producto, cancelar_venta_domain
from decimal import Decimal

# ============================================================
# ViewSets
# ============================================================

# Usuarios

class UsuariosViewSet(viewsets.ModelViewSet):
    serializer_class = UsuariosSerializer
    queryset = Usuarios.objects.all()

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=True, methods=['post'], serializer_class=CambiarEstadoUsuarioSerializer)
    def cambiar_estado(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios

        serializer = CambiarEstadoUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nuevo_estado = serializer.validated_data['activo']

        try:
            validar_cambio_estado_usuario(usuario_actor, usuario_objetivo, nuevo_estado)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

        usuario_objetivo.activo = nuevo_estado
        usuario_objetivo.save(update_fields=['activo'])

        return Response({"status": "Estado del usuario actualizado correctamente."})

    @action(detail=True, methods=['post'], serializer_class=CambiarContrasenaSerializer)
    def cambiar_password(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios

        serializer = CambiarContrasenaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password_actual = serializer.validated_data['password_actual']
        password_nueva = serializer.validated_data['password_nueva']
        password_confirmacion = serializer.validated_data['password_confirmacion']

        try:
            validar_cambio_contrasena(usuario_objetivo, usuario_actor, password_actual, password_nueva, password_confirmacion)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

        user = usuario_objetivo.user
        user.set_password(password_nueva)
        user.save(update_fields=['password'])

        return Response({"status": "Contraseña actualizada correctamente."})

    @action(detail=True, methods=['post'], serializer_class=ResetearContrasenaSerializer)
    def resetear_password(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios

        if not usuario_actor.es_admin:
            return Response({"error": "Solo los administradores pueden resetear contraseñas."}, status=403)

        serializer = ResetearContrasenaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nueva_contrasena = serializer.validated_data['nueva_contrasena']

        user = usuario_objetivo.user
        user.set_password(nueva_contrasena)
        user.save(update_fields=['password'])

        return Response({"status": "Contraseña reseteada correctamente."})

    @action(detail=True, methods=['post'], serializer_class=CambiarEmailSerializer)
    def cambiar_email(self, request, pk=None):
        usuario_objetivo = self.get_object()
        usuario_actor = request.user.usuarios

        serializer = CambiarEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nuevo_email = serializer.validated_data['nuevo_email']

        try:
            validar_cambio_email(usuario_objetivo, usuario_actor, nuevo_email)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

        user = usuario_objetivo.user
        user.email = nuevo_email
        user.save(update_fields=['email'])

        return Response({"status": "Email actualizado correctamente."})

# Contactos

class ContactosViewSet(viewsets.ModelViewSet):
    serializer_class = ContactosSerializer
    queryset = Contactos.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        tipo = params.get('tipo', None)
        categoria = params.get('categoria', None)
        forma_pago = params.get('forma_pago', None)
        nombre = params.get('nombre', None)

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

    def get_queryset(self):
        queryset = super().get_queryset()
        nombre = self.request.query_params.get('nombre', None)

        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)

        return queryset

    def perform_create(self, serializer):
        producto = serializer.save()
        recalcular_precios_producto(producto)

    def perform_update(self, serializer):
        producto = serializer.save()
        recalcular_precios_producto(producto)
        producto.save()

# Ventas

class VentasViewSet(viewsets.ModelViewSet):
    serializer_class = VentasSerializer
    queryset = Ventas.objects.all()

    @action(detail=True, methods=['post'], serializer_class=CambiarEstadoVentaSerializer)
    def cambiar_estado(self, request, pk=None):
        venta = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nuevo_estado = serializer.validated_data['estado_venta']

        try:
            validar_cambio_estado_venta(venta, nuevo_estado)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

        venta.estado_venta = nuevo_estado
        venta.save(update_fields=['estado_venta'])

        return Response({"status": "Estado actualizado correctamente."})

    @action(detail=True, methods=['post'], serializer_class=CancelarVentaSerializer)
    def cancelar_venta(self, request, pk=None):
        venta = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            validar_cambio_estado_venta(venta, 'cancelada')
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

        motivo_cancelacion = serializer.validated_data['motivo_cancelacion']

        venta.motivo_cancelacion = motivo_cancelacion
        venta.fecha_cancelacion = timezone.now().date()
        venta.save(update_fields=['motivo_cancelacion', 'fecha_cancelacion'])

        cancelar_venta_domain(venta)

        return Response({"status": "Venta cancelada correctamente."})

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        estado_venta = params.get('estado_venta', None)
        cliente = params.get('cliente', None)
        cliente_id = params.get('cliente_id', None)
        fecha_desde = params.get('fecha_desde', None)
        fecha_hasta = params.get('fecha_hasta', None)

        if estado_venta:
            queryset = queryset.filter(estado_venta=estado_venta)
        if cliente:
            queryset = queryset.filter(cliente__nombre__icontains=cliente)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        if fecha_desde:
            queryset = queryset.filter(fecha_venta__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_venta__lte=fecha_hasta)

        return queryset.order_by('-fecha_venta', 'id')

class VentasDetalleViewSet(ReadOnlyModelViewSet):
    serializer_class = VentasDetalleSerializer
    queryset = VentasDetalle.objects.all()

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['producto', 'venta']
    ordering_fields = ['cantidad', 'precio_unitario', 'id']
    ordering = ['id']

    def get_queryset(self):
        queryset = super().get_queryset()
        producto = self.request.query_params.get('producto', None)
        if producto:
            queryset = queryset.filter(producto__nombre__icontains=producto)
        venta_id = self.request.query_params.get('venta_id', None)
        if venta_id:
            queryset = queryset.filter(venta_id=venta_id)
        return queryset

# Cobros

class CobrosViewSet(viewsets.ModelViewSet):
    serializer_class = CobrosSerializer
    queryset = Cobros.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        cliente = params.get('cliente', None)
        cliente_id = params.get('cliente_id', None)
        fecha = params.get('fecha_cobro', None)
        fecha_desde = params.get('fecha_desde', None)
        fecha_hasta = params.get('fecha_hasta', None)

        if cliente:
            queryset = queryset.filter(cliente__nombre__icontains=cliente)
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        if fecha:
            queryset = queryset.filter(fecha_cobro=fecha)
        if fecha_desde:
            queryset = queryset.filter(fecha_cobro__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_cobro__lte=fecha_hasta)

        return queryset

class CobrosDetalleViewSet(ReadOnlyModelViewSet):
    serializer_class = CobrosDetalleSerializer
    queryset = CobrosDetalle.objects.all()

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

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nuevo_estado = serializer.validated_data["estado_compra"]

        validar_cambio_estado_compra(compra, nuevo_estado)

        if nuevo_estado == "cancelada":
            cancel_ser = CancelarCompraSerializer(data=request.data)
            cancel_ser.is_valid(raise_exception=True)

            motivo = cancel_ser.validated_data["motivo_cancelacion"]

            compra.motivo_cancelacion = motivo
            compra.fecha_cancelacion = timezone.now().date()
            compra.save()

            cancelar_compra(compra)

            return Response({"status": "Compra cancelada correctamente."})

        compra.estado_compra = nuevo_estado
        compra.estado_pago = recalcular_estado_pago(compra)
        compra.save()

        return Response({"status": "Estado de compra actualizado correctamente."})

class ComprasDetalleViewSet(ReadOnlyModelViewSet):
    serializer_class = ComprasDetalleSerializer
    queryset = ComprasDetalle.objects.all()

# Pagos

class PagosViewSet(viewsets.ModelViewSet):
    serializer_class = PagosSerializer
    queryset = Pagos.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        proveedor = self.request.query_params.get('proveedor', None)
        fecha = self.request.query_params.get('fecha_pago', None)

        if proveedor:
            queryset = queryset.filter(proveedor__nombre__icontains=proveedor)
        if fecha:
            queryset = queryset.filter(fecha_pago=fecha)

        return queryset

class PagosDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = PagosDetalleSerializer
    queryset = PagosDetalle.objects.all()

# Notas de Credito

class NotasCreditoViewSet(viewsets.ModelViewSet):
    serializer_class = NotasCreditoSerializer
    queryset = NotasCredito.objects.all().select_related(
        'contacto'
        ).prefetch_related(
        'detalles',
        'aplicaciones'
        )

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        contacto_id = params.get('contacto')
        tipo = params.get('tipo')

        if contacto_id:
            qs = qs.filter(contacto__id=contacto_id)
        if tipo:
            qs = qs.filter(tipo=tipo)

        return qs

    def destroy(self, request, *args, **kwargs):
        return Response({"error": "No se permite eliminar notas de crédito"}, status=405)

    def update(self, request, *args, **kwargs):
        return Response({"error": "No se permite modificar notas de crédito"}, status=405)

    def partial_update(self, request, *args, **kwargs):
        return Response({"error": "No se permite modificar notas de crédito"}, status=405)

class DashboardView(APIView):
    def get(self, request):
        params = request.query_params
        fecha_desde = params.get("fecha_desde")
        fecha_hasta = params.get("fecha_hasta")
        cliente = params.get("cliente")
        proveedor = params.get("proveedor")
        forma_pago = params.get("forma_pago")
        estado_cobro = params.get("estado_cobro")
        estado_pago = params.get("estado_pago")
        medio_pago = params.get("medio_pago")

        def parse_date(value):
            if not value:
                return None
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                raise ValidationError("Formato de fecha invalido. Usa YYYY-MM-DD.")

        fecha_desde_date = parse_date(fecha_desde)
        fecha_hasta_date = parse_date(fecha_hasta)

        def apply_date_range(qs, field):
            if fecha_desde_date:
                qs = qs.filter(**{f"{field}__gte": fecha_desde_date})
            if fecha_hasta_date:
                qs = qs.filter(**{f"{field}__lte": fecha_hasta_date})
            return qs

        ventas_qs = apply_date_range(Ventas.objects.all(), "fecha_venta")
        if cliente:
            ventas_qs = ventas_qs.filter(cliente_id=cliente)
        if forma_pago:
            ventas_qs = ventas_qs.filter(forma_pago=forma_pago)
        if estado_cobro:
            ventas_qs = ventas_qs.filter(estado_cobro=estado_cobro)

        compras_qs = apply_date_range(Compras.objects.all(), "fecha_compra")
        if proveedor:
            compras_qs = compras_qs.filter(proveedor_id=proveedor)
        if forma_pago:
            compras_qs = compras_qs.filter(forma_pago=forma_pago)
        if estado_pago:
            compras_qs = compras_qs.filter(estado_pago=estado_pago)

        cobros_qs = apply_date_range(Cobros.objects.all(), "fecha_cobro")
        if cliente:
            cobros_qs = cobros_qs.filter(cliente_id=cliente)
        if medio_pago:
            cobros_qs = cobros_qs.filter(
                Q(medios_pago__medio_pago=medio_pago) |
                (Q(medios_pago__isnull=True) & Q(medio_pago=medio_pago))
            ).distinct()

        pagos_qs = apply_date_range(Pagos.objects.all(), "fecha_pago")
        if proveedor:
            pagos_qs = pagos_qs.filter(proveedor_id=proveedor)
        if medio_pago:
            pagos_qs = pagos_qs.filter(
                Q(medios_pago__medio_pago=medio_pago) |
                (Q(medios_pago__isnull=True) & Q(medio_pago=medio_pago))
            ).distinct()

        ventas_validas = ventas_qs.exclude(estado_venta="cancelada")
        compras_validas = compras_qs.exclude(estado_compra="cancelada")

        ventas_totales = ventas_validas.aggregate(total=Sum("total")).get("total") or Decimal("0")
        compras_totales = compras_validas.aggregate(total=Sum("total")).get("total") or Decimal("0")
        ganancia_bruta = ventas_totales - compras_totales
        margen_bruto = (
            (ganancia_bruta / ventas_totales) if ventas_totales else Decimal("0")
        )

        ventas_cobradas = (
            ventas_validas.filter(estado_cobro="cobrado").aggregate(total=Sum("total")).get("total")
            or Decimal("0")
        )
        ventas_parciales = (
            ventas_validas.filter(estado_cobro="parcial").aggregate(total=Sum("total")).get("total")
            or Decimal("0")
        )
        ventas_pendientes = (
            ventas_validas.filter(estado_cobro="pendiente").aggregate(total=Sum("total")).get("total")
            or Decimal("0")
        )

        compras_pagadas = (
            compras_validas.filter(estado_pago="pagado").aggregate(total=Sum("total")).get("total")
            or Decimal("0")
        )
        compras_parciales = (
            compras_validas.filter(estado_pago="parcial").aggregate(total=Sum("total")).get("total")
            or Decimal("0")
        )
        compras_pendientes = (
            compras_validas.filter(estado_pago="pendiente").aggregate(total=Sum("total")).get("total")
            or Decimal("0")
        )

        ingresos_caja = cobros_qs.aggregate(total=Sum("monto")).get("total") or Decimal("0")
        egresos_caja = pagos_qs.aggregate(total=Sum("monto")).get("total") or Decimal("0")
        flujo_neto = ingresos_caja - egresos_caja

        cobros_medios_qs = CobrosMedioPago.objects.filter(cobro__in=cobros_qs)
        cobros_legado_qs = cobros_qs.filter(medios_pago__isnull=True)

        ingresos_efectivo = (
            cobros_medios_qs.filter(medio_pago="efectivo").aggregate(total=Coalesce(Sum("monto"), Decimal("0"))).get("total")
            + (cobros_legado_qs.filter(medio_pago="efectivo").aggregate(total=Sum("monto")).get("total") or Decimal("0"))
        )
        ingresos_transferencia = (
            cobros_medios_qs.filter(medio_pago="transferencia").aggregate(total=Coalesce(Sum("monto"), Decimal("0"))).get("total")
            + (cobros_legado_qs.filter(medio_pago="transferencia").aggregate(total=Sum("monto")).get("total") or Decimal("0"))
        )

        deuda_clientes = (
            ventas_validas.filter(saldo_pendiente__gt=0).aggregate(total=Sum("saldo_pendiente")).get("total")
            or Decimal("0")
        )
        deuda_proveedores = (
            compras_validas.filter(saldo_pendiente__gt=0).aggregate(total=Sum("saldo_pendiente")).get("total")
            or Decimal("0")
        )

        ventas_deuda_filter = Q(ventas__saldo_pendiente__gt=0) & ~Q(ventas__estado_venta="cancelada")
        if fecha_desde_date:
            ventas_deuda_filter &= Q(ventas__fecha_venta__gte=fecha_desde_date)
        if fecha_hasta_date:
            ventas_deuda_filter &= Q(ventas__fecha_venta__lte=fecha_hasta_date)

        cobros_fecha_filter = Q()
        if fecha_desde_date:
            cobros_fecha_filter &= Q(cobros__fecha_cobro__gte=fecha_desde_date)
        if fecha_hasta_date:
            cobros_fecha_filter &= Q(cobros__fecha_cobro__lte=fecha_hasta_date)

        clientes_qs = Contactos.objects.filter(tipo="cliente", saldo_contacto__gt=0)
        if cliente:
            clientes_qs = clientes_qs.filter(id=cliente)

        clientes_qs = clientes_qs.annotate(
            ventas_pendientes=Count("ventas", filter=ventas_deuda_filter, distinct=True),
            ultimo_cobro=Max("cobros__fecha_cobro", filter=cobros_fecha_filter),
        ).order_by("-saldo_contacto", "nombre")

        clientes_con_deuda = [
            {
                "id": cliente_item.id,
                "nombre": cliente_item.nombre,
                "deuda": str(cliente_item.saldo_contacto),
                "ventas_pendientes": cliente_item.ventas_pendientes,
                "ultimo_cobro": cliente_item.ultimo_cobro,
            }
            for cliente_item in clientes_qs
        ]

        compras_pendientes_qs = compras_validas.filter(saldo_pendiente__gt=0).select_related("proveedor")
        compras_pendientes_list = [
            {
                "id": compra.id,
                "proveedor": compra.proveedor.nombre,
                "numero_documento": compra.numero_documento,
                "fecha_compra": compra.fecha_compra,
                "saldo_pendiente": str(compra.saldo_pendiente),
                "estado_pago": compra.estado_pago,
            }
            for compra in compras_pendientes_qs
        ]

        hoy = timezone.localdate()
        ventas_vencimientos = ventas_validas.filter(
            saldo_pendiente__gt=0, vencimiento__isnull=False
        )
        if cliente:
            ventas_vencimientos = ventas_vencimientos.filter(cliente_id=cliente)
        if fecha_desde_date:
            ventas_vencimientos = ventas_vencimientos.filter(fecha_venta__gte=fecha_desde_date)
        if fecha_hasta_date:
            ventas_vencimientos = ventas_vencimientos.filter(fecha_venta__lte=fecha_hasta_date)

        def resumen_vencimientos(qs):
            data = qs.aggregate(
                cantidad=Count("id"),
                saldo=Sum("saldo_pendiente"),
            )
            return {
                "cantidad": data.get("cantidad") or 0,
                "saldo": str(data.get("saldo") or Decimal("0")),
            }

        documentos_por_vencer = {
            "hoy": resumen_vencimientos(ventas_vencimientos.filter(vencimiento=hoy)),
            "proximos_7_dias": resumen_vencimientos(
                ventas_vencimientos.filter(vencimiento__gt=hoy, vencimiento__lte=hoy + timedelta(days=7))
            ),
            "proximos_30_dias": resumen_vencimientos(
                ventas_vencimientos.filter(vencimiento__gt=hoy + timedelta(days=7), vencimiento__lte=hoy + timedelta(days=30))
            ),
        }

        documentos_vencidos = resumen_vencimientos(ventas_vencimientos.filter(vencimiento__lt=hoy))

        response = {
            "filters": {
                "fecha_desde": fecha_desde_date,
                "fecha_hasta": fecha_hasta_date,
                "cliente": cliente,
                "proveedor": proveedor,
                "forma_pago": forma_pago,
                "estado_cobro": estado_cobro,
                "estado_pago": estado_pago,
                "medio_pago": medio_pago,
            },
            "cards": {
                "ventas_totales": {
                    "total": str(ventas_totales),
                    "cobradas": str(ventas_cobradas),
                    "parciales": str(ventas_parciales),
                    "pendientes": str(ventas_pendientes),
                },
                "compras_totales": {
                    "total": str(compras_totales),
                    "pagadas": str(compras_pagadas),
                    "parciales": str(compras_parciales),
                    "pendientes": str(compras_pendientes),
                },
                "ganancia_bruta": str(ganancia_bruta),
                "margen_bruto": str(margen_bruto),
                "ingresos_caja": {
                    "total": str(ingresos_caja),
                    "por_medio_pago": {
                        "efectivo": str(ingresos_efectivo),
                        "transferencia": str(ingresos_transferencia),
                    },
                },
                "egresos_caja": {
                    "total": str(egresos_caja),
                },
                "flujo_neto": str(flujo_neto),
                "deuda_clientes": str(deuda_clientes),
                "deuda_proveedores": str(deuda_proveedores),
            },
            "clientes_con_deuda": clientes_con_deuda,
            "compras_pendientes": compras_pendientes_list,
            "documentos_por_vencer": documentos_por_vencer,
            "documentos_vencidos": documentos_vencidos,
        }

        return Response(response)
