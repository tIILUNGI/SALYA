import React, { useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { AppContext } from '../App';
import Swal from 'sweetalert2';

interface AlertaItem {
  id: number;
  tipo: 'Contrato' | 'Documento' | 'Salário';
  mensagem: string;
  colaborador?: string;
  dataLimite?: string;
  severidade: 'Crítica' | 'Alta' | 'Média';
  status: 'Pendente' | 'Resolvido';
}

const severidadeBadge: Record<string, string> = {
  'Crítica': 'bg-red-100 text-red-600',
  'Alta': 'bg-amber-100 text-amber-600',
  'Média': 'bg-blue-100 text-blue-600',
};

const Alertas: React.FC = () => {
  const { colaboradores, empresaId } = useContext(AppContext);

  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [activeTab, setActiveTab] = useState<'Pendente' | 'Resolvido'>('Pendente');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buildAlertas = async () => {
      setLoading(true);
      const lista: AlertaItem[] = [];
      let idCounter = 1;
      const hoje = new Date();
      const limite30 = new Date(hoje);
      limite30.setDate(hoje.getDate() + 30);

      // Alertas de contratos a expirar (baseado nos colaboradores carregados no contexto)
      colaboradores.forEach(c => {
        if (c.fimContrato) {
          const fim = new Date(c.fimContrato);
          if (fim >= hoje && fim <= limite30) {
            const diasRestantes = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
            lista.push({
              id: idCounter++,
              tipo: 'Contrato',
              mensagem: `Contrato expira em ${diasRestantes} dia(s)`,
              colaborador: c.nome,
              dataLimite: c.fimContrato,
              severidade: diasRestantes <= 7 ? 'Crítica' : 'Alta',
              status: 'Pendente',
            });
          } else if (fim < hoje) {
            lista.push({
              id: idCounter++,
              tipo: 'Contrato',
              mensagem: 'Contrato expirado',
              colaborador: c.nome,
              dataLimite: c.fimContrato,
              severidade: 'Crítica',
              status: 'Pendente',
            });
          }
        }
      });

      // Alertas de documentos via API
      try {
        if (empresaId) {
          const resumo = await api.get(`/alertas/resumo?empresaId=${empresaId}`);
          
          if (resumo.documentosExpirando > 0) {
            lista.push({
              id: idCounter++,
              tipo: 'Documento',
              mensagem: `${resumo.documentosExpirando} documento(s) com validade a expirar nos próximos 30 dias`,
              severidade: 'Alta',
              status: 'Pendente',
            });
          }
          if (resumo.salariosPendentes > 0) {
            lista.push({
              id: idCounter++,
              tipo: 'Salário',
              mensagem: `${resumo.salariosPendentes} processamento(s) salarial(ais) pendente(s) este mês`,
              severidade: 'Média',
              status: 'Pendente',
            });
          }
        }
      } catch (error) { 
        console.error("Erro ao carregar dados do alerta", error);
      }

      setAlertas(lista);
      setLoading(false);
    };

    buildAlertas();
  }, [colaboradores, empresaId]);


  const handleResolver = (id: number) => {
    Swal.fire({
      title: 'Resolver Alerta',
      text: 'Tem a certeza que deseja marcar este alerta como resolvido?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, resolver',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#64748b',
    }).then((result) => {
      if (result.isConfirmed) {
        setAlertas(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolvido' } : a));
        Swal.fire({
          title: 'Resolvido',
          text: 'Alerta marcado como resolvido!',
          icon: 'success',
          confirmButtonColor: '#22c55e',
        });
      }
    });
  };

  const filtered = alertas.filter(a => a.status === activeTab);

  return (
    <div className="p-8 animate-in fade-in slide-up">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Centro de Alertas</h1>
          <p className="text-sm text-slate-500 mt-1">Compliance automático: contratos, documentos e salários.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-5 py-3 rounded-xl">
          <span className="material-symbols-outlined text-sm">notifications_active</span>
          <span className="text-xs font-black uppercase tracking-widest">{alertas.filter(a => a.status === 'Pendente').length} pendentes</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card mb-6 p-2 flex gap-2 w-max">
        <button
          onClick={() => setActiveTab('Pendente')}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'Pendente' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Pendentes ({alertas.filter(a => a.status === 'Pendente').length})
        </button>
        <button
          onClick={() => setActiveTab('Resolvido')}
          className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'Resolvido' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Resolvidos ({alertas.filter(a => a.status === 'Resolvido').length})
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-16 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severidade</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Limite</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-200 block mb-3">check_circle</span>
                    <p className="text-slate-400 text-sm font-bold">Nenhum alerta nesta categoria.</p>
                  </td>
                </tr>
              ) : filtered.map(alerta => (
                <tr key={alerta.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${severidadeBadge[alerta.severidade] || 'bg-slate-100 text-slate-500'}`}>
                      {alerta.severidade}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      alerta.tipo === 'Contrato' ? 'bg-purple-50 text-purple-600' :
                      alerta.tipo === 'Documento' ? 'bg-blue-50 text-blue-600' :
                      'bg-indigo-50 text-indigo-600'
                    }`}>{alerta.tipo}</span>
                  </td>
                  <td className="p-6 text-sm font-bold text-slate-700 dark:text-slate-300">{alerta.colaborador || '—'}</td>
                  <td className="p-6 text-sm text-slate-600 dark:text-slate-400">{alerta.mensagem}</td>
                  <td className="p-6 text-xs text-slate-500">
                    {alerta.dataLimite ? new Date(alerta.dataLimite).toLocaleDateString('pt-AO') : '—'}
                  </td>
                  <td className="p-6 text-right">
                    {alerta.status === 'Pendente' && (
                      <button
                        onClick={() => handleResolver(alerta.id)}
                        className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest"
                      >
                        Resolver
                      </button>
                    )}
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

export default Alertas;
