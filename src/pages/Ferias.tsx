import React, { useState, useEffect, useContext, useCallback } from 'react';
import Swal from 'sweetalert2';
import { api } from '../services/api';
import { AppContext } from '../App';
import { Ferias } from '../types';

const statusBadge: Record<string, string> = {
  'Pendente': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'Aprovado': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Rejeitado': 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  'Gozado': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

const FeriasPage: React.FC = () => {
  const { colaboradores, empresaId } = useContext(AppContext);
  
  const [feriasList, setFeriasList] = useState<Ferias[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [colabId, setColabId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [anoReferencia, setAnoReferencia] = useState<number>(new Date().getFullYear());
  
  // Filter States
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [filtroColaborador, setFiltroColaborador] = useState<string>('Todos');

  // Calculates total calendar days between two dates inclusive
  const calculatedDays = useCallback((inicio: string, fim: string): number => {
    if (!inicio || !fim) return 0;
    const start = new Date(inicio);
    const end = new Date(fim);
    const diff = end.getTime() - start.getTime();
    if (diff < 0) return 0;
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
  }, []);

  const loadFerias = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const isApiBrokenKey = `salya_ferias_api_broken_${empresaId}`;
    const isApiBroken = localStorage.getItem(isApiBrokenKey) === 'true';

    if (isApiBroken) {
      const localData = localStorage.getItem(`salya_ferias_${empresaId}`);
      if (localData) {
        setFeriasList(JSON.parse(localData));
      } else {
        const activeColabs = colaboradores.filter(c => c.status === 'Ativo');
        const mock: Ferias[] = [];
        if (activeColabs.length > 0) {
          mock.push({
            id: 1,
            colaboradorId: activeColabs[0].id,
            colaborador: activeColabs[0].nome,
            inicio: new Date(new Date().getFullYear(), 11, 1).toISOString().split('T')[0],
            fim: new Date(new Date().getFullYear(), 11, 22).toISOString().split('T')[0],
            dias: 22,
            status: 'Aprovado',
            ano: new Date().getFullYear()
          });
        }
        if (activeColabs.length > 1) {
          mock.push({
            id: 2,
            colaboradorId: activeColabs[1].id,
            colaborador: activeColabs[1].nome,
            inicio: new Date().toISOString().split('T')[0],
            fim: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
            dias: 16,
            status: 'Pendente',
            ano: new Date().getFullYear()
          });
        }
        setFeriasList(mock);
        localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(mock));
      }
      setLoading(false);
      return;
    }

    try {
      const data = await api.get(`/ferias?empresaId=${empresaId}`);
      if (Array.isArray(data)) {
        setFeriasList(data);
      } else if (data && typeof data === 'object' && '_embedded' in data) {
        setFeriasList((data as any)._embedded?.ferias || []);
      } else {
        throw new Error('API format not recognized');
      }
    } catch (error) {
      console.warn('Backend /ferias indisponível ou erro na chamada. Utilizando fallback local.', error);
      localStorage.setItem(isApiBrokenKey, 'true');
      const localData = localStorage.getItem(`salya_ferias_${empresaId}`);
      if (localData) {
        setFeriasList(JSON.parse(localData));
      } else {
        const activeColabs = colaboradores.filter(c => c.status === 'Ativo');
        const mock: Ferias[] = [];
        if (activeColabs.length > 0) {
          mock.push({
            id: 1,
            colaboradorId: activeColabs[0].id,
            colaborador: activeColabs[0].nome,
            inicio: new Date(new Date().getFullYear(), 11, 1).toISOString().split('T')[0],
            fim: new Date(new Date().getFullYear(), 11, 22).toISOString().split('T')[0],
            dias: 22,
            status: 'Aprovado',
            ano: new Date().getFullYear()
          });
        }
        if (activeColabs.length > 1) {
          mock.push({
            id: 2,
            colaboradorId: activeColabs[1].id,
            colaborador: activeColabs[1].nome,
            inicio: new Date().toISOString().split('T')[0],
            fim: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
            dias: 16,
            status: 'Pendente',
            ano: new Date().getFullYear()
          });
        }
        setFeriasList(mock);
        localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(mock));
      }
    } finally {
      setLoading(false);
    }
  }, [empresaId, colaboradores]);

  useEffect(() => {
    loadFerias();
  }, [loadFerias]);

  const saveFeriasList = async (newList: Ferias[]) => {
    setFeriasList(newList);
    if (empresaId) {
      localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(newList));
    }
  };

  const handleCreateFerias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabId || !dataInicio || !dataFim) {
      Swal.fire('Erro', 'Por favor preencha todos os campos obrigatórios.', 'error');
      return;
    }

    const co = colaboradores.find(c => c.id === Number(colabId));
    if (!co) {
      Swal.fire('Erro', 'Colaborador não encontrado.', 'error');
      return;
    }

    const start = new Date(dataInicio);
    const end = new Date(dataFim);
    if (end < start) {
      Swal.fire('Erro', 'A data de fim não pode ser anterior à data de início.', 'error');
      return;
    }

    const totalDays = calculatedDays(dataInicio, dataFim);
    const payload = {
      colaboradorId: Number(colabId),
      colaborador: co.nome,
      inicio: dataInicio,
      fim: dataFim,
      dias: totalDays,
      status: 'Pendente' as const,
      ano: anoReferencia
    };

    const isApiBrokenKey = `salya_ferias_api_broken_${empresaId}`;
    const isApiBroken = localStorage.getItem(isApiBrokenKey) === 'true';

    if (isApiBroken) {
      const createdItem: Ferias = {
        id: Date.now(),
        ...payload
      };
      const updated = [createdItem, ...feriasList];
      await saveFeriasList(updated);
      Swal.fire('Sucesso', 'Férias agendadas localmente.', 'success');
      setShowAddModal(false);
      resetForm();
      return;
    }

    try {
      const data = await api.post(`/ferias?empresaId=${empresaId}`, payload);
      let createdItem: Ferias = { ...payload, status: 'Pendente', id: Date.now() };
      if (data && typeof data === 'object' && 'id' in data) {
        createdItem = data as Ferias;
      }
      const updated = [createdItem, ...feriasList];
      await saveFeriasList(updated);
      Swal.fire('Sucesso', 'Férias agendadas com estado Pendente.', 'success');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.warn('Post no backend falhou. Salvando localmente.', error);
      localStorage.setItem(isApiBrokenKey, 'true');
      const createdItem: Ferias = {
        id: Date.now(),
        ...payload
      };
      const updated = [createdItem, ...feriasList];
      await saveFeriasList(updated);
      Swal.fire('Sucesso', 'Férias agendadas localmente.', 'success');
      setShowAddModal(false);
      resetForm();
    }
  };

  const handleChangeStatus = async (id: number, newStatus: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Gozado') => {
    const item = feriasList.find(f => f.id === id);
    if (!item) return;

    const actionText = 
      newStatus === 'Aprovado' ? 'aprovar' :
      newStatus === 'Rejeitado' ? 'rejeitar' :
      newStatus === 'Gozado' ? 'marcar como gozado' : 'colocar em análise';

    const confirm = await Swal.fire({
      title: 'Alterar Estado',
      text: `Deseja realmente ${actionText} as férias de ${item.colaborador}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb'
    });

    if (!confirm.isConfirmed) return;

    const isApiBrokenKey = `salya_ferias_api_broken_${empresaId}`;
    const isApiBroken = localStorage.getItem(isApiBrokenKey) === 'true';

    if (isApiBroken) {
      const updated = feriasList.map(f => f.id === id ? { ...f, status: newStatus } : f);
      await saveFeriasList(updated);
      Swal.fire('Status Atualizado', `Estado atualizado localmente para ${newStatus}.`, 'success');
      return;
    }

    try {
      await api.put(`/ferias/${id}/status?empresaId=${empresaId}`, { status: newStatus });
      const updated = feriasList.map(f => f.id === id ? { ...f, status: newStatus } : f);
      await saveFeriasList(updated);
      Swal.fire('Status Atualizado', `Férias definidas como ${newStatus}.`, 'success');
    } catch (error) {
      console.warn('Erro ao atualizar status na API. Atualizando localmente.', error);
      localStorage.setItem(isApiBrokenKey, 'true');
      const updated = feriasList.map(f => f.id === id ? { ...f, status: newStatus } : f);
      await saveFeriasList(updated);
      Swal.fire('Status Atualizado', `Estado atualizado localmente para ${newStatus}.`, 'success');
    }
  };

  const handleDeleteFerias = async (id: number) => {
    const item = feriasList.find(f => f.id === id);
    if (!item) return;

    const confirm = await Swal.fire({
      title: 'Eliminar Férias',
      text: `Tem certeza que deseja apagar a marcação de férias de ${item.colaborador}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, Apagar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48'
    });

    if (!confirm.isConfirmed) return;

    const isApiBrokenKey = `salya_ferias_api_broken_${empresaId}`;
    const isApiBroken = localStorage.getItem(isApiBrokenKey) === 'true';

    if (isApiBroken) {
      const updated = feriasList.filter(f => f.id !== id);
      await saveFeriasList(updated);
      Swal.fire('Eliminado', 'Removido localmente do sistema.', 'success');
      return;
    }

    try {
      await api.delete(`/ferias/${id}?empresaId=${empresaId}`);
      const updated = feriasList.filter(f => f.id !== id);
      await saveFeriasList(updated);
      Swal.fire('Eliminado', 'Marcação de férias apagada do sistema.', 'success');
    } catch (error) {
      console.warn('Erro ao apagar férias do backend. Removendo localmente.', error);
      localStorage.setItem(isApiBrokenKey, 'true');
      const updated = feriasList.filter(f => f.id !== id);
      await saveFeriasList(updated);
      Swal.fire('Eliminado', 'Removido localmente do sistema.', 'success');
    }
  };

  const resetForm = () => {
    setColabId('');
    setDataInicio('');
    setDataFim('');
    setAnoReferencia(new Date().getFullYear());
  };

  // Stats
  const activeFeriasHoje = feriasList.filter(f => {
    if (f.status !== 'Aprovado' && f.status !== 'Gozado') return false;
    const hojeStr = new Date().toISOString().split('T')[0];
    return hojeStr >= f.inicio && hojeStr <= f.fim;
  }).length;

  const totalPendentes = feriasList.filter(f => f.status === 'Pendente').length;
  
  const diasGozadosAno = feriasList
    .filter(f => f.status === 'Gozado' && f.ano === new Date().getFullYear())
    .reduce((acc, curr) => acc + (curr.dias || 0), 0);

  // Filters
  const filteredList = feriasList.filter(f => {
    const matchStatus = filtroStatus === 'Todos' ? true : f.status === filtroStatus;
    const matchColab = filtroColaborador === 'Todos' ? true : f.colaboradorId === Number(filtroColaborador);
    return matchStatus && matchColab;
  });

  return (
    <div className="p-4 md:p-8 w-full max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gestão de Férias</h1>
          <p className="text-sm text-slate-500">Agende, acompanhe e controle os períodos de licença e descanso da sua equipa.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold shadow-soft hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">event_available</span>
          Marcar Férias
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Em Férias Hoje</p>
            <span className="material-symbols-outlined text-primary text-xl">flight_takeoff</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{activeFeriasHoje}</p>
          <p className="text-[10px] text-slate-400 mt-1">Colaboradores ausentes presentemente.</p>
        </div>
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-500 uppercase tracking-wider font-semibold">Pendentes de Aprovação</p>
            <span className="material-symbols-outlined text-amber-500 text-xl">pending_actions</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{totalPendentes}</p>
          <p className="text-[10px] text-slate-400 mt-1">Marcações a aguardar retorno da direção.</p>
        </div>
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Días Utilizados ({new Date().getFullYear()})</p>
            <span className="material-symbols-outlined text-blue-500 text-xl">date_range</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{diasGozadosAno} dias</p>
          <p className="text-[10px] text-slate-400 mt-1">Acumulado total de dias já gozados.</p>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="glass-card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colaborador</label>
            <select
              value={filtroColaborador}
              onChange={e => setFiltroColaborador(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold max-w-xs outline-none"
            >
              <option value="Todos">Todos os Colaboradores</option>
              {colaboradores.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-semibold max-w-xs outline-none"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Rejeitado">Rejeitados</option>
              <option value="Gozado">Gozados</option>
            </select>
          </div>
        </div>
        <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          {filteredList.length} registo(s) encontrado(s)
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-16 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-x-auto border border-slate-100 dark:border-slate-800">
          {filteredList.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 bg-slate-100 dark:bg-slate-850 p-4 rounded-full mb-4">work_off</span>
              <p className="font-semibold text-slate-700 dark:text-slate-200">Sem registos de férias</p>
              <p className="text-sm text-slate-400 mt-1">Utilize o botão do canto superior para marcar novas férias para a sua equipa.</p>
            </div>
          ) : (
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Colaborador</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Ano Ref.</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Inicio</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Fim</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase text-center whitespace-nowrap">Dias</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Estado</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase text-center whitespace-nowrap">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((ferias) => {
                  const days = calculatedDays(ferias.inicio, ferias.fim);
                  return (
                    <tr key={ferias.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all align-middle">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold text-center shrink-0">
                            {(ferias.colaborador || 'Colaborador').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-white capitalize">{ferias.colaborador}</p>
                            <p className="text-[10px] text-slate-450 uppercase font-medium">Ref. #{ferias.colaboradorId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-650 dark:text-slate-300">
                        {ferias.ano || new Date().getFullYear()}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {new Date(ferias.inicio).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {new Date(ferias.fim).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-white text-xs">
                        {days} dias
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge[ferias.status]}`}>
                          {ferias.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {ferias.status === 'Pendente' && (
                            <>
                              <button 
                                onClick={() => handleChangeStatus(ferias.id, 'Aprovado')}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold uppercase transition-all"
                                title="Aprovar Férias"
                              >
                                Aprovar
                              </button>
                              <button 
                                onClick={() => handleChangeStatus(ferias.id, 'Rejeitado')}
                                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold uppercase transition-all"
                                title="Rejeitar Férias"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {ferias.status === 'Aprovado' && (
                            <button 
                              onClick={() => handleChangeStatus(ferias.id, 'Gozado')}
                              className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-bold uppercase transition-all"
                              title="Marcar como Gozado"
                            >
                              Gozado
                            </button>
                          )}
                          {(ferias.status === 'Rejeitado' || ferias.status === 'Gozado') && (
                            <button 
                              onClick={() => handleChangeStatus(ferias.id, 'Pendente')}
                              className="px-2.5 py-1 bg-slate-500 hover:bg-slate-600 text-white rounded text-[10px] font-bold uppercase transition-all"
                              title="Colocar de volta em análise"
                            >
                              Reanalisar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFerias(ferias.id)}
                            className="size-7 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                            title="Eliminar marcação"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Marcar Novo Período</h3>
                <p className="text-xs text-slate-400 mt-0.5">Agende o descanso para um colaborador</p>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateFerias} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Colaborador *</label>
                <select
                  required
                  value={colabId}
                  onChange={e => setColabId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                >
                  <option value="">Selecione o colaborador...</option>
                  {colaboradores.filter(c => c.status === 'Ativo').map(c => (
                    <option key={c.id} value={c.id}>{c.nome} · {c.cargo || 'Sem Cargo'}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold">Data Início *</label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold">Data Fim *</label>
                  <input
                    type="date"
                    required
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
                </div>
              </div>

              {dataInicio && dataFim && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-slate-500">Dias Calculados:</span>
                  <span className="text-sm font-extrabold text-primary">{calculatedDays(dataInicio, dataFim)} dias</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold">Ano de Referência *</label>
                <input
                  type="number"
                  required
                  min="2020"
                  max="2100"
                  value={anoReferencia}
                  onChange={e => setAnoReferencia(Number(e.target.value) || new Date().getFullYear())}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg hover:bg-primary/95 transition-all mt-6"
              >
                Agendar Férias
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeriasPage;
