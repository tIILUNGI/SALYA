/**
 * Tabela IRT — Lei n.º 14/25 (Angola)
 *
 * Fórmula: IRT = (Matéria Colectável × taxa / 100) - parcelaFixa
 *
 * O algoritmo percorre a tabela ao contrário e encontra o escalão
 * mais alto onde MC > excesso — sem gaps nem sobreposições.
 *
 * Escalão  | excesso (Kz)  | taxa  | parcelaFixa (Kz)
 * ─────────┼───────────────┼───────┼──────────────────
 * 1º       |             0 |  0%   |             0
 * 2º       |       150.000 | 16%   |        12.500
 * 3º       |       200.000 | 18%   |        31.250
 * 4º       |       300.000 | 19%   |        49.250
 * 5º       |       500.000 | 20%   |        87.250
 * 6º       |     1.000.000 | 21%   |       187.250
 * 7º       |     1.500.000 | 22%   |       292.250
 * 8º       |     2.000.000 | 23%   |       402.250
 * 9º       |     2.500.000 | 24%   |       517.250
 * 10º      |     5.000.000 | 24,5% |     1.117.250
 * 11º      |    10.000.000 | 25%   |     2.342.250

 */
// data/mockData.ts
export const taxasIRT = [
  { faixa: '1º Escalão', minimo: 0, maximo: 150000, parcelaFixa: 0, taxa: 0, excesso: 0 },
  { faixa: '2º Escalão', minimo: 150001, maximo: 200000, parcelaFixa: 12500, taxa: 16, excesso: 150000 },
  { faixa: '3º Escalão', minimo: 200001, maximo: 300000, parcelaFixa: 31250, taxa: 18, excesso: 200000 },
  { faixa: '4º Escalão', minimo: 300001, maximo: 500000, parcelaFixa: 49250, taxa: 19, excesso: 300000 },
  { faixa: '5º Escalão', minimo: 500001, maximo: 1000000, parcelaFixa: 87250, taxa: 20, excesso: 500000 },
  { faixa: '6º Escalão', minimo: 1000001, maximo: 1500000, parcelaFixa: 187250, taxa: 21, excesso: 1000000 },
  { faixa: '7º Escalão', minimo: 1500001, maximo: 2000000, parcelaFixa: 292250, taxa: 22, excesso: 1500000 },
  { faixa: '8º Escalão', minimo: 2000001, maximo: 2500000, parcelaFixa: 402250, taxa: 23, excesso: 2000000 },
  { faixa: '9º Escalão', minimo: 2500001, maximo: 5000000, parcelaFixa: 517250, taxa: 24, excesso: 2500000 },
  { faixa: '10º Escalão', minimo: 5000001, maximo: 10000000, parcelaFixa: 1117250, taxa: 24.5, excesso: 5000000 },
  { faixa: '11º Escalão', minimo: 10000001, maximo: Infinity, parcelaFixa: 2342250, taxa: 25, excesso: 10000000 },
];