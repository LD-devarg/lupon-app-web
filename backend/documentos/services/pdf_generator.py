from django.template.loader import render_to_string
from pathlib import Path

PDF_ASSETS_DIR = Path(__file__).resolve().parent.parent / 'assets'

def generar_pdf(template, context, output_path=None):
    from weasyprint import HTML

    html = render_to_string(template, context)
    pdf = HTML(string=html,base_url=PDF_ASSETS_DIR).write_pdf()
    
    return pdf
