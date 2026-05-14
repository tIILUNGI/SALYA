import React, { useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { AppContext } from '../App';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

interface AlertaItem {
  id: number;
  tipo: 'Contrato' | 'Documento';
  mensagem: string;
  colaborador?: string;
  colaboradorId?: number;
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
  const navigate = useNavigate();
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
              colaboradorId: c.id,
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
              colaboradorId: c.id,
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
         }
       } catch (error) { 
       }

      setAlertas(lista);
      setLoading(false);
    };

    buildAlertas();
  }, [colaboradores, empresaId]);


  const handleResolver = async (alerta: AlertaItem) => {
    if (alerta.tipo === 'Contrato') {
      const { value: action } = await Swal.fire({
        title: 'Resolver Contrato',
        text: `Como deseja resolver o contrato de ${alerta.colaborador}?`,
        icon: 'info',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Renovar Contrato',
        denyButtonText: 'Rescindir Contrato',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#22c55e',
        denyButtonColor: '#ef4444',
      });

      if (action === true) { // Renovar
        const { value: novaData } = await Swal.fire({
          title: 'Renovar Contrato',
          input: 'date',
          inputLabel: 'Nova data de fim de contrato',
          inputValue: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          showCancelButton: true,
          confirmButtonText: 'Confirmar Renovação',
          confirmButtonColor: '#22c55e',
        });

        if (novaData) {
          try {
            await api.post(`/trabalhadores/${alerta.colaboradorId}/renovar-contrato?empresaId=${empresaId}`, { novoFimContrato: novaData });
            setAlertas(prev => prev.map(a => a.id === alerta.id ? { ...a, status: 'Resolvido' } : a));
            Swal.fire('Sucesso', 'Contrato renovado com sucesso!', 'success');
          } catch (error: any) {
            Swal.fire('Erro', error.message || 'Não foi possível renovar o contrato.', 'error');
          }
        }
      } else if (action === false) { // Rescindir (deny button)
        const result = await Swal.fire({
          title: 'Rescindir Contrato',
          text: `Tem a certeza que deseja rescindir o contrato de ${alerta.colaborador}? Esta acção é irreversível.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sim, Rescindir',
          confirmButtonColor: '#ef4444',
          cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
          try {
            await api.post(`/trabalhadores/${alerta.colaboradorId}/rescindir-contrato?empresaId=${empresaId}`, {});
            setAlertas(prev => prev.map(a => a.id === alerta.id ? { ...a, status: 'Resolvido' } : a));
            Swal.fire('Rescindido', 'O contrato foi rescindido.', 'success');
          } catch (error) {
            Swal.fire('Erro', 'Não foi possível rescindir o contrato.', 'error');
          }
        }
      }
    } else if (alerta.tipo === 'Salário') {
      Swal.fire({
        title: 'Processamento Pendente',
        text: 'Deseja ir para a página de salários em atraso para liquidar as pendências?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ir para Salários em Atraso',
        confirmButtonColor: '#6366f1',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/processamento-atraso');
        }
      });
    } else {
      // Documento ou genérico
      Swal.fire({
        title: 'Marcar como Resolvido',
        text: 'Deseja marcar este alerta como resolvido manualmente?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim, resolver',
        confirmButtonColor: '#22c55e',
      }).then((result) => {
        if (result.isConfirmed) {
          setAlertas(prev => prev.map(a => a.id === alerta.id ? { ...a, status: 'Resolvido' } : a));
          Swal.fire('Resolvido', 'Alerta marcado como resolvido!', 'success');
        }
      });
    }
  };

  const filtered = alertas.filter(a => a.status === activeTab);

  return (
    <div className="p-8">
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
        </div>
      )}
    </div>
  );
};
    </div>
  );
};

export default Alertas;
