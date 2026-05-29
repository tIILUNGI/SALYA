const TAB_LABELS: Record<string, string> = {
  empresa: 'Dados da Entidade',
  impostos: 'Taxas de Impostos',
  processamento: 'Notificações',
  gestao: 'Minhas Entidades',
  acesso: 'Gestão de Acesso',
  assinatura: 'Plano e Assinatura',
};

/** Título do separador do browser conforme o caminho actual */
export function getPageTitle(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';

  const exact: Record<string, string> = {
    '/': 'Início',
    '/login': 'Entrar',
    '/registar/planos': 'Escolher Plano',
    '/registar': 'Criar Conta',
    '/registar/verificar': 'Verificar Email',
    '/recuperar-senha': 'Recuperar Senha',
    '/reset-password': 'Redefinir Senha',
    '/dashboard': 'Dashboard',
    '/alertas': 'Alertas',
    '/colaboradores': 'Colaboradores',
    '/processamento': 'Processamento',
    '/processamento-atraso': 'Salários em Atraso',
    '/relatorios': 'Relatórios',
    '/profile': 'Perfil',
    '/configuracoes': 'Configurações',
  };

  if (exact[path]) return exact[path];

  const configMatch = path.match(/^\/configuracoes\/([^/]+)$/);
  if (configMatch) {
    const tab = configMatch[1];
    const label = TAB_LABELS[tab] || tab;
    return `Configurações — ${label}`;
  }

  return 'SALYA';
}

export const APP_TITLE_SUFFIX = 'SALYA';
