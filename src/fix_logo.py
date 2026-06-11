"""
Fix logoUrl resolution in Processamento.tsx and ProcessamentoAtraso.tsx
to use GET /api/logos/{filename} endpoint.
"""

import re

def fix_logo_src(content: str) -> str:
    # Replace: `${API_BASE_URL}${empresa.logoUrl}` with smart resolver
    old = '`${API_BASE_URL}${empresa.logoUrl}`'
    new = r'empresa.logoUrl.startsWith("http") ? empresa.logoUrl : empresa.logoUrl.startsWith("/logos/") ? `${API_BASE_URL}/logos/${empresa.logoUrl.replace("/logos/", "")}` : `${API_BASE_URL}/logos/${empresa.logoUrl.split("/").pop()}`'
    return content.replace(old, new)

files = [
    r'c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\pages\Processamento.tsx',
    r'c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\pages\ProcessamentoAtraso.tsx',
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixed = fix_logo_src(content)
    
    if fixed != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'Fixed logo src in: {path.split(chr(92))[-1]}')
    else:
        print(f'Pattern not found in: {path.split(chr(92))[-1]}')
        # Show what logo patterns exist
        for i, line in enumerate(content.split('\n'), 1):
            if 'logoUrl' in line and 'API_BASE_URL' in line:
                print(f'  Line {i}: {line.strip()}')
