// api.ts
export const API_BASE_URL = 'http://localhost:8081';

const getToken = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('salya_token');
  console.group('🔑 TOKEN DEBUG');
  console.log('Token encontrado:', token ? `${token.substring(0, 30)}...` : 'NENHUM');
  console.log('Chave token:', localStorage.getItem('token') ? '✅ token' : '❌ token');
  console.log('Chave salya_token:', localStorage.getItem('salya_token') ? '✅ salya_token' : '❌ salya_token');
  console.groupEnd();
  return token;
};

const getHeaders = () => {
  const token = getToken();
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  console.log('📋 Headers:', headers);
  return headers;
};

const getFormHeaders = () => {
  const token = getToken();
  const headers: any = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  console.log('📋 Form Headers:', headers);
  return headers;
};

const parseJsonSafe = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
  if (!error) return 'Erro desconhecido';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.body?.message) return error.body.message;
  if (error.body?.error) return error.body.error;
  return 'Erro desconhecido';
};

export const api = {
  async get(endpoint: string) {
    console.group(`📡 GET ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(),
    });

    console.log('Response status:', response.status);
    ensureAuthOrRedirect(response);

    const { responseText, responseData } = await readResponse(response);
    if (!response.ok) {
      console.error('❌ Erro:', responseText);
      console.groupEnd();
      throw buildErrorFromResponse(response, responseText);
    }

    console.log('✅ Sucesso:', responseData);
    console.groupEnd();
    return responseData;
  },

  async post(endpoint: string, data: any) {
    console.group(`📡 POST ${endpoint}`);
    console.log('📦 Dados enviados:', JSON.stringify(data, null, 2));

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status);
    ensureAuthOrRedirect(response);

    const { responseText, responseData } = await readResponse(response);
    console.log('📨 Response body:', responseText);

    if (!response.ok) {
      console.groupEnd();
      throw buildErrorFromResponse(response, responseText);
    }

    console.log('✅ Sucesso:', responseData);
    console.groupEnd();
    return responseData;
  },

  async postForm(endpoint: string, formData: FormData) {
    console.group(`📡 POST FORM ${endpoint}`);
    console.log('📦 FormData entries:');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getFormHeaders(),
      body: formData,
    });

    console.log('Response status:', response.status);
    ensureAuthOrRedirect(response);

    const { responseText, responseData } = await readResponse(response);
    console.log('📨 Response body:', responseText);

    if (!response.ok) {
      console.groupEnd();
      throw buildErrorFromResponse(response, responseText);
    }

    console.log('✅ Sucesso:', responseData);
    console.groupEnd();
    return responseData;
  },

  async put(endpoint: string, data: any) {
    console.group(`📡 PUT ${endpoint}`);
    console.log('📦 Dados enviados:', JSON.stringify(data, null, 2));

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status);
    ensureAuthOrRedirect(response);

    const { responseText, responseData } = await readResponse(response);
    console.log('📨 Response body:', responseText);

    if (!response.ok) {
      console.groupEnd();
      throw buildErrorFromResponse(response, responseText);
    }

    console.log('✅ Sucesso:', responseData);
    console.groupEnd();
    return responseData;
  },

  async patch(endpoint: string, data: any) {
    console.group(`📡 PATCH ${endpoint}`);
    console.log('📦 Dados enviados:', JSON.stringify(data, null, 2));

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status);
    ensureAuthOrRedirect(response);

    const { responseText, responseData } = await readResponse(response);
    console.log('📨 Response body:', responseText);

    if (!response.ok) {
      console.groupEnd();
      throw buildErrorFromResponse(response, responseText);
    }

    console.log('✅ Sucesso:', responseData);
    console.groupEnd();
    return responseData;
  },

  async delete(endpoint: string) {
    console.group(`📡 DELETE ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    console.log('Response status:', response.status);
    ensureAuthOrRedirect(response);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ Erro:', responseText);
      console.groupEnd();
      throw buildErrorFromResponse(response, responseText);
    }

    console.log('✅ Sucesso: Deletado');
    console.groupEnd();
    return response.ok;
  }
};