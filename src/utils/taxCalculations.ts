import { taxasIRT } from '../data/mockData';

export const roundMoney = (value: number): number => Number(value.toFixed(2));

export const calcularINSS = (salarioBase: number, isPrestador = false, taxa = 0.03): number =>
  isPrestador ? 0 : roundMoney(salarioBase * taxa);

/**
 * IRT — Lei n.º 14/25 (Angola)
 * Fórmula: IRT = parcelaFixa + (MC - excesso) × taxa
 */
export const calcularIRT = (
  mc: number,
  isPrestador = false,
  isParticular = false
): { valor: number; faixa: string } => {
  if (mc <= 0) return { valor: 0, faixa: '1º Escalão' };

  if (isParticular && mc <= 100000) {
    return { valor: 0, faixa: 'Isento (Particular/Doméstico)' };
  }

  if (isPrestador) {
    return { valor: roundMoney(mc * 0.065), faixa: 'Prestador (Taxa Fixa 6,5%)' };
  }

  if (mc <= 150000) {
    return { valor: 0, faixa: 'Isento' };
  }

  const f = [...taxasIRT].reverse().find((b) => mc > b.excesso) ?? taxasIRT[0];
  const irt = Math.max(0, roundMoney(f.parcelaFixa + (mc - f.excesso) * (f.taxa / 100)));
  return { valor: irt, faixa: f.faixa };
};

export const calcularINSSPatronal = (salarioBase: number, isPrestador = false, taxa = 0.08): number =>
  isPrestador ? 0 : roundMoney(salarioBase * taxa);
