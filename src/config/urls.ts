/** Site institucional — salya.ao */
export const LANDING_URL = (process.env.REACT_APP_LANDING_URL || 'https://salya.ao').replace(/\/$/, '');

/** Aplicação (este projeto) — app.salya.ao em produção */
export const APP_URL = (process.env.REACT_APP_APP_URL || window.location.origin).replace(/\/$/, '');
