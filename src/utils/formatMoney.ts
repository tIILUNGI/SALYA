/** Formatação monetária no padrão angolano (pt-AO): 1 234 567,89 Kz */
export const formatKz = (value?: number | null, maximumFractionDigits = 0): string => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `${amount.toLocaleString('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })} Kz`;
};

/** Eixo de gráficos — valores compactos mas no formato pt-AO */
export const formatKzAxis = (value: number): string => {
  const v = Number(value) || 0;
  const abs = Math.abs(v);

  if (abs >= 1_000_000) {
    const millions = v / 1_000_000;
    return `${millions.toLocaleString('pt-AO', { maximumFractionDigits: 1, minimumFractionDigits: 0 })} M Kz`;
  }

  if (abs >= 1_000) {
    return formatKz(v, 0);
  }

  return formatKz(v, 0);
};

/** Contagens e números genéricos no formato angolano */
export const formatNumberAngola = (value?: number | null): string => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return amount.toLocaleString('pt-AO', { maximumFractionDigits: 0 });
};
