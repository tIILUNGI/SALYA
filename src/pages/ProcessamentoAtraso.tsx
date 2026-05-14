import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { api } from '../services/api';
import Swal from 'sweetalert2';

interface PendenciaSalario {
  colaboradorId: number;
  nome: string;
  mes: number;
  ano: number;
  salarioBase: number;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ProcessamentoAtraso: React.FC = () => {
  const { empresaId, colaboradores, empresa } = useContext(AppContext);
  const [pendencias, setPendencias] = useState<PendenciaSalario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAtrasos = async () => {
      if (!empresaId) return;
      setLoading(true);
      try {
        const historico = await api.get(`/processamentos/historico?empresaId=${empresaId}`);
        const processados = new Set(historico.map((h: any) => `${h.colaboradorId}-${h.ano}-${h.mes}`));
        
        const hoje = new Date();
        const lista: PendenciaSalario[] = [];

        colaboradores.forEach(c => {
          if (c.status !== 'Ativo') return;
          
          const admissao = c.dataAdmissao ? new Date(c.dataAdmissao) : new Date(2025, 0, 1);
          let checkDate = new Date(admissao.getFullYear(), admissao.getMonth(), 1);
          
          // Andar de mês em mês até o mês anterior ao actual
          const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

          while (checkDate <= mesAnterior) {
            const mes = checkDate.getMonth() + 1;
            const ano = checkDate.getFullYear();
            const key = `${c.id}-${ano}-${mes}`;
            
            if (!processados.has(key)) {
              lista.push({
                colaboradorId: c.id,
                nome: c.nome,
                mes,
                ano,
                salarioBase: c.salarioBase || 0
              });
            }
            
            checkDate.setMonth(checkDate.getMonth() + 1);
          }
        });

        setPendencias(lista.sort((a, b) => a.ano - b.ano || a.mes - b.mes));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAtrasos();
  }, [empresaId, colaboradores]);

  const handleProcessar = async (p: PendenciaSalario) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Liquidar Salário em Atraso',
      text: `Deseja processar e liquidar o salário de ${p.nome} referente a ${MONTHS[p.mes-1]}/${p.ano}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, Liquidar Agora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });

    if (isConfirmed) {
      Swal.fire({
        title: 'A Processar...',
        text: 'A gerar recibo e a persistir alterações.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      try {
        const colab = colaboradores.find(c => c.id === p.colaboradorId);
        if (!colab) throw new Error('Colaborador não encontrado');

        // Padrão de dias da empresa
        const isFixed = empresa?.tipoProcessamento === 'Dias Fixos' || empresa?.tipoProcessamento === 'DIAS_FIXOS';
        const baseDays = isFixed ? 22 : 22; // Simplificado para atraso

        const dto = {
          trabalhadorId: p.colaboradorId,
          mes: p.mes,
          ano: p.ano,
          salarioBaseOverride: colab.salarioBase || 0,
          diasTrabalhados: baseDays,
          diasUteis: baseDays,
          diasAlimentacao: 1,
          diasTransporte: 1,
          valorDiaAlimentacao: colab.subsidioAlimentacao || 0,
          valorDiaTransporte: colab.subsidioTransporte || 0,
          subsidioFeriasValor: 0,
          subsidioNatalValor: 0,
          outrosSubsidiosTotal: 0,
          horasExtraTotal: 0,
          bonusTotal: 0,
          faltasTotal: 0,
          outrosGanhos: [],
        };

        await api.post('/processamentos/processar-salario', dto);
        
        await Swal.fire({
          title: 'Liquidado!',
          text: `O salário de ${p.nome} (${MONTHS[p.mes-1]}/${p.ano}) foi processado e o recibo gerado com sucesso.`,
          icon: 'success',
          confirmButtonColor: '#10b981'
        });

        // Recarregar para atualizar a lista
        window.location.reload();
      } catch (error: any) {
        Swal.fire('Erro', error.message || 'Não foi possível liquidar o salário.', 'error');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Processamento em Atraso</h1>
        <p className="text-sm text-slate-500 mt-1">Regularize salários de meses anteriores que ainda não foram liquidados.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
        </div>
      ) : pendencias.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-emerald-500 mb-4">check_circle</span>
          <h2 className="text-xl font-bold text-slate-800">Tudo em dia!</h2>
          <p className="text-slate-500">Não existem processamentos pendentes de meses anteriores.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês Referência</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ano</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salário Base</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendencias.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">{p.nome.substring(0,2).toUpperCase()}</div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.nome}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest">
                      {MONTHS[p.mes-1]}
                    </span>
                  </td>
                  <td className="p-6 text-sm text-slate-600 dark:text-slate-400 font-mono">{p.ano}</td>
                  <td className="p-6 text-sm text-slate-600 dark:text-slate-400">
                    {p.salarioBase.toLocaleString('pt-AO')} Kz
                  </td>
                  <td className="p-6 text-right">
                    <button
                      onClick={() => handleProcessar(p)}
                      className="text-[10px] font-black bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      Liquidar Agora
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProcessamentoAtraso;
