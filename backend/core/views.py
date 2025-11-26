from django.db import models
from django.db.models import Sum, Case, When, F, Value, DecimalField, Prefetch
from django.utils.timezone import now
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Contactos, Productos, PedidosVentas, PedidosVentasDetalle, Ventas, Cobros, PedidosCompras, PedidosComprasDetalle, Compras, ComprasDetalle, Pagos, CuentaCorrienteMovimiento
from .serializers import ContactosSerializer, ProductosSerializer, PedidosVentasSerializer, PedidosVentasDetalleSerializer, VentasSerializer, CobrosSerializer, PedidosComprasDetalleSerializer, PedidosComprasSerializer, ComprasSerializer, ComprasDetalleSerializer, PagosSerializer, CuentaCorrienteMovimientoSerializer


class ContactosViewSet(viewsets.ModelViewSet):
    serializer_class = ContactosSerializer
    queryset = Contactos.objects.all()
    
    def get_queryset(self):
        qs = super().get_queryset()
           
        solo_clientes = self.request.query_params.get('clientes')
        solo_proveedores = self.request.query_params.get('proveedores')
        if solo_clientes == "1":
            qs = qs.filter(tipo='cliente')
        if solo_proveedores == "1":
            qs = qs.filter(tipo='proveedor')
            
        qs = qs.annotate(
            saldo=Sum(
                Case(
                When(ctacte_movimientos__tipo__in=['venta', 'compra'], then=F('ctacte_movimientos__monto')),
                When(ctacte_movimientos__tipo__in=['cobro', 'pago'], then=-F('ctacte_movimientos__monto')),
                When(ctacte_movimientos__tipo='ajuste', then=F('ctacte_movimientos__monto')),
                    default=0,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            )
        ).prefetch_related('ctacte_movimientos')
        return qs
    
class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductosSerializer
    queryset = Productos.objects.all()

    def get_queryset(self):
        qs = Productos.objects.all()
        
        solo_activo = self.request.query_params.get('activo', None)
        if solo_activo == "1":
            qs = qs.filter(activo=True)
        return qs
    
class OfertasViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductosSerializer

    def get_queryset(self):
        hoy = now().date()
        qs = Productos.objects.filter(
            activo=True,
            es_oferta=True,
        )
        return qs.filter(
            models.Q(fecha_inicio_oferta__isnull=True) | models.Q(fecha_inicio_oferta__lte=hoy),
            models.Q(fecha_fin_oferta__isnull=True) | models.Q(fecha_fin_oferta__gte=hoy),
        )

class PedidosVentasDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosVentasDetalleSerializer

    def get_queryset(self):
        qs = PedidosVentasDetalle.objects.select_related("pedido", "producto")
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        return qs
   
class PedidosVentasViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosVentasSerializer
    queryset = PedidosVentas.objects.all().prefetch_related("detalles")

    def update(self, request, *args, **kwargs):
        instancia = self.get_object()

        respuesta = super().update(request, *args, **kwargs)
        instancia.refresh_from_db()

        return respuesta

    # ======================================================
    # ACTION CORRECTAMENTE INDENTADO
    # ======================================================
    @action(detail=True, methods=["post"])
    def generar_venta(self, request, pk=None):
        pedido = self.get_object()

        forma_pago = request.data.get("forma_pago")
        medio_pago = request.data.get("medio_pago")

        total = pedido.detalles.aggregate(
            total=Sum(F("cantidad") * F("precio_unitario"))
        )["total"] or 0

        if forma_pago == "cuenta corriente":
            estado_cobro = "pendiente"
        else:
            estado_cobro = "cobrado" if medio_pago else "pendiente"

        venta = Ventas.objects.create(
            pedido=pedido,
            fecha_venta=now(),
            costo_entrega=0,
            forma_pago=forma_pago,
            medio_pago=medio_pago or "",
            estado_entrega="pendiente",
            estado_cobro=estado_cobro,
        )

        if forma_pago == "contado" and medio_pago:
            Cobros.objects.create(
                cliente=pedido.cliente,
                venta=venta,
                importe=total,
                medio_pago=medio_pago,
                fecha_cobro=now(),
            )

        if forma_pago == "cuenta corriente":
            CuentaCorrienteMovimiento.objects.create(
                contacto=pedido.cliente,
                tipo="venta",
                fecha=now(),
                monto=total,
                venta=venta,
                detalle=f"Venta #{venta.id} a Cuenta Corriente",
            )

        return Response({
            "venta_id": venta.id,
            "total": total,
            "forma_pago": forma_pago,
            "medio_pago": medio_pago,
        })
    
class VentasViewSet(viewsets.ModelViewSet):
    serializer_class = VentasSerializer
    queryset = Ventas.objects.select_related('pedido', 'pedido__cliente')
    
    def perform_create(self, serializer):
        venta = serializer.save()
    
        if venta.forma_pago == 'cuenta_corriente':
            cliente = venta.pedido.cliente
            CuentaCorrienteMovimiento.objects.create(
                contacto=cliente,
                fecha=venta.fecha_venta,
                tipo='venta',
                monto=venta.total,
                venta=venta,
                detalle=f"Venta #{venta.id} - Pedido #{venta.pedido.id}",
            )
            
class CobrosViewSet(viewsets.ModelViewSet):
    serializer_class = CobrosSerializer
    queryset = Cobros.objects.select_related('cliente')
    
    def perform_create(self, serializer):
        cobro = serializer.save()

        CuentaCorrienteMovimiento.objects.create(
            contacto=cobro.cliente,
            fecha=cobro.fecha_cobro,
            tipo='cobro',
            monto=-cobro.importe,
            cobro=cobro,
            detalle=f"Cobro #{cobro.id}",
        )

class PedidosComprasDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosComprasDetalleSerializer
    queryset = PedidosComprasDetalle.objects.select_related("pedido", "producto")

class PedidosComprasViewSet(viewsets.ModelViewSet):
    serializer_class = PedidosComprasSerializer
    queryset = PedidosCompras.objects.all().prefetch_related("detalles")
        
class ComprasViewSet(viewsets.ModelViewSet):
    serializer_class = ComprasSerializer
    queryset = Compras.objects.prefetch_related('detalles')
    
    def perform_create(self, serializer):
        compra = serializer.save()
        
        if compra.forma_pago == 'cuenta_corriente':
            CuentaCorrienteMovimiento.objects.create(
                contacto=compra.proveedor,
                fecha=compra.fecha_compra,
                tipo='compra',
                monto=compra.total,
                compra=compra,
                detalle=f"Compra #{compra.id}",
            )

class ComprasDetalleViewSet(viewsets.ModelViewSet):
    serializer_class = ComprasDetalleSerializer
    queryset = ComprasDetalle.objects.select_related("compra", "producto")
            
class PagosViewSet(viewsets.ModelViewSet):
    serializer_class = PagosSerializer
    queryset = Pagos.objects.select_related('proveedor')
    
    def perform_create(self, serializer):
        pago = serializer.save()

        CuentaCorrienteMovimiento.objects.create(
            contacto=pago.proveedor,
            fecha=pago.fecha_pago,
            tipo='pago',
            monto=-pago.importe,
            pago=pago,
            detalle=f"Pago #{pago.id}",
        )
        
class CuentaCorrienteMovimientoViewSet(viewsets.ModelViewSet):
    serializer_class = CuentaCorrienteMovimientoSerializer
    queryset = CuentaCorrienteMovimiento.objects.select_related('contacto', 'venta', 'cobro', 'compra', 'pago')
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        contacto_id = self.request.query_params.get('contacto_id', None)
        if contacto_id is not None:
            qs = qs.filter(contacto__id=contacto_id)
        return qs