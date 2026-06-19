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
const AUTH_STORAGE_KEYS = ['salya_token', 'token', 'salya_user', 'salya_empresaId', 'salya_empresa'] as const;

export const getAuthToken = () => {
  for (const key of TOKEN_STORAGE_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

export const setAuthToken = (token: string) => {
  TOKEN_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, token));
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

  // Busca por correspondência exata ou parcial
  for (const [key, value] of Object.entries(mappings)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }

  // Tratamento por status HTTP
  if (status === 401) return mappings['Unauthorized'];
  if (status === 403) return mappings['Forbidden'];
  if (status === 404) return mappings['Not Found'];
  if (status === 409) return mappings['Conflict'] || 'Esta informação já existe no sistema.';
  if (status >= 500) return 'O sistema encontrou um erro técnico inesperado. Tente novamente em instantes.';

  return 'Ocorreu um erro. Por favor, tente novamente ou contacte o suporte.';
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

const ensureAuthOrRedirect = async (response: Response, endpoint: string) => {
  if (response.status === 401) {
    const isAuthEndpoint = endpoint.startsWith('/auth');
    if (isAuthEndpoint) return;
    clearAuthStorage();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada');
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

export const api = {
  async get(endpoint: string, silentError = false) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
   
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      await ensureAuthOrRedirect(response, endpoint);

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
  },

  async post(endpoint: string, data: any, silentError = false) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📡 POST: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      await ensureAuthOrRedirect(response, endpoint);

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
  },

  async postForm(endpoint: string, formData: FormData, silentError = false) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getFormHeaders(),
        body: formData,
      });

      await ensureAuthOrRedirect(response, endpoint);

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
  },

  async put(endpoint: string, data: any, silentError = false) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      await ensureAuthOrRedirect(response, endpoint);

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
  },

  async patch(endpoint: string, data: any, silentError = false) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      await ensureAuthOrRedirect(response, endpoint);

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
  },

  async delete(endpoint: string, silentError = false) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📡 DELETE: ${url}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      await ensureAuthOrRedirect(response, endpoint);

      if (!response.ok) {
        const responseText = await response.text();
        throw buildErrorFromResponse(response, responseText);
      }

      return true;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada' && error.message !== 'Acesso negado' && !error.isSubscriptionBlock) {
      
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  }
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
