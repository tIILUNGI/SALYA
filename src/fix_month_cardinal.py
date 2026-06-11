import re

def ensure_cardinal_month(content: str) -> str:
    # Em ProcessamentoAtraso.tsx, snap.mes pode vir do backend como número ou string.
    # Vamos garantir que se for número, converta para cardinal.
    
    # Primeiro definimos o array de meses se não existir no escopo ou apenas usamos um helper inline
    months_arr = "['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']"
    
    # No ProcessamentoAtraso.tsx: 
    # linha 458: <span style={{ fontWeight: 'bold' }}>Período:</span> {snap.mes} / {snap.ano}
    old_atraso = r"Período:</span> {snap.mes} / {snap.ano}"
    # Se snap.mes for string "Fevereiro", ele exibe. Se for número 2, precisamos de conversão.
    # Vamos usar uma lógica segura:
    new_atraso = r"Período:</span> {isNaN(Number(snap.mes)) ? snap.mes : ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][Number(snap.mes) - 1]} / {snap.ano}"
    
    content = content.replace(old_atraso, new_atraso)
    
    # No Processamento.tsx:
    # Já ajustei anteriormente para {receiptSnapshot.mes}, mas vamos garantir a mesma segurança
    old_proc = r"Período:</span> {receiptSnapshot.mes} / {receiptSnapshot.ano}"
    new_proc = r"Período:</span> {isNaN(Number(receiptSnapshot.mes)) ? receiptSnapshot.mes : ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][Number(receiptSnapshot.mes) - 1]} / {receiptSnapshot.ano}"
    
    content = content.replace(old_proc, new_proc)
    
    return content

files = [
    r'c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\pages\Processamento.tsx',
    r'c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\pages\ProcessamentoAtraso.tsx',
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixed = ensure_cardinal_month(content)
    
    if fixed != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'Fixed cardinal month in: {path.split(chr(92))[-1]}')
    else:
        print(f'Pattern not found or already fixed in: {path.split(chr(92))[-1]}')
