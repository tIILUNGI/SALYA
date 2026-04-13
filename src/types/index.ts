export interface User {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface Empresa {
  id: number;
  nome: string;
  nif: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  municipio?: string;
  provincia?: string;
  categoria?: string;  
  banco?: string;      
  iban?: string;       
  taxaINSS?: number;   
  taxaINSSPatronal?: number; 
  taxaAGT?: number;    
  regimeFiscal?: string;
  tipoEntidade?: string;
  processamentoAutomatico?: boolean;
  envioAutomaticoContracheques?: boolean;
  diaProcessamento?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Colaborador {
  id: number;
  numeroColaborador?: string;
  nome: string;
  nif: string;
  bi?: string;
  cargo: string;
  salarioBase: number;
  status: 'Ativo' | 'Afastado' | 'Desligado';
  email: string;
  telefone?: string;
  iban?: string;
  banco?: string;
  inss?: string;
  dataAdmissao?: string;
  fimContrato?: string;
  departamento?: string;
  tipoContrato?: 'Efectivo' | 'Prestador' | 'Estagiário' | 'Contrato por Tempo Indeterminado' | 'Contrato a Termo Certo' | 'Contrato a Termo Incerto' | 'Contrato de Trabalho Eventual';
  genero?: 'Masculino' | 'Feminino';
  endereco?: string;
  municipio?: string;
  provincia?: string;
  empresaId?: number;
}

export interface Ferias {
  id: number;
  colaboradorId: number;
  colaborador: string;
  inicio: string;
  fim: string;
  dias: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Gozado';
  ano?: number;
}

export interface FaltaBonus {
  id: number;
  colaboradorId: number;
  colaborador: string;
  tipo: 'Hora Extra' | 'Bónus' | 'Falta' | 'Adiantamento';
  valor: number;
  descricao?: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  data?: string;
}

export interface Fatura {
  id: number;
  numero: string;
  cliente: string;
  valor: number;
  data: string;
  status: 'Pendente' | 'Emitida' | 'Cancelada' | 'Paga';
 iva?: number;
  retencao?: number;
}

export interface Guia {
  id: number;
  tipo: 'INSS' | 'IRT' | 'AGT';
  descricao: string;
  periodo: string;
  valor: number;
  status: 'Pendente' | 'Pago';
  dataPagamento?: string;
  referencia?: string;
}

export interface Auditoria {
  id: number;
  data: string;
  usuario: string;
  acao: string;
  modulo: string;
  status: 'Sucesso' | 'Erro' | 'Alerta';
  detalhes?: string;
}

export interface TransacaoMulticaixa {
  id: number;
  referencia: string;
  valor: number;
  data: string;
  status: 'Pendente' | 'Processado' | 'Erro';
  descricao?: string;
}

export interface Processamento {
  id: number;
  mes: string;
  ano: number;
  colaboradores: number;
  valorTotal: number;
  status: 'Pendente' | 'Processando' | 'Concluído' | 'Erro';
  data: string;
}

export interface ConfiguracaoEmpresa {
  id?: number;
  nome: string;
  nif: string;
  endereco?: string;
  municipio?: string;
  provincia?: string;
  telefone?: string;
  email?: string;
  banco?: string;
  iban?: string;
  taxaINSS?: number;
  taxaINSSPatronal?: number;
  taxaAGT?: number;
  processamentoAutomatico?: boolean;
  envioAutomaticoContracheques?: boolean;
  diaProcessamento?: number;
  regimeFiscal?: string;
  tipoEntidade?: string;
  categoria?: 'Empresa' | 'Particular';
}

export interface TaxaIRT {
  id: number;
  faixa: string;
  minimo: number;
  maximo: number;
  taxa: number;
  parcelaAbt: number;
}

export interface TaxaINSS {
  id: number;
  tipo: string;
  taxa: number;
  descricao: string;
}
