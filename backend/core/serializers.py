from rest_framework import serializers
from decimal import Decimal
from .models import Usuarios, Contactos, Productos, Ventas, VentasDetalle, Cobros, CobrosDetalle, CobrosMedioPago, Compras, ComprasDetalle, Pagos, PagosDetalle, PagosMedioPago, NotasCredito, NotasCreditoDetalle, NotasCreditoAplicacion
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError
from .domain.logica import calcular_subtotal, calcular_total
from .domain.validaciones_contactos import validar_forma_pago_contacto
from .domain.validaciones_ventas import validar_venta, validar_venta_detalles
from .domain.validaciones_cobros import validar_cobro, validar_actualizacion_cobro
from .domain.validaciones_compras import validar_compra
from .domain.validaciones_pagos import validar_pago, validar_actualizacion_pago
from .domain.validaciones_notascredito import validar_nota_credito
from .servicios.automatizaciones import saldos_al_crear_venta, saldos_al_crear_cobro, saldos_al_crear_cobro_detalle, actualizar_estado_ventas_al_cobrar, saldos_al_crear_pago, saldo_al_crear_pago_detalle, actualizar_estado_compras_al_pagar, recalcular_estado_pago, aplicar_nota_credito
from django.db import transaction

# ============================================================
# Serializers
# ============================================================

# Usuarios

class UsuariosSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", required=False)
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    username = serializers.CharField(source="user.username", required=False)

    class Meta:
        model = Usuarios
        fields = [
            "id",
            "username",
            "password",
            "confirm_password",
            "email",
            "nombre_completo",
            "telefono",
            "es_admin",
        ]
        read_only_fields = []

    def create(self, validated_data):
        user_data = validated_data.pop("user", {})
        password = validated_data.pop("password", None)
        validated_data.pop("confirm_password", None)

        user = User.objects.create(
            username=user_data.get("username"),
            email=user_data.get("email"),
        )
        if password:
            user.set_password(password)
            user.save()

        usuario = Usuarios.objects.create(user=user, **validated_data)
        return usuario

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        validated_data.pop("confirm_password", None)

        user = instance.user

        if "username" in user_data:
            user.username = user_data["username"]

        if "email" in user_data:
            user.email = user_data["email"]

        password = validated_data.pop("password", None)
        if password:
            user.set_password(password)

        user.save()

        if "telefono" in validated_data:
            instance.telefono = validated_data["telefono"]

        instance.save()
        return instance

    def validate(self, data):
        user_data = data.get("user", {})
        username = user_data.get("username")
        email = user_data.get("email")
        password = data.get("password")
        confirm_password = data.get("confirm_password")
        telefono = data.get("telefono")

        if self.instance is None:
            if not username:
                raise ValidationError("Username es obligatorio.")
            if not email:
                raise ValidationError("Email es obligatorio.")
            if not password:
                raise ValidationError("Password es obligatorio.")
            if not confirm_password:
                raise ValidationError("Confirma el password.")
            if not data.get("nombre_completo"):
                raise ValidationError("Nombre completo es obligatorio.")

        if username:
            existing = User.objects.filter(username__iexact=username)
            if self.instance:
                existing = existing.exclude(id=self.instance.user_id)
            if existing.exists():
                raise ValidationError("Username ya existe.")

        if email:
            existing = User.objects.filter(email__iexact=email)
            if self.instance:
                existing = existing.exclude(id=self.instance.user_id)
            if existing.exists():
                raise ValidationError("Email ya existe.")

        if password:
            if len(password) < 8:
                raise ValidationError("Password debe tener al menos 8 caracteres.")
            if not confirm_password:
                raise ValidationError("Confirma el password.")
            if password != confirm_password:
                raise ValidationError("Passwords no coinciden.")

        if telefono:
            telefono_str = str(telefono)
            if not telefono_str.isdigit() or len(telefono_str) != 10:
                raise ValidationError("Telefono debe tener 10 digitos.")

        return data

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

    def create(self, validated_data):
        calle = validated_data.pop('calle', '')
        numero = validated_data.pop('numero', '')
        ciudad = validated_data.pop('ciudad', '')

        if calle and numero and ciudad:
            validated_data['direccion'] = f"{calle} {numero}, {ciudad}, Buenos Aires, Argentina"

        return Contactos.objects.create(**validated_data)

    def update(self, instance, validated_data):
        calle = validated_data.pop('calle', None)
        numero = validated_data.pop('numero', None)
        ciudad = validated_data.pop('ciudad', None)

        if calle and numero and ciudad:
            instance.direccion = f"{calle} {numero}, {ciudad}, Buenos Aires, Argentina"

        return super().update(instance, validated_data)

    def validate(self, data):
        validar_forma_pago_contacto(data)
        return data

# Productos

class ProductosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Productos
        fields = "__all__"
        read_only_fields = ['creado_en', 'actualizado_en', 'precio_minorista', 'precio_mayorista', 'precio_oferta']

# Ventas

class VentasDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VentasDetalle
        fields = "__all__"
        read_only_fields = ['id', 'venta']

class VentasSerializer(serializers.ModelSerializer):
    detalles = VentasDetalleSerializer(many=True)
    cliente_nombre = serializers.SerializerMethodField()

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre if obj.cliente else "-"

    class Meta:
        model = Ventas
        fields = [
            'id',
            'fecha_venta',
            'cliente',
            'cliente_nombre',
            'direccion_entrega',
            'fecha_entrega',
            'forma_pago',
            'detalles',
            'subtotal',
            'costo_entrega',
            'descuento',
            'total',
            'saldo_pendiente',
            'estado_venta',
            'estado_cobro',
            'vencimiento',
        ]
        read_only_fields = ['subtotal', 'total', 'saldo_pendiente', 'estado_cobro', 'vencimiento', 'cliente_nombre']

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])

        validar_venta(validated_data)
        validar_venta_detalles(detalles_data)

        venta = Ventas.objects.create(**validated_data)

        for detalle_data in detalles_data:
            VentasDetalle.objects.create(venta=venta, **detalle_data)

        subtotal = calcular_subtotal(venta.detalles.all())
        total = calcular_total(subtotal=subtotal, costo_entrega=venta.costo_entrega, descuento=venta.descuento)

        venta.subtotal = subtotal
        venta.total = total
        venta.save(update_fields=['subtotal', 'total', 'saldo_pendiente'])

        saldos_al_crear_venta(venta)
        return venta

class CambiarEstadoVentaSerializer(serializers.Serializer):
    ESTADOS = ['confirmada', 'en_camino', 'entregada', 'cancelada']
    estado_venta = serializers.ChoiceField(choices=ESTADOS, required=True)

class CancelarVentaSerializer(serializers.Serializer):
    motivo_cancelacion = serializers.CharField(required=True)

# Cobros

class CobrosDetalleSerializer(serializers.ModelSerializer):
    venta = serializers.PrimaryKeyRelatedField(queryset=Ventas.objects.all())

    class Meta:
        model = CobrosDetalle
        fields = ['venta', 'monto_aplicado']
        read_only_fields = ['id', 'cobro']


class CobrosMedioPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CobrosMedioPago
        fields = ["medio_pago", "monto"]
        read_only_fields = ["id", "cobro"]


class CobrosSerializer(serializers.ModelSerializer):
    detalles = CobrosDetalleSerializer(many=True, required=False)
    medios_pago = CobrosMedioPagoSerializer(many=True, required=False)
    medio_pago_resumen = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Cobros
        fields = [
                  'id',
                  'cliente',
                  'fecha_cobro',
                  'medio_pago',
                  'medio_pago_resumen',
                  'monto',
                  'observaciones',
                  'saldo_disponible',
                  'detalles',
                  'medios_pago',
            ]
        read_only_fields = ['creado_en', 'actualizado_en']

    def get_medio_pago_resumen(self, obj):
        medios = list(obj.medios_pago.all())
        if not medios:
            return obj.medio_pago or ""
        if len(medios) == 1:
            return medios[0].medio_pago
        return "multiple"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        monto = attrs.get("monto", getattr(self.instance, "monto", None))
        medio_pago = attrs.get("medio_pago")
        medios_pago_data = attrs.get("medios_pago")

        if monto is not None and monto <= 0:
            raise ValidationError("El monto del cobro debe ser positivo.")

        if self.instance is None:
            if not medios_pago_data:
                if not medio_pago:
                    raise ValidationError("Debes informar al menos un medio de pago.")
                attrs["medios_pago"] = [{"medio_pago": medio_pago, "monto": monto}]
            total_medios = sum(Decimal(item["monto"]) for item in attrs["medios_pago"])
            if total_medios != Decimal(monto):
                raise ValidationError("La suma de los medios de pago debe coincidir con el monto total.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        medios_pago_data = validated_data.pop("medios_pago", [])
        validated_data["medio_pago"] = (
            medios_pago_data[0]["medio_pago"] if len(medios_pago_data) == 1 else ""
        )

        validar_cobro(validated_data, detalles_data)

        cobro = Cobros.objects.create(**validated_data)

        for medio_data in medios_pago_data:
            CobrosMedioPago.objects.create(cobro=cobro, **medio_data)

        saldos_al_crear_cobro(cobro)

        for detalle_data in detalles_data:
            detalle = CobrosDetalle.objects.create(cobro=cobro, **detalle_data)
            saldos_al_crear_cobro_detalle(detalle)

        actualizar_estado_ventas_al_cobrar(cobro)

        return cobro

    @transaction.atomic
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        validated_data.pop("medios_pago", None)

        validar_actualizacion_cobro(instance, validated_data, detalles_data or [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if detalles_data:
            for detalle_data in detalles_data:
                detalle = CobrosDetalle.objects.create(cobro=instance, **detalle_data)
                saldos_al_crear_cobro_detalle(detalle)

        actualizar_estado_ventas_al_cobrar(instance)

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
            'fecha_compra',
            'extra',
            'estado_compra',
            'descuento',
            'observaciones',
            'detalles',
            'numero_documento',
            'subtotal',
            'total',
            'saldo_pendiente',
            'estado_pago',
            ]
        read_only_fields = ['subtotal', 'total', 'saldo_pendiente', 'estado_compra', 'estado_pago']

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])

        validar_compra(validated_data, detalles_data)

        extra = validated_data.get('extra') or 0
        descuento = validated_data.get('descuento') or 0

        compra = Compras.objects.create(**validated_data)

        for detalle_data in detalles_data:
            ComprasDetalle.objects.create(compra=compra, **detalle_data)

        subtotal = calcular_subtotal(compra.detalles.all())
        total = calcular_total(subtotal=subtotal, extra=extra, descuento=descuento)

        compra.subtotal = subtotal
        compra.total = total
        compra.saldo_pendiente = total
        compra.save(update_fields=['subtotal', 'total', 'saldo_pendiente'])

        recalcular_estado_pago(compra)

        return compra

    def validate(self, attrs):
        validar_compra(attrs, attrs.get('detalles', []))
        return attrs

class CambiarEstadoCompraSerializer(serializers.Serializer):
    estado_compra = serializers.CharField(required=True)

class CancelarCompraSerializer(serializers.Serializer):
    motivo_cancelacion = serializers.CharField(required=True)

# Pagos

class PagosDetalleSerializer(serializers.ModelSerializer):
    compra = serializers.PrimaryKeyRelatedField(queryset=Compras.objects.all())

    class Meta:
        model = PagosDetalle
        fields = ['compra', 'monto_aplicado']
        read_only_fields = ['id', 'pago']


class PagosMedioPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagosMedioPago
        fields = ["medio_pago", "monto"]
        read_only_fields = ["id", "pago"]


class PagosSerializer(serializers.ModelSerializer):
    detalles = PagosDetalleSerializer(many=True, required=False)
    medios_pago = PagosMedioPagoSerializer(many=True, required=False)
    medio_pago_resumen = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Pagos
        fields = [
            'id',
            'proveedor',
            'fecha_pago',
            'medio_pago',
            'medio_pago_resumen',
            'monto',
            'observaciones',
            'saldo_disponible',
            'detalles',
            'medios_pago',
            ]
        read_only_fields = ['creado_en', 'actualizado_en', 'saldo_disponible']

    def get_medio_pago_resumen(self, obj):
        medios = list(obj.medios_pago.all())
        if not medios:
            return obj.medio_pago or ""
        if len(medios) == 1:
            return medios[0].medio_pago
        return "multiple"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        monto = attrs.get("monto", getattr(self.instance, "monto", None))
        medio_pago = attrs.get("medio_pago")
        medios_pago_data = attrs.get("medios_pago")

        if monto is not None and monto <= 0:
            raise ValidationError("El monto del pago debe ser un valor positivo.")

        if self.instance is None:
            if not medios_pago_data:
                if not medio_pago:
                    raise ValidationError("Debes informar al menos un medio de pago.")
                attrs["medios_pago"] = [{"medio_pago": medio_pago, "monto": monto}]
            total_medios = sum(Decimal(item["monto"]) for item in attrs["medios_pago"])
            if total_medios != Decimal(monto):
                raise ValidationError("La suma de los medios de pago debe coincidir con el monto total.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        medios_pago_data = validated_data.pop("medios_pago", [])
        validated_data["medio_pago"] = (
            medios_pago_data[0]["medio_pago"] if len(medios_pago_data) == 1 else ""
        )

        validar_pago(validated_data, detalles_data)

        pago = Pagos.objects.create(**validated_data)

        for medio_data in medios_pago_data:
            PagosMedioPago.objects.create(pago=pago, **medio_data)

        saldos_al_crear_pago(pago)

        for detalle_data in detalles_data:
            detalle = PagosDetalle.objects.create(pago=pago, **detalle_data)
            saldo_al_crear_pago_detalle(detalle)

        actualizar_estado_compras_al_pagar(pago)

        return pago

    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        validated_data.pop("medios_pago", None)

        validar_actualizacion_pago(instance, validated_data, detalles_data or [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if detalles_data:
            for detalle_data in detalles_data:
                detalle = PagosDetalle.objects.create(pago=instance, **detalle_data)
                saldo_al_crear_pago_detalle(detalle)

            instance.save(update_fields=['saldo_disponible'])

        actualizar_estado_compras_al_pagar(instance)

        return instance

# Notas de Credito

class NotasCreditoDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotasCreditoDetalle
        fields = [
            'producto',
            'cantidad',
            'precio_unitario',
        ]
        read_only_fields = ['id', 'nota_credito']

class NotasCreditoAplicacionSerializer(serializers.ModelSerializer):
    venta = serializers.PrimaryKeyRelatedField(queryset=Ventas.objects.all(), required=False, allow_null=True)
    compra = serializers.PrimaryKeyRelatedField(queryset=Compras.objects.all(), required=False, allow_null=True)

    class Meta:
        model = NotasCreditoAplicacion
        fields = [
            'venta',
            'compra',
            'monto_aplicado'
        ]

class NotasCreditoSerializer(serializers.ModelSerializer):
    monto = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=True)
    detalles = NotasCreditoDetalleSerializer(many=True, required=False)
    aplicaciones = NotasCreditoAplicacionSerializer(many=True, required=False)

    class Meta:
        model = NotasCredito
        fields = [
            'id',
            'contacto',
            'tipo',
            'fecha_nota',
            'subtotal',
            'numero_documento',
            'estado',
            'motivo',
            'total',
            'detalles',
            'aplicaciones',
            'monto',
        ]
        read_only_fields = ['creado_en', 'actualizado_en', 'subtotal', 'total', 'estado']

    @transaction.atomic
    def create(self, validated_data):
        validar_nota_credito({
            'tipo': validated_data.get('tipo'),
            'detalles': validated_data.get('detalles', []),
            'aplicaciones': validated_data.get('aplicaciones', []),
            'monto': validated_data.get('monto'),
        })

        monto = validated_data.pop('monto', None)
        detalles_data = validated_data.pop('detalles', [])
        aplicaciones_data = validated_data.pop('aplicaciones', [])

        nota_credito = NotasCredito.objects.create(**validated_data)

        for detalle_data in detalles_data:
            NotasCreditoDetalle.objects.create(
                nota_credito=nota_credito,
                **detalle_data
            )

        total = Decimal(monto)
        nota_credito.subtotal = total
        nota_credito.total = total
        nota_credito.save(update_fields=['subtotal', 'total'])

        for aplicacion_data in aplicaciones_data:
            NotasCreditoAplicacion.objects.create(
                nota_credito=nota_credito,
                **aplicacion_data
                )

        aplicar_nota_credito(nota_credito)

        return nota_credito
