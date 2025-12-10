from rest_framework.exceptions import ValidationError
from core.models import Usuarios

# CAMBIO DE CONTRASEÑA
def validar_cambio_contrasena(usuario_objetivo, usuario_actor, password_actual, password_nueva, password_confirmacion):
    
    # El usuario objetivo debe ser el mismo que el actual, o tener permisos de admin
    if usuario_objetivo.id != usuario_actor.id and not usuario_actor.es_admin:
        raise ValidationError("No puedes cambiar la contraseña de otro usuario.")
    
    # Verificar que la contraseña actual es correcta
    if not usuario_objetivo.user.check_password(password_actual):
        raise ValidationError("La contraseña actual es incorrecta.")
    
    # La nueva contraseña no puede ser igual a la actual
    if password_actual == password_nueva:
        raise ValidationError("La nueva contraseña no puede ser igual a la actual.")
    
    # La nueva contraseña y su confirmación deben coincidir  
    if password_nueva != password_confirmacion:
        raise ValidationError("La confirmación de la nueva contraseña no coincide.")
    
    return True

# CAMBIO DE EMAIL
def validar_cambio_email(usuario_objetivo, usuario_actor, nuevo_email):
    
    # El usuario objetivo debe ser el mismo que el actual, o tener permisos de admin
    if usuario_objetivo.id != usuario_actor.id and not usuario_actor.es_admin:
        raise ValidationError("No puedes cambiar el email de otro usuario.")

    # Evitar nulos o vacíos
    if not nuevo_email or not nuevo_email.strip():
        raise ValidationError("El nuevo email no puede estar vacío.")
    
    # No repetir el mismo email
    if usuario_objetivo.user.email == nuevo_email:
        raise ValidationError("El nuevo email no puede ser igual al actual.")
    
    # Verificar que el email no esté en uso por otro usuario
    if Usuarios.objects.filter(user__email=nuevo_email).exclude(user=usuario_objetivo.user).exists():
        raise ValidationError("El email ya está en uso por otro usuario.")
    
    # Validación simple
    if "@" not in nuevo_email or "." not in nuevo_email.split("@")[-1]:
        raise ValidationError("El formato del email es inválido.")
    
    return True

# CAMBIO DE ESTADO DE USUARIO
def validar_cambio_estado_usuario(usuario_actor, usuario_objetivo, nuevo_estado):
    # Solo admin puede cambiar admin
    if not usuario_actor.es_admin:
        raise ValidationError("Solo los administradores pueden modificar permisos o estado de usuarios.")
    
    # Un usuario no puede cambiar su propio estado
    if usuario_actor.id == usuario_objetivo.id:
        raise ValidationError("No puedes cambiar tu propio estado.")
    
    # Validar que el nuevo estado sea diferente
    if usuario_objetivo.activo == nuevo_estado:
        raise ValidationError("El nuevo estado debe ser diferente al actual.")
    
    return True
