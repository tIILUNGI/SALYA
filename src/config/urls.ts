/** Site institucional — salya.ao */
export const LANDING_URL = (process.env.REACT_APP_LANDING_URL || 'https://salya.ao').replace(/\/$/, '');

/** Aplicação (este projeto) — app.salya.ao em produção */
export const APP_URL = (process.env.REACT_APP_APP_URL || window.location.origin).replace(/\/$/, '');

/** Painel Administrativo — admin.salya.ao em produção, localhost:5174 em dev */
export const ADMIN_URL = (
  process.env.REACT_APP_ADMIN_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5174' 
    : 'https://admin.salya.ao')
).replace(/\/$/, '');
