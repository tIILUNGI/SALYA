import { notify } from '../utils/notifications';

// api.ts
export const API_BASE_URL = 'http://localhost:8081/api';


const getToken = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('salya_token');
  return token;
};

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

  // Dicionário de humanização
  const mappings: Record<string, string> = {
    'Failed to fetch': 'Não foi possível conectar ao servidor. Verifique sua internet.',
    'Network Error': 'Erro de rede. O servidor pode estar fora do ar.',
    'Unauthorized': 'Sua sessão expirou. Por favor, faça login novamente.',
    'Forbidden': 'Você não tem permissão para realizar esta ação.',
    'Internal Server Error': 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
    'Bad Request': 'Os dados informados parecem estar incorretos.',
    'Not Found': 'O recurso solicitado não foi encontrado.',
    'User already exists': 'Este usuário já está cadastrado no sistema.',
    'Invalid credentials': 'Email ou senha incorretos. Verifique seus dados.',
    'Email is already in use': 'Este email já está sendo utilizado por outra conta.',
  };

  // Busca por correspondência exata ou parcial
  for (const [key, value] of Object.entries(mappings)) {
    if (message.includes(key)) return value;
  }

  // Tratamento por status HTTP
  if (status === 401) return mappings['Unauthorized'];
  if (status === 403) return mappings['Forbidden'];
  if (status === 404) return mappings['Not Found'];
  if (status >= 500) return mappings['Internal Server Error'];

  return message || 'Ocorreu um erro inesperado. Por favor, tente novamente.';
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

const ensureAuthOrRedirect = (response: Response) => {
  if (response.status === 401) {
    console.warn('⚠️ Token expirado! Redirecionando para login...');
    localStorage.removeItem('token');
    localStorage.removeItem('salya_token');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
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
  async get(endpoint: string) {
    console.group(`📡 GET ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(),
    });

      ensureAuthOrRedirect(response);

      const { responseText, responseData } = await readResponse(response);
      if (!response.ok) {
        throw buildErrorFromResponse(response, responseText);
      }

      return responseData;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada') {
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  },

  async post(endpoint: string, data: any) {
    console.group(`📡 POST ${endpoint}`);
    console.log('📦 Dados enviados:', JSON.stringify(data, null, 2));

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

      ensureAuthOrRedirect(response);

      const { responseText, responseData } = await readResponse(response);
      if (!response.ok) {
        throw buildErrorFromResponse(response, responseText);
      }

      return responseData;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada') {
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  },

  async postForm(endpoint: string, formData: FormData, silentError = false) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getFormHeaders(),
        body: formData,
      });

      ensureAuthOrRedirect(response);

      const { responseText, responseData } = await readResponse(response);
      if (!response.ok) {
        throw buildErrorFromResponse(response, responseText);
      }

      return responseData;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada') {
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  },

  async put(endpoint: string, data: any, silentError = false) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      ensureAuthOrRedirect(response);

      const { responseText, responseData } = await readResponse(response);
      if (!response.ok) {
        throw buildErrorFromResponse(response, responseText);
      }

      return responseData;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada') {
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  },

  async patch(endpoint: string, data: any, silentError = false) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      ensureAuthOrRedirect(response);

      const { responseText, responseData } = await readResponse(response);
      if (!response.ok) {
        throw buildErrorFromResponse(response, responseText);
      }

      return responseData;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada') {
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  },

  async delete(endpoint: string, silentError = false) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      ensureAuthOrRedirect(response);

      if (!response.ok) {
        const responseText = await response.text();
        throw buildErrorFromResponse(response, responseText);
      }

      return true;
    } catch (error: any) {
      if (!silentError && error.message !== 'Sessão expirada') {
        notify.error('Ops!', humanizeMessage(error));
      }
      throw error;
    }
  }
};
