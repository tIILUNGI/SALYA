import re

path = r'c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\pages\Processamento.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace handleGuardarPDF - use jsPDF.html()
start = content.find('  const handleGuardarPDF = () => {')
end_marker = '  const handleUpdateOtherGain ='
end = content.find(end_marker)
if start != -1 and end != -1:
    new_func = """  const handleGuardarPDF = () => {
    const element = document.getElementById('recibo-para-impressao');
    if (!element || !receiptSnapshot) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    doc.html(element, {
      callback: (pdf) => {
        const filename = 'Recibo_' + receiptSnapshot.colaborador.nome.replace(/ /g, '_') + '_' + receiptSnapshot.ano + String(monthToNum(receiptSnapshot.mes)).padStart(2, '0') + '.pdf';
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
    print('handleGuardarPDF replaced OK')
else:
    print(f'handleGuardarPDF not found: start={start}, end={end}')

# Fix 2: Period display - change numeric month to name in receipt modal
old_periodo = "Período:</span> {String(monthToNum(receiptSnapshot.mes)).padStart(2, '0')} / {receiptSnapshot.ano}"
new_periodo = "Período:</span> {receiptSnapshot.mes} / {receiptSnapshot.ano}"
if old_periodo in content:
    content = content.replace(old_periodo, new_periodo)
    print('Period fix OK')
else:
    print('Period pattern not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done writing file')
