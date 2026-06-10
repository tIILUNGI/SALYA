import os

path = r"c:\Users\us\Downloads\Trabalhos e Projectos ILUNGI\Salya\SALYA\src\App.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace interface
old_iface = "  setColaboradores: (value: Colaborador[]) => void;"
new_iface = "  setColaboradores: (value: Colaborador[]) => void;\n  totalColaboradores: number;\n  setTotalColaboradores: (value: number) => void;"
content = content.replace(old_iface, new_iface)

# Replace context default
old_ctx = "  setColaboradores: () => {},"
new_ctx = "  setColaboradores: () => {},\n  totalColaboradores: 0,\n  setTotalColaboradores: () => {},"
content = content.replace(old_ctx, new_ctx)

# Replace state
old_state = "  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);"
new_state = "  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);\n  const [totalColaboradores, setTotalColaboradores] = useState(0);"
content = content.replace(old_state, new_state)

# Replace provider value (accounting for trailing space)
old_prov = "       colaboradores, setColaboradores, \n"
new_prov = "       colaboradores, setColaboradores, \n       totalColaboradores, setTotalColaboradores,\n"
content = content.replace(old_prov, new_prov)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Success")
