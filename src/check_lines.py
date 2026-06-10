import sys

path = r"c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\App.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines[:60]):
    print(f"{i+1}: {repr(line)}")
