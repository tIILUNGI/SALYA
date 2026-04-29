# SALYA Payroll - Sistema Integrado de Gestão de Salários

Sistema completo de gestão de folha de pagamento para Angola, desenvolvido com React e TypeScript.

## Funcionalidades

- **Login** - Autenticação segura
- **Dashboard** - Painel de controle com estatísticas
- **Colaboradores** - Gestão de funcionários com busca e filtros
- **Processamento** - Processamento de salários
- **Férias** - Gestão de pedidos de férias
- **Faltas e Bónus** - Registro de horas extras, bónus e faltas
- **Relatórios** - Relatórios de folha de pagamento
- **Auditoria** - Logs de atividades
- **Faturas** - Faturação eletrônica
- **Multicaixa** - Integração com Multicaixa Express
- **Arquivo CNAB** - Geração de arquivos bancários
- **Guias DLI/AGT** - Guias de pagamento de impostos
- **Submissão MRT** - Declarações para autoridades
- **Configurações** - Configurações do sistema

## Instalação

1. Entre no diretório do projeto:
```bash
cd salya_payroll_react
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm start
```

4. Abra no navegador: http://localhost:3000

## Credenciais de Login

- Email: admin@salya.com
- Palavra-passe: admin123

## Tecnologias

- React 18
- TypeScript
- Tailwind CSS
- React Router DOM
- Material Symbols Icons

## Design

O sistema foi desenvolvido seguindo o mesmo design das telas enviadas, com:
- Cores: Primary #1162d4
- Tipografia: Inter
- Ícones: Material Symbols Outlined
- Estilo: Moderno e limpo para o mercado angolano

## Estrutura do Projeto

```
salya_payroll_react/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── data/
│   │   └── ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Colaboradores.tsx
│   │   ├── Processamento.tsx
│   │   ├── Ferias.tsx
│   │   ├── FaltasBonus.tsx
│   │   ├── Relatorios.tsx
│   │   ├── Auditoria.tsx
│   │   ├── Faturas.tsx
│   │   ├── Multicaixa.tsx
│   │   ├── Bancario.tsx
│   │   ├── Guias.tsx
│   │   ├── MRT.tsx
│   │   └── Configuracoes.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── index.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Notas

- Este é um projeto de demonstração com dados mock
- Para produção, conecte a uma API real
- Configure as taxas de impostos conforme a legislação angolana vigente
