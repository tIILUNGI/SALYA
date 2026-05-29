/**
 * Em produção, desactiva saída no consola do navegador (inclui bibliotecas de terceiros).
 */
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && typeof window !== 'undefined') {
  const noop = (): void => undefined;
  const methods: Array<keyof Console> = ['log', 'debug', 'info', 'warn', 'error', 'trace', 'table', 'group', 'groupCollapsed', 'groupEnd'];

  for (const method of methods) {
    try {
      (console[method] as unknown) = noop;
    } catch {
      // ignore
    }
  }
}

export {};
