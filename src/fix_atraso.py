path = r'c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\pages\ProcessamentoAtraso.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace html2pdf import with jsPDF
content = content.replace("import html2pdf from 'html2pdf.js';", "import jsPDF from 'jspdf';")
print('Import fix OK' if 'jspdf' in content else 'Import fix FAILED')

# Fix 2: Replace handleExportarPDF to use jsPDF
start = content.find('  const handleExportarPDF = async () => {')
end_marker = '  // ── Render: Receipt Modal'
end = content.find(end_marker)
if start != -1 and end != -1:
    new_func = """  const handleExportarPDF = async () => {
    const element = document.getElementById('recibo-atraso-impressao');
    if (!element) return;
    const snap = recibos[reciboIndex];
    if (!snap) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    doc.html(element, {
      callback: (pdf) => {
        const filename = 'Recibo_' + snap.colaborador.nome.replace(/ /g, '_') + '_' + snap.mes + '_' + snap.ano + '.pdf';
        pdf.save(filename);
      },
      x: 0,
      y: 0,
      width: 210,
      windowWidth: element.scrollWidth || 794,
      autoPaging: 'text',
      margin: [0, 0, 0, 0],
    });
  };

  """
    content = content[:start] + new_func + content[end:]
    print('handleExportarPDF replaced OK')
else:
    print(f'handleExportarPDF not found: start={start}, end={end}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done writing ProcessamentoAtraso.tsx')
