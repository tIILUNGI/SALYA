import { Colaborador, Ferias, FaltaBonus, Fatura, Guia, Auditoria, TransacaoMulticaixa, Processamento } from '../types';

export const colaboradores: Colaborador[] = [
  { id: 1, nome: 'Ana Silva', nif: '5000123456', cargo: 'Gerente de RH', salarioBase: 850000, status: 'Ativo', email: 'ana.silva@salya.com', telefone: '+244 923 456 789', iban: 'AO06 0046 0000 11111111111 23', banco: 'BAI', inss: '1002003004', dataAdmissao: '15/01/2020', departamento: 'Recursos Humanos', tipoContrato: 'Contrato por Tempo Indeterminado', genero: 'Feminino', municipio: 'Luanda', provincia: 'Luanda' },
  { id: 2, nome: 'João Pereira', nif: '5000987654', cargo: 'Dev Senior', salarioBase: 720000, status: 'Ativo', email: 'joao.p@salya.com', telefone: '+244 923 456 790', iban: 'AO06 0046 0000 22222222222 23', banco: 'Standard Bank', inss: '1002003005', dataAdmissao: '20/03/2021', departamento: 'Tecnologia', tipoContrato: 'Contrato por Tempo Indeterminado', genero: 'Masculino', municipio: 'Luanda', provincia: 'Luanda' },
  { id: 3, nome: 'Maria Santos', nif: '5000456789', cargo: 'Analista Financeiro', salarioBase: 620000, status: 'Afastado', email: 'm.santos@salya.com', iban: 'AO06 0046 0000 33333333333 23', banco: 'BIC', inss: '1002003006', dataAdmissao: '10/06/2019', departamento: 'Financeiro', tipoContrato: 'Contrato por Tempo Indeterminado', genero: 'Feminino', municipio: 'Luanda', provincia: 'Luanda' },
  { id: 4, nome: 'Ricardo Lima', nif: '5000321654', cargo: 'Designer UI/UX', salarioBase: 480000, status: 'Ativo', email: 'ricardo.l@salya.com', iban: 'AO06 0046 0000 44444444444 23', banco: 'BAI', inss: '1002003007', dataAdmissao: '05/09/2022', departamento: 'Marketing', tipoContrato: 'Contrato por Tempo Indeterminado', genero: 'Masculino', municipio: 'Luanda', provincia: 'Luanda' },
  { id: 5, nome: 'Carla Oliveira', nif: '5000741852', cargo: 'Diretora de Arte', salarioBase: 950000, status: 'Desligado', email: 'c.oliveira@salya.com', iban: 'AO06 0046 0000 55555555555 23', banco: 'BFA', inss: '1002003008', dataAdmissao: '01/02/2018', departamento: 'Marketing', tipoContrato: 'Contrato por Tempo Indeterminado', genero: 'Feminino', municipio: 'Luanda', provincia: 'Luanda' },
  { id: 6, nome: 'Pedro António', nif: '5000555777', cargo: 'Contabilista', salarioBase: 580000, status: 'Ativo', email: 'pedro.a@salya.com', iban: 'AO06 0046 0000 66666666666 23', banco: 'Standard Bank', inss: '1002003009', dataAdmissao: '15/07/2020', departamento: 'Financeiro', tipoContrato: 'Contrato por Tempo Indeterminado', genero: 'Masculino', municipio: 'Luanda', provincia: 'Luanda' },
];

export const ferias: Ferias[] = [
  { id: 1, colaboradorId: 1, colaborador: 'Ana Silva', inicio: '15/04/2026', fim: '25/04/2026', dias: 10, status: 'Aprovado', ano: 2026 },
  { id: 2, colaboradorId: 2, colaborador: 'João Pereira', inicio: '01/05/2026', fim: '10/05/2026', dias: 10, status: 'Pendente', ano: 2026 },
  { id: 3, colaboradorId: 3, colaborador: 'Maria Santos', inicio: '20/03/2026', fim: '30/03/2026', dias: 10, status: 'Gozado', ano: 2026 },
  { id: 4, colaboradorId: 4, colaborador: 'Ricardo Lima', inicio: '10/06/2026', fim: '20/06/2026', dias: 10, status: 'Pendente', ano: 2026 },
  { id: 5, colaboradorId: 6, colaborador: 'Pedro António', inicio: '01/07/2026', fim: '15/07/2026', dias: 14, status: 'Aprovado', ano: 2026 },
];

export const faltaBonus: FaltaBonus[] = [
  { id: 1, colaboradorId: 1, colaborador: 'Ana Silva', tipo: 'Hora Extra', valor: 8, descricao: 'Horas extras projeto redesign', status: 'Aprovado', data: '05/03/2026' },
  { id: 2, colaboradorId: 2, colaborador: 'João Pereira', tipo: 'Bónus', valor: 50000, descricao: 'Bónus de produtividade', status: 'Pendente', data: '08/03/2026' },
  { id: 3, colaboradorId: 4, colaborador: 'Ricardo Lima', tipo: 'Falta', valor: 1, descricao: 'Falta justificada', status: 'Aprovado', data: '07/03/2026' },
  { id: 4, colaboradorId: 6, colaborador: 'Pedro António', tipo: 'Adiantamento', valor: 100000, descricao: 'Adiantamento salarial', status: 'Pendente', data: '09/03/2026' },
];

export const faturas: Fatura[] = [
  { id: 1, numero: 'FE 2026/001', cliente: 'Empresa X, Lda', valor: 250000, data: '05/03/2026', status: 'Emitida', iva: 35000, retencao: 16250 },
  { id: 2, numero: 'FE 2026/002', cliente: 'Empresa Y, Lda', valor: 180000, data: '06/03/2026', status: 'Pendente', iva: 25200, retencao: 11700 },
  { id: 3, numero: 'FE 2026/003', cliente: 'Empresa Z, Lda', valor: 320000, data: '07/03/2026', status: 'Emitida', iva: 44800, retencao: 20800 },
  { id: 4, numero: 'FE 2026/004', cliente: 'Empresa W, Lda', valor: 95000, data: '08/03/2026', status: 'Pendente', iva: 13300, retencao: 6175 },
];

export const guias: Guia[] = [
  { id: 1, tipo: 'INSS', descricao: 'INSS Patronal', periodo: 'Março/2026', valor: 382500, status: 'Pendente', referencia: 'INSS/2026/03/001' },
  { id: 2, tipo: 'IRT', descricao: 'Imposto sobre Rendimento do Trabalho', periodo: 'Março/2026', valor: 425000, status: 'Pendente', referencia: 'IRT/2026/03/001' },
  { id: 3, tipo: 'AGT', descricao: 'Administração Geral Tributária', periodo: 'Março/2026', valor: 85000, status: 'Pago', dataPagamento: '10/03/2026', referencia: 'AGT/2026/03/001' },
];

export const auditoria: Auditoria[] = [
  { id: 1, data: '10/03/2026 14:30', usuario: 'Admin Salya', acao: 'Login no sistema', modulo: 'Autenticação', status: 'Sucesso', detalhes: 'Acesso realizado com sucesso' },
  { id: 2, data: '10/03/2026 14:35', usuario: 'Admin Salya', acao: 'Processamento de salário', modulo: 'Folha', status: 'Sucesso', detalhes: 'Processamento do mês de Março/2026 concluído' },
  { id: 3, data: '2026 1410/03/:40', usuario: 'Admin Salya', acao: 'Exportação CNAB', modulo: 'Bancário', status: 'Sucesso', detalhes: 'Arquivo CNAB 240 gerado para BAI' },
  { id: 4, data: '10/03/2026 15:00', usuario: 'Ana Silva', acao: 'Consulta contracheque', modulo: 'Funcionários', status: 'Sucesso', detalhes: 'Consulta ao holerite de Fevereiro/2026' },
  { id: 5, data: '10/03/2026 15:15', usuario: 'Admin Salya', acao: 'Alteração de dados', modulo: 'Configurações', status: 'Alerta', detalhes: 'Alteração de taxa de IRS' },
];

export const transacoesMulticaixa: TransacaoMulticaixa[] = [
  { id: 1, referencia: '902 345 001', valor: 680000, data: '10/03/2026', status: 'Processado', descricao: 'Pagamento FE 2026/001' },
  { id: 2, referencia: '902 345 002', valor: 576000, data: '10/03/2026', status: 'Processado', descricao: 'Pagamento FE 2026/002' },
  { id: 3, referencia: '902 345 003', valor: 384000, data: '10/03/2026', status: 'Pendente', descricao: 'Pagamento FE 2026/003' },
  { id: 4, referencia: '902 345 004', valor: 464000, data: '10/03/2026', status: 'Pendente', descricao: 'Pagamento FE 2026/004' },
];

export const processamentos: Processamento[] = [
  { id: 1, mes: 'Março', ano: 2026, colaboradores: 42, valorTotal: 4250000, status: 'Concluído', data: '05/03/2026' },
  { id: 2, mes: 'Fevereiro', ano: 2026, colaboradores: 40, valorTotal: 4180000, status: 'Concluído', data: '05/02/2026' },
  { id: 3, mes: 'Janeiro', ano: 2026, colaboradores: 38, valorTotal: 4050000, status: 'Concluído', data: '05/01/2026' },
  { id: 4, mes: 'Dezembro', ano: 2025, colaboradores: 38, valorTotal: 4050000, status: 'Concluído', data: '05/12/2025' },
];

export const configuracaoEmpresa = {
  nome: 'SALYA Technologies, Lda',
  nif: '500012345678',
  endereco: 'Rua do Kwanzan, Edifício Kilamba, Luanda',
  municipio: 'Luanda',
  provincia: 'Luanda',
  telefone: '+244 222 000 000',
  email: 'financeiro@salya.com',
  banco: 'Banco Angolano de Investimento (BAI)',
  iban: 'AO06 0046 0000 00000000001 23',
  taxaINSS: 3,
  taxaINSSPatronal: 8,
  taxaAGT: 2,
  processamentoAutomatico: true,
  envioAutomaticoContracheques: true,
  diaProcessamento: 5,
  regimeFiscal: 'Geral',
  tipoEntidade: 'Lda',
};

export const taxasIRT = [
  { id: 1, faixa: '1º Escalão', minimo: 0, maximo: 150000, taxa: 0, parcelaAbt: 0 },
  { id: 2, faixa: '2º Escalão', minimo: 150000, maximo: 200000, taxa: 16, parcelaAbt: 12500 },
  { id: 3, faixa: '3º Escalão', minimo: 200000, maximo: 300000, taxa: 18, parcelaAbt: 31250 },
  { id: 4, faixa: '4º Escalão', minimo: 300000, maximo: 500000, taxa: 19, parcelaAbt: 49250 },
  { id: 5, faixa: '5º Escalão', minimo: 500000, maximo: 1000000, taxa: 20, parcelaAbt: 87250 },
  { id: 6, faixa: '6º Escalão', minimo: 1000000, maximo: 1500000, taxa: 21, parcelaAbt: 187250 },
  { id: 7, faixa: '7º Escalão', minimo: 1500000, maximo: 2000000, taxa: 22, parcelaAbt: 292250 },
  { id: 8, faixa: '8º Escalão', minimo: 2000000, maximo: 2500000, taxa: 23, parcelaAbt: 402250 },
  { id: 9, faixa: '9º Escalão', minimo: 2500000, maximo: 5000000, taxa: 24, parcelaAbt: 517250 },
  { id: 10, faixa: '10º Escalão', minimo: 5000000, maximo: 10000000, taxa: 24.5, parcelaAbt: 1117250 },
  { id: 11, faixa: '11º Escalão', minimo: 10000000, maximo: 999999999999, taxa: 25, parcelaAbt: 2342250 },
];
