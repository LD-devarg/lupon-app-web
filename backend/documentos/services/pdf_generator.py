from django.template.loader import render_to_string
from weasyprint import HTML
from django.conf import settings

def generar_pdf(template, context, output_path=None):
    html = render_to_string(template, context)
    pdf = HTML(string=html,base_url=settings.BASE_DIR).write_pdf()
    
    if output_path:
        with open(output_path, 'wb') as f:
            f.write(pdf)
    
    return pdf