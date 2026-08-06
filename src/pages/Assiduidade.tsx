import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { api } from '../services/api';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

interface Falta {
  id: number;
  colaboradorId: number;
  colaborador: string;
  dataFalta: string;
  tipo: string;
  motivo?: string;
  descontaSalario: boolean;
  descontaSubsidios: boolean;
  documentoUrl?: string;
}

interface RegistoPonto {
  id: number;
  colaboradorId: number;
  colaboradorNome: string;
  data: string;
  horaEntrada: string;
  horaSaida?: string;
  minutosAtraso: number;
  origem: string;
}

const formatarAtrasosEmHoras = (minutosTotal: number): string => {
  if (!minutosTotal || minutosTotal <= 0) return '0h';
  const h = Math.floor(minutosTotal / 60);
  const m = minutosTotal % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const Assiduidade: React.FC = () => {
  const { empresaId, colaboradores } = useContext(AppContext);
  const colaboradoresAtivos = colaboradores.filter(c => c.status !== 'Afastado' && c.status !== 'Desligado');
  const [activeTab, setActiveTab] = useState<'mapa' | 'faltas' | 'registos'>('mapa');

  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [registos, setRegistos] = useState<RegistoPonto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modais
  const [showFaltaModal, setShowFaltaModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Formulário de falta
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<number | ''>('');
  const [dataFalta, setDataFalta] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tipoFalta, setTipoFalta] = useState<string>('INJUSTIFICADA');
  const [motivoFalta, setMotivoFalta] = useState<string>('');
  const [descontaSalario, setDescontaSalario] = useState<boolean>(true);
  const [descontaSubsidios, setDescontaSubsidios] = useState<boolean>(true);

  // Upload biométrico
  const [biometricFile, setBiometricFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const loadData = React.useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [faltasRes, registosRes] = await Promise.allSettled([
        api.get(`/assiduidade/faltas?empresaId=${empresaId}`),
        api.get(`/assiduidade/registos?empresaId=${empresaId}`)
      ]);

      if (faltasRes.status === 'fulfilled' && Array.isArray(faltasRes.value)) {
        setFaltas(faltasRes.value);
      } else {
        setFaltas([]);
      }

      if (registosRes.status === 'fulfilled' && Array.isArray(registosRes.value)) {
        setRegistos(registosRes.value);
      } else {
        setRegistos([]);
      }
    } catch (e) {
      console.error('Erro ao carregar dados de assiduidade:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId, loadData]);

  const handleSalvarFalta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !selectedColaboradorId) return;

    const colab = colaboradores.find(c => c.id === Number(selectedColaboradorId));
    const payload = {
      empresaId,
      colaboradorId: Number(selectedColaboradorId),
      colaborador: colab ? colab.nome : 'Colaborador',
      dataFalta,
      tipo: tipoFalta,
      motivo: motivoFalta,
      descontaSalario,
      descontaSubsidios
    };

    try {
      await api.post(`/assiduidade/faltas?empresaId=${empresaId}`, payload);
      Swal.fire('Sucesso!', 'Registo de falta gravado com sucesso.', 'success');
      setShowFaltaModal(false);
      resetFaltaForm();
      loadData();
    } catch (err: any) {
      Swal.fire('Erro', err.message || 'Erro ao gravar falta.', 'error');
    }
  };

  const resetFaltaForm = () => {
    setSelectedColaboradorId('');
    setDataFalta(new Date().toISOString().split('T')[0]);
    setTipoFalta('INJUSTIFICADA');
    setMotivoFalta('');
    setDescontaSalario(true);
    setDescontaSubsidios(true);
  };

  const handleDeletarFalta = async (id: number) => {
    const result = await Swal.fire({
      title: 'Eliminar Registo?',
      text: 'Tem certeza que deseja remover esta falta?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/assiduidade/faltas/${id}?empresaId=${empresaId}`);
        Swal.fire('Eliminado!', 'Falta removida com sucesso.', 'success');
        loadData();
      } catch (err: any) {
        Swal.fire('Erro', err.message || 'Erro ao eliminar registo.', 'error');
      }
    }
  };

  const handleUploadBiometrico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biometricFile || !empresaId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', biometricFile);

    try {
      const res = await api.post(`/assiduidade/importar-biometrico?empresaId=${empresaId}`, formData);
      Swal.fire({
        title: 'Importação Concluída!',
        text: `Foram importados ${res.registosImportados || 0} registos com sucesso. (${res.linhasIgnoradas || 0} ignorados/não encontrados).`,
        icon: 'success'
      });
      setShowImportModal(false);
      setBiometricFile(null);
      loadData();
    } catch (err: any) {
      Swal.fire('Erro', err.message || 'Erro ao importar ficheiro biométrico.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const totalFaltasInjustificadas = faltas.filter(f => f.descontaSalario).length;
  const totalFaltasJustificadas = faltas.filter(f => !f.descontaSalario).length;
  const totalMinutosAtraso = registos.reduce((acc, curr) => acc + (curr.minutosAtraso || 0), 0);

  const handleGerarMapaFaltas = () => {
    const ano = new Date().getFullYear();
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b;">
        <h1 style="font-size: 18px; margin: 0 0 4px; font-weight: bold;">MAPA DE FALTAS E ASSIDUIDADE</h1>
        <p style="font-size: 11px; color: #64748b; margin: 0 0 20px;">Ano de referência: ${ano} · Gerado por SALYA em ${new Date().toLocaleDateString('pt-AO')}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Data</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Colaborador</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Tipo</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: left;">Motivo</th>
              <th style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">Desconto Salarial</th>
            </tr>
          </thead>
          <tbody>
            ${faltas.length === 0 ? '<tr><td colspan="5" style="border:1px solid #e2e8f0;padding:12px;text-align:center;color:#94a3b8;">Sem registos de faltas</td></tr>' :
              faltas.map(f => `<tr>
                <td style="border:1px solid #e2e8f0;padding:8px;">${f.dataFalta}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;">${f.colaborador}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;">${f.tipo}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;">${f.motivo || 'Sem motivo'}</td>
                <td style="border:1px solid #e2e8f0;padding:8px;text-align:center;">${f.descontaSalario ? 'Sim' : 'Não'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size: 9px; color: #94a3b8; margin-top: 16px; text-align: center;">Documento gerado automaticamente pelo Salya — Lei Geral do Trabalho de Angola</p>
      </div>
    `;
    (html2pdf() as any).from(el).set({
      margin: 10,
      filename: `mapa-faltas-${ano}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).save();
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Assiduidade &amp; Faltas</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleGerarMapaFaltas}
            className="bg-white dark:bg-slate-900 border border-primary/30 text-primary hover:bg-primary/5 px-5 py-2.5 rounded-xl font-semibold shadow-soft transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Gerar Mapa de Faltas
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-white dark:bg-slate-900 border border-primary/30 text-primary hover:bg-primary/5 px-5 py-2.5 rounded-xl font-semibold shadow-soft transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-lg">cloud_upload</span>
            Importar Biométrico
          </button>
          <button
            onClick={() => setShowFaltaModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold shadow-soft hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Marcar Falta
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">Total de Faltas</p>
            <span className="material-symbols-outlined text-rose-500 text-xl">event_busy</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{faltas.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Registos de ausências no período.</p>
        </div>

        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">Faltas com Desconto</p>
            <span className="material-symbols-outlined text-amber-500 text-xl">warning</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{totalFaltasInjustificadas}</p>
          <p className="text-[10px] text-slate-400 mt-1">Ausências que implicam desconto salarial.</p>
        </div>

        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-500 font-semibold">Faltas Justificadas</p>
            <span className="material-symbols-outlined text-emerald-500 text-xl">verified_user</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{totalFaltasJustificadas}</p>
          <p className="text-[10px] text-slate-400 mt-1">Ausências com justificação válida.</p>
        </div>

        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-primary font-semibold">Atrasos Acumulados</p>
            <span className="material-symbols-outlined text-primary text-xl">schedule</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{formatarAtrasosEmHoras(totalMinutosAtraso)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Total de horas de atraso registadas.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 mb-8">
        <button
          onClick={() => setActiveTab('mapa')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'mapa'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Mapa de Assiduidade
        </button>
        <button
          onClick={() => setActiveTab('faltas')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'faltas'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Histórico de Faltas ({faltas.length})
        </button>
        <button
          onClick={() => setActiveTab('registos')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'registos'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Registos Biométricos ({registos.length})
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-16 flex items-center justify-center border border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Tab 1: Mapa de Assiduidade */}
          {activeTab === 'mapa' && (
        <div className="glass-card overflow-x-auto border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Visão Geral de Colaboradores</h3>
            <span className="text-xs text-slate-400 font-semibold">
              {colaboradoresAtivos.length} Colaboradores ativos
            </span>
          </div>

          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Colaborador</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Cargo / Dept</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Faltas Mês</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Status Assiduidade</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {colaboradoresAtivos.map((colab) => {
                const colabFaltas = faltas.filter(f => f.colaboradorId === colab.id);
                const temInjustificadas = colabFaltas.some(f => f.descontaSalario);

                return (
                  <tr key={colab.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all align-middle">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {colab.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-white capitalize">{colab.nome}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{colab.bi || 'Sem BI'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {colab.cargo || 'Geral'}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-white">
                      {colabFaltas.length} {colabFaltas.length === 1 ? 'falta' : 'faltas'}
                    </td>
                    <td className="px-6 py-4">
                      {colabFaltas.length === 0 ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 inline-flex items-center gap-1">
                          100% Assíduo
                        </span>
                      ) : temInjustificadas ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 inline-flex items-center gap-1">
                          Com Desconto
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 inline-flex items-center gap-1">
                          Justificado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedColaboradorId(colab.id);
                          setShowFaltaModal(true);
                        }}
                        className="px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary/5 rounded-lg text-xs font-semibold transition-all"
                      >
                        Marcar Falta
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Histórico de Faltas */}
      {activeTab === 'faltas' && (
        <div className="glass-card overflow-x-auto border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Registos de Faltas &amp; Justificações</h3>
          </div>

          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Data</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Colaborador</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Tipo</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Motivo</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Desconto</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 text-right whitespace-nowrap">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {faltas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Nenhum registo de falta encontrado.
                  </td>
                </tr>
              ) : (
                faltas.map((falta) => (
                  <tr key={falta.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all align-middle">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-white font-mono">
                      {falta.dataFalta}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-white capitalize">
                      {falta.colaborador}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        falta.tipo === 'INJUSTIFICADA'
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {falta.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {falta.motivo || 'Sem motivo especificado'}
                    </td>
                    <td className="px-6 py-4">
                      {falta.descontaSalario ? (
                        <span className="text-rose-600 font-bold text-xs">Sim (Salário + Subsídios)</span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs">Não (Isento de Desconto)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeletarFalta(falta.id)}
                        className="size-7 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all inline-flex items-center justify-center"
                        title="Eliminar Falta"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Registos Biométricos */}
      {activeTab === 'registos' && (
        <div className="glass-card overflow-x-auto border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Registos de Relógio Biométrico</h3>
          </div>

          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Data</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Colaborador</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Entrada</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Saída</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Atraso</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 whitespace-nowrap">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {registos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Nenhum registo biométrico importado ainda.
                  </td>
                </tr>
              ) : (
                registos.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all align-middle">
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-white font-mono">
                      {reg.data}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-white capitalize">
                      {reg.colaboradorNome}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-600 font-mono">
                      {reg.horaEntrada || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 font-mono">
                      {reg.horaSaida || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      {reg.minutosAtraso > 0 ? (
                        <span className="text-amber-600 font-bold">+{reg.minutosAtraso} min</span>
                      ) : (
                        <span className="text-slate-400">No horário</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold">
                        {reg.origem}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* Modal: Marcar Falta */}
      {showFaltaModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Marcar Falta / Justificação</h3>
              <button onClick={() => setShowFaltaModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSalvarFalta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Colaborador *</label>
                <select
                  required
                  value={selectedColaboradorId}
                  onChange={(e) => setSelectedColaboradorId(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-800 dark:text-white"
                >
                  <option value="">Selecione o colaborador...</option>
                  {colaboradoresAtivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.cargo || 'Sem Cargo'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data da Falta *</label>
                <input
                  type="date"
                  required
                  value={dataFalta}
                  onChange={(e) => setDataFalta(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Falta</label>
                <select
                  value={tipoFalta}
                  onChange={(e) => {
                    setTipoFalta(e.target.value);
                    if (e.target.value === 'JUSTIFICADA' || e.target.value === 'ATESTE_MEDICO') {
                      setDescontaSalario(false);
                      setDescontaSubsidios(false);
                    } else {
                      setDescontaSalario(true);
                      setDescontaSubsidios(true);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-800 dark:text-white"
                >
                  <option value="INJUSTIFICADA">Injustificada (Com Desconto)</option>
                  <option value="JUSTIFICADA">Justificada (Sem Desconto)</option>
                  <option value="ATESTE_MEDICO">Atestado Médico</option>
                  <option value="LICENCA">Licença de Maternidade / Especial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivo / Observações</label>
                <textarea
                  rows={2}
                  value={motivoFalta}
                  onChange={(e) => setMotivoFalta(e.target.value)}
                  placeholder="Descreva brevemente o motivo da falta..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={descontaSalario}
                    onChange={(e) => setDescontaSalario(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  Descontar dia no Salário Base
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={descontaSubsidios}
                    onChange={(e) => setDescontaSubsidios(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  Descontar Subsídio de Alimentação e Transporte do dia
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFaltaModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Gravar Falta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importar Biométrico */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Importar Dados Biométricos</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Carregue o ficheiro <strong>CSV ou TXT</strong> exportado pelo relógio de ponto (ZKTEco, Control iD, etc.). 
              O ficheiro deve conter o ID/BI do colaborador, Data e Hora de entrada.
            </p>

            <form onSubmit={handleUploadBiometrico} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/40">
                <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
                <div>
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx"
                    onChange={(e) => setBiometricFile(e.target.files ? e.target.files[0] : null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90"
                  />
                </div>
                {biometricFile && (
                  <p className="text-xs font-bold text-emerald-500 font-mono">
                    Ficheiro selecionado: {biometricFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!biometricFile || uploading}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {uploading ? 'A Importar...' : 'Processar Ficheiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assiduidade;
