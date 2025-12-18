from rest_framework.exceptions import ValidationError

def validar_forma_pago_contacto(data):
    """
    Reglas de negocio para contactos:
    - Si forma_pago == 'contado' => dias_cc debe ser 0
    - Si forma_pago == 'cuenta corriente' => dias_cc debe ser > 0
    """

    forma_pago = data.get('forma_pago')
    dias_cc = data.get('dias_cc', 0)

    if forma_pago == 'contado' and dias_cc != 0:
        raise ValidationError(
            "Si la forma de pago es 'Contado', los días de crédito deben ser 0."
        )

    if forma_pago == 'cuenta corriente' and dias_cc == 0:
        raise ValidationError(
            "Si la forma de pago es 'Cuenta Corriente', los días de crédito deben ser mayores a 0."
        )

    return True