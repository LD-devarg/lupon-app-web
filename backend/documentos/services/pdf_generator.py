from django.template.loader import render_to_string
from pathlib import Path

PDF_ASSETS_DIR = Path(__file__).resolve().parent.parent / 'assets'

def generar_pdf(template, context, output_path=None):
    try:
        from weasyprint import HTML
    except OSError as exc:
        raise RuntimeError(
            "No se pudo generar PDF: faltan librerias nativas de WeasyPrint "
            "(GTK/Pango/Cairo). Instala GTK Runtime x64 y agrega su carpeta "
            "'bin' al PATH."
        ) from exc

    html = render_to_string(template, context)
    pdf = HTML(string=html,base_url=PDF_ASSETS_DIR).write_pdf()
    
    return pdf
