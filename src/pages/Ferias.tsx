import React, { useState, useEffect, useContext, useCallback } from 'react';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';
import { api } from '../services/api';
import { AppContext } from '../App';
import { Ferias } from '../types';

const statusBadge: Record<string, string> = {
  'Pendente': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
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

  const DIAS_FERIAS_ANUAIS = 22;

  const diasUsadosPorColaborador = useCallback((colaboradorId: number, ano: number) => {
    return feriasList
      .filter((f) => f.colaboradorId === colaboradorId && f.ano === ano && (f.status === 'Aprovado' || f.status === 'Gozado'))
      .reduce((acc, f) => acc + (f.dias || calculatedDays(f.inicio, f.fim)), 0);
  }, [feriasList, calculatedDays]);

  const diasDisponiveis = useCallback((colaboradorId: number, ano: number) => {
    return Math.max(0, DIAS_FERIAS_ANUAIS - diasUsadosPorColaborador(colaboradorId, ano));
  }, [diasUsadosPorColaborador]);

  const hasOverlap = useCallback((colaboradorId: number, inicio: string, fim: string, excludeId?: number) => {
    const start = new Date(inicio);
    const end = new Date(fim);
    return feriasList.some((f) => {
      if (f.colaboradorId !== colaboradorId) return false;
      if (excludeId && f.id === excludeId) return false;
      if (f.status === 'Rejeitado') return false;
      const fStart = new Date(f.inicio);
      const fEnd = new Date(f.fim);
      return start <= fEnd && end >= fStart;
    });
  }, [feriasList]);

  const hasDepartmentOverlap = useCallback((colaboradorId: number, inicio: string, fim: string) => {
    const colab = colaboradores.find((c) => c.id === colaboradorId);
    const dept = colab?.departamento;
    if (!dept) return { overlap: false, colleague: '' };

    const start = new Date(inicio);
    const end = new Date(fim);
    const conflict = feriasList.find((f) => {
      if (f.colaboradorId === colaboradorId || f.status === 'Rejeitado') return false;
      const other = colaboradores.find((c) => c.id === f.colaboradorId);
      if (!other || other.departamento !== dept) return false;
      const fStart = new Date(f.inicio);
      const fEnd = new Date(f.fim);
      return start <= fEnd && end >= fStart;
    });

    return conflict
      ? { overlap: true, colleague: conflict.colaborador || 'outro colaborador', dept }
      : { overlap: false, colleague: '', dept };
  }, [feriasList, colaboradores]);

  const getEffectiveStatus = useCallback((ferias: Ferias): Ferias['status'] => {
    if (ferias.status !== 'Aprovado') return ferias.status;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fim = new Date(ferias.fim);
    fim.setHours(0, 0, 0, 0);
    if (fim < hoje) return 'Gozado';
    return ferias.status;
  }, []);

  const autoMarkGozado = useCallback((list: Ferias[]): Ferias[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return list.map((f) => {
      if (f.status !== 'Aprovado') return f;
      const fim = new Date(f.fim);
      fim.setHours(0, 0, 0, 0);
      if (fim < hoje) return { ...f, status: 'Gozado' as const };
      return f;
    });
  }, []);

  const loadFerias = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const isApiBrokenKey = `salya_ferias_api_broken_${empresaId}`;
    const isApiBroken = localStorage.getItem(isApiBrokenKey) === 'true';

    if (isApiBroken) {
      const localData = localStorage.getItem(`salya_ferias_${empresaId}`);
      if (localData) {
        const parsed = autoMarkGozado(JSON.parse(localData));
        setFeriasList(parsed);
        if (empresaId) localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(parsed));
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
        setFeriasList(autoMarkGozado(mock));
        localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(autoMarkGozado(mock)));
      }
      setLoading(false);
      return;
    }

    try {
      const data = await api.get(`/ferias?empresaId=${empresaId}`);
      if (Array.isArray(data)) {
        const normalized = autoMarkGozado(data);
        setFeriasList(normalized);
        if (empresaId) localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(normalized));
      } else if (data && typeof data === 'object' && '_embedded' in data) {
        const normalized = autoMarkGozado((data as any)._embedded?.ferias || []);
        setFeriasList(normalized);
        if (empresaId) localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(normalized));
      } else {
        throw new Error('API format not recognized');
      }
    } catch (error) {
      console.warn('Backend /ferias indisponível ou erro na chamada. Utilizando fallback local.', error);
      localStorage.setItem(isApiBrokenKey, 'true');
      const localData = localStorage.getItem(`salya_ferias_${empresaId}`);
      if (localData) {
        const parsed = autoMarkGozado(JSON.parse(localData));
        setFeriasList(parsed);
        if (empresaId) localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(parsed));
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
        setFeriasList(autoMarkGozado(mock));
        localStorage.setItem(`salya_ferias_${empresaId}`, JSON.stringify(autoMarkGozado(mock)));
      }
    } finally {
      setLoading(false);
    }
  }, [empresaId, colaboradores, autoMarkGozado]);

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

    if (hasOverlap(Number(colabId), dataInicio, dataFim)) {
      Swal.fire('Conflito de Período', 'Já existe um período de férias registado que se sobrepõe a estas datas para este colaborador.', 'error');
      return;
    }

    const deptConflict = hasDepartmentOverlap(Number(colabId), dataInicio, dataFim);
    if (deptConflict.overlap) {
      Swal.fire(
        'Conflito no Departamento',
        `O departamento "${deptConflict.dept}" já tem férias de ${deptConflict.colleague} neste período. Ajuste as datas para evitar sobreposição.`,
        'warning'
      );
      return;
    }

    if (totalDays > diasDisponiveis(Number(colabId), anoReferencia)) {
      Swal.fire('Limite Excedido', `Este colaborador só tem ${diasDisponiveis(Number(colabId), anoReferencia)} dia(s) disponível(is) em ${anoReferencia}.`, 'error');
      return;
    }

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

  const totalDiasDisponiveisEquipa = colaboradores
    .filter(c => c.status === 'Ativo')
    .reduce((acc, c) => acc + diasDisponiveis(c.id, new Date().getFullYear()), 0);

  const handleGerarMapaAGT = () => {
    const ano = new Date().getFullYear();
    const aprovadas = feriasList.filter(f => f.status === 'Aprovado' || f.status === 'Gozado');
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b;">
        <h1 style="font-size: 18px; margin: 0 0 4px;">MAPA DE FÉRIAS — CONFORME AGT</h1>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 20px;">Ano de referência: ${ano} · Gerado por SALYA em ${new Date().toLocaleDateString('pt-AO')}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Colaborador</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Início</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Fim</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">Dias</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${aprovadas.length === 0 ? '<tr><td colspan="5" style="border:1px solid #e2e8f0;padding:12px;text-align:center;color:#94a3b8;">Sem períodos aprovados</td></tr>' :
              aprovadas.map(f => `<tr>
                <td style="border:1px solid #e2e8f0;padding:8px;">${f.colaborador}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;">${new Date(f.inicio).toLocaleDateString('pt-AO')}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;">${new Date(f.fim).toLocaleDateString('pt-AO')}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;text-align:center;">${f.dias}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;text-align:center;">${f.status}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size: 9px; color: #94a3b8; margin-top: 16px; text-align: center;">Documento gerado automaticamente — Lei n.º 14/25 & AGT</p>
      </div>
    `;
    (html2pdf() as any).from(el).set({
      margin: 10,
      filename: `mapa-ferias-agt-${ano}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).save();
  };

  // Filters
  const filteredList = feriasList.filter(f => {
    const effective = getEffectiveStatus(f);
    const matchStatus = filtroStatus === 'Todos' ? true : effective === filtroStatus;
    const matchColab = filtroColaborador === 'Todos' ? true : f.colaboradorId === Number(filtroColaborador);
    return matchStatus && matchColab;
  });

  return (
    <div className="p-4 md:p-8 w-full max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Gestão de Férias</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleGerarMapaAGT}
            className="bg-white dark:bg-slate-900 border border-primary/30 text-primary hover:bg-primary/5 px-5 py-2.5 rounded-xl font-semibold shadow-soft transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Gerar Mapa de Férias AGT
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold shadow-soft hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">event_available</span>
            Marcar Férias
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pendentes de Aprovação</p>
            <span className="material-symbols-outlined text-slate-400 text-xl">pending_actions</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{totalPendentes}</p>
          <p className="text-[10px] text-slate-400 mt-1">Marcações a aguardar retorno da direção.</p>
        </div>
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Dias Utilizados ({new Date().getFullYear()})</p>
            <span className="material-symbols-outlined text-blue-500 text-xl">date_range</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{diasGozadosAno} dias</p>
          <p className="text-[10px] text-slate-400 mt-1">Acumulado total de dias já gozados.</p>
        </div>
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-500 uppercase tracking-wider font-semibold">Dias Disponíveis (Equipa)</p>
            <span className="material-symbols-outlined text-emerald-500 text-xl">beach_access</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{totalDiasDisponiveisEquipa} dias</p>
          <p className="text-[10px] text-slate-400 mt-1">Saldo restante ({DIAS_FERIAS_ANUAIS} dias/ano por colaborador).</p>
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
                  const effectiveStatus = getEffectiveStatus(ferias);
                  const anoRef = ferias.ano || new Date().getFullYear();
                  const gozou = diasUsadosPorColaborador(ferias.colaboradorId, anoRef);
                  const disponivel = diasDisponiveis(ferias.colaboradorId, anoRef);
                  return (
                    <tr key={ferias.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all align-middle group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center text-xs font-bold text-center shrink-0 shadow-sm">
                            {(ferias.colaborador || 'Colaborador').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-white capitalize">{ferias.colaborador}</p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                              Gozou {gozou} / Disp. {disponivel} dias
                            </p>
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
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBadge[effectiveStatus]}`}>
                          {effectiveStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {ferias.status === 'Pendente' && (
                            <>
                              <button 
                                onClick={() => handleChangeStatus(ferias.id, 'Aprovado')}
                                className="px-2 py-1 border border-emerald-500 text-emerald-600 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                                title="Aprovar Férias"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                                Aprovar
                              </button>
                              <button 
                                onClick={() => handleChangeStatus(ferias.id, 'Rejeitado')}
                                className="px-2 py-1 border border-rose-500 text-rose-600 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                                title="Rejeitar Férias"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
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
                            className="size-6 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                            title="Eliminar marcação"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
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
                {colabId && (
                  <p className="text-[10px] font-semibold text-emerald-600 mt-1">
                    Dias disponíveis em {anoReferencia}: {diasDisponiveis(Number(colabId), anoReferencia)} de {DIAS_FERIAS_ANUAIS}
                  </p>
                )}
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
