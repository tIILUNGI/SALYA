import { notify } from '../utils/notifications';

// Detecta se está em desenvolvimento local baseado na URL atual
const isLocalDevelopment = (): boolean => {
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  );
};

// Define a URL base da API com fallback
const getApiBaseUrl = (): string => {
  // 1. Verifica se há uma URL salva no localStorage (útil para desenvolvimento)
  const savedUrl = localStorage.getItem('api_base_url');
  if (savedUrl && isLocalDevelopment()) {
    return savedUrl;
  }
  
  // 2. Verifica se está em desenvolvimento local pela URL da janela
  if (isLocalDevelopment()) {
    const port = '8080';
    const hostname = window.location.hostname;
    // Se for localhost ou IP, usa o hostname atual para permitir acesso na rede local
    return `http://${hostname}:${port}/api`;
  }
  
  // 3. Verifica se é preview/deploy (Vercel, Netlify, etc)
  const hostname = window.location.hostname;
  if (hostname.includes('vercel.app') || 
      hostname.includes('netlify.app') ||
      hostname.includes('surge.sh')) {
    return 'https://api.salya.ao/api';
  }
  
  // 4. Fallback final para produção
  return 'https://api.salya.ao/api';
};

// Função para trocar a URL da API em tempo real (útil para desenvolvimento)
export const setApiBaseUrl = (url: string) => {
  localStorage.setItem('api_base_url', url);
  window.location.reload();
};

// Exibe a URL sendo usada no console
export const API_BASE_URL = getApiBaseUrl();

const TOKEN_STORAGE_KEYS = ['salya_token', 'token'] as const;
const REFRESH_TOKEN_KEY = 'salya_refresh_token';
const AUTH_STORAGE_KEYS = ['salya_token', 'token', 'salya_user', 'salya_empresaId', 'salya_empresa', REFRESH_TOKEN_KEY] as const;

export const getAuthToken = () => {
  for (const key of TOKEN_STORAGE_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

export const setAuthToken = (token: string, refreshToken?: string | null) => {
  TOKEN_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, token));
  if (refreshToken !== undefined) {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const getToken = () => getAuthToken();

const getHeaders = () => {
  const token = getToken();
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const getFormHeaders = () => {
  const token = getToken();
  const headers: any = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const parseJsonSafe = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Converte mensagens técnicas em algo amigável para o usuário final
 */
const humanizeMessage = (error: any): string => {
  const message = error.message || (typeof error === 'string' ? error : '');
  const status = error.status;

  // Verifica se é erro de conexão
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('JSON.parse')) {
    return 'Não foi possível estabelecer ligação com o servidor. Por favor, verifique a sua internet.';
  }

  // Dicionário de humanização (Mensagens para utilizadores não técnicos)
  const mappings: Record<string, string> = {
    'Failed to fetch': 'Erro de ligação. O sistema parece estar offline.',
    'Network Error': 'Erro de rede. Verifique a sua ligação à internet.',
    'Unauthorized': 'A sua sessão expirou por segurança. Por favor, entre novamente.',
    'Forbidden': 'Desculpe, não tem permissão para aceder a esta informação ou realizar esta acção.',
    'Internal Server Error': 'Ocorreu um problema técnico no nosso servidor. Estamos a trabalhar para resolver.',
    'Bad Request': 'Os dados enviados são inválidos. Por favor, verifique o que preencheu.',
    'Not Found': 'O que procura não foi encontrado ou já não existe.',
    'Conflict': 'Esta informação já existe no sistema (ex: NIF duplicado).',
    'User already exists': 'Este utilizador já está registado.',
    'Invalid credentials': 'O email ou a palavra-passe estão incorrectos.',
    'Email is already in use': 'Este email já está a ser utilizado por outra conta.',
    'quota exceeded': 'Atingiu o limite do seu plano actual.',
    'logo too large': 'A imagem é demasiado grande (máx. 2MB).',
  };

  // Se a mensagem for uma mensagem descritiva do backend (ex: limites de plano), retorna-a directamente
  const isGenericHttpText = message === 'Bad Request' || message === 'Internal Server Error' || message === 'Forbidden' || message === 'Unauthorized' || message.startsWith('HTTP ');
  if (message && !isGenericHttpText) {
    for (const [key, value] of Object.entries(mappings)) {
      if (message.toLowerCase() === key.toLowerCase()) return value;
    }
    return message;
  }

  // Busca por correspondência exata ou parcial nas mensagens padrão
  for (const [key, value] of Object.entries(mappings)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }

  // Tratamento por status HTTP
  if (status === 401) return mappings['Unauthorized'];
  if (status === 403) return mappings['Forbidden'];
  if (status === 404) return mappings['Not Found'];
  if (status === 409) return mappings['Conflict'] || 'Esta informação já existe no sistema.';
  if (status >= 500) return 'O sistema encontrou um erro técnico inesperado. Tente novamente em instantes.';

  return message || 'Ocorreu um erro. Por favor, tente novamente ou contacte o suporte.';
};

const buildErrorFromResponse = (response: Response, responseText: string) => {
  const errorData = parseJsonSafe(responseText);
  let message = responseText || response.statusText || `HTTP ${response.status}`;

  if (errorData) {
    if (typeof errorData === 'object') {
      message = errorData.message || errorData.error || errorData.details || errorData.title || message;
    } else {
      message = String(errorData);
    }
  }

  const error = new Error(message);
  (error as any).status = response.status;
  (error as any).body = errorData;
  return error;
};

const SUBSCRIPTION_CODES = ['SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_PENDING', 'SUBSCRIPTION_CANCELLED', 'SUBSCRIPTION_INACTIVE'];

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

// Tenta renovar o access token usando o refresh token.
// Retorna o novo access token ou null se o refresh falhar.
const attemptTokenRefresh = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = parseJsonSafe(await response.text());
    if (!data || !data.token) return null;

    setAuthToken(data.token, data.refreshToken ?? refreshToken);
    return data.token as string;
  } catch {
    return null;
  }
};

// Em caso de 401, tenta renovar o token uma única vez (com fila para
// evitar múltiplas renovações concorrentes) e, se bem-sucedido,
// reexecuta a chamada original. Apenas faz logout se o refresh falhar.
const handleUnauthorized = async (endpoint: string, retry: () => Promise<any>): Promise<any> => {
  const isAuthEndpoint = endpoint.startsWith('/auth');
  if (isAuthEndpoint) {
    clearAuthStorage();
    if (window.location.pathname !== '/login') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (isRefreshing) {
    const newToken = await new Promise<string | null>((resolve) => subscribeTokenRefresh(resolve));
    if (!newToken) {
      clearAuthStorage();
      if (window.location.pathname !== '/login') window.location.href = '/login';
      throw new Error('Sessão expirada');
    }
    return retry();
  }

  isRefreshing = true;
  try {
    const newToken = await attemptTokenRefresh();
    if (!newToken) {
      onRefreshed(null);
      clearAuthStorage();
      if (window.location.pathname !== '/login') window.location.href = '/login';
      throw new Error('Sessão expirada');
    }
    onRefreshed(newToken);
    return retry();
  } finally {
    isRefreshing = false;
  }
};

const ensureAuthOrRedirect = async (response: Response, endpoint: string, retry: () => Promise<any>) => {
  if (response.status === 401) {
    return handleUnauthorized(endpoint, retry);
  }

  if (response.status === 403) {
    const isAuthEndpoint = endpoint.startsWith('/auth');
    if (isAuthEndpoint) return;

    // Try to read body to detect subscription-specific block
    const cloned = response.clone();
    let isSubscriptionBlock = false;
    let subscriptionError: Error | null = null;

    try {
      const body = await cloned.json();
      if (body?.code && SUBSCRIPTION_CODES.includes(body.code)) {
        isSubscriptionBlock = true;
        // Dispatch event so SubscriptionBarrier shows — keep user logged in
        window.dispatchEvent(new CustomEvent('salya:subscription-blocked', {
          detail: { status: body.subscriptionStatus, code: body.code, message: body.error }
        }));
        subscriptionError = new Error(body.error || 'Assinatura inactiva');
        (subscriptionError as any).isSubscriptionBlock = true;
      }
    } catch {
      // Body is not JSON or parsing failed — treat as generic 403
    }

    if (isSubscriptionBlock && subscriptionError) {
      throw subscriptionError;
    }

    // Generic 403 = real access denied (IDOR) 
    // Em vez de expulsar o utilizador, apenas lançamos o erro.
    // O utilizador pode ter tentado aceder a algo inválido mas ainda tem uma sessão válida.
    throw new Error('Forbidden');
  }
};

const parseResponseText = (text: string) => {
  if (!text) return null;
  const json = parseJsonSafe(text);
  return json !== null ? json : text;
};

const readResponse = async (response: Response) => {
  const responseText = await response.text();
  return {
    responseText,
    responseData: parseResponseText(responseText)
  };
};

export const getApiErrorMessage = (error: any) => {
  return humanizeMessage(error);
};

// Executa uma chamada fetch e trata renovação automática de token (401).
// O `retry` permite reexecutar a mesma chamada após renovar o token.
const doRequest = async (
  endpoint: string,
  init: RequestInit,
  retry: () => Promise<any>,
  silentError: boolean
): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, init);
    const redirectResult = await ensureAuthOrRedirect(response, endpoint, retry);
    if (redirectResult !== undefined) {
      return redirectResult;
    }

    const { responseText, responseData } = await readResponse(response);
    if (!response.ok) {
      throw buildErrorFromResponse(response, responseText);
    }
    return responseData;
  } catch (error: any) {
    if (!silentError && error.message !== 'Sessão expirada' && error.message !== 'Acesso negado' && !error.isSubscriptionBlock) {
      notify.error('Ops!', humanizeMessage(error));
    }
    throw error;
  }
};

const requestWithTimeout = (init: RequestInit, timeoutMs: number): { signal: AbortSignal; clear: () => void } => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
};

export const api = {
  async get(endpoint: string, silentError = false): Promise<any> {
    const { signal, clear } = requestWithTimeout({}, 30000);
    try {
      const retry = () => api.get(endpoint, silentError);
      return await doRequest(
        endpoint,
        { method: 'GET', headers: getHeaders(), cache: 'no-store', signal },
        retry,
        silentError
      );
    } finally {
      clear();
    }
  },

  async post(endpoint: string, data: any, silentError = false): Promise<any> {
    const { signal, clear } = requestWithTimeout({}, 30000);
    try {
      const retry = () => api.post(endpoint, data, silentError);
      return await doRequest(
        endpoint,
        { method: 'POST', headers: getHeaders(), body: JSON.stringify(data), signal },
        retry,
        silentError
      );
    } finally {
      clear();
    }
  },

  async postForm(endpoint: string, formData: FormData, silentError = false): Promise<any> {
    const { signal, clear } = requestWithTimeout({}, 60000);
    try {
      const retry = () => api.postForm(endpoint, formData, silentError);
      return await doRequest(
        endpoint,
        { method: 'POST', headers: getFormHeaders(), body: formData, signal },
        retry,
        silentError
      );
    } finally {
      clear();
    }
  },

  async put(endpoint: string, data: any, silentError = false): Promise<any> {
    const { signal, clear } = requestWithTimeout({}, 30000);
    try {
      const retry = () => api.put(endpoint, data, silentError);
      return await doRequest(
        endpoint,
        { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data), signal },
        retry,
        silentError
      );
    } finally {
      clear();
    }
  },

  async patch(endpoint: string, data: any, silentError = false): Promise<any> {
    const retry = () => api.patch(endpoint, data, silentError);
    return await doRequest(
      endpoint,
      { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) },
      retry,
      silentError
    );
  },

  async delete(endpoint: string, silentError = false): Promise<any> {
    const retry = () => api.delete(endpoint, silentError);
    return await doRequest(
      endpoint,
      { method: 'DELETE', headers: getHeaders() },
      retry,
      silentError
    );
  },
};

// Função para debug - mostra a URL atual da API
export const showCurrentApiUrl = () => {
  return API_BASE_URL;
};

// Função para resolver a URL do logotipo usando o endpoint /api/logos
export const getLogoUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  try {
    const origin = new URL(API_BASE_URL).origin;
    const fileName = url.split('/').pop();
    return `${origin}/api/logos/${fileName}`;
  } catch (e) {
    return url;
  }
};
