import React, { useEffect, useState, useContext } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { Download, AlertCircle, FileText, FileSpreadsheet, Users, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';

import { api, API_BASE_URL } from '../services/api';
import { AppContext } from '../App';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmpresaReport {
  id: number;
  nome: string;
  nif?: string;
  endereco?: string;
  municipio?: string;
  email?: string;
  telefone?: string;
}

interface ColaboradorReport {
  id: number;
  nome: string;
  cargo?: string;
  salarioBase?: number;
  status?: string;
  tipoContrato?: string;
  nif?: string;
  banco?: string;
  iban?: string;
}

interface ProcessamentoReport {
  id: number;
  nomeColaborador: string;
  mes: number;
  ano: number;
  totalBruto: number;
  descontos: number;
  salarioLiquido: number;
  valorINSS?: number;
  valorIRT?: number;
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const numToMonth = (n: number) => MONTHS[n - 1] || `Mês ${n}`;
const fmt = (v?: number | null) => {
  const a = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return a.toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' Kz';
};

// ── CSV builder ───────────────────────────────────────────────────────────────

const downloadCSV = (filename: string, rows: string[][], headers: string[]) => {
  const bom = '\uFEFF';
  const csvContent = bom + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── PDF builder ───────────────────────────────────────────────────────────────

const buildRelatoriosPDF = (
  empresa: EmpresaReport | null,
  colaboradores: ColaboradorReport[],
  processamentos: ProcessamentoReport[],
) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210;
  const margin = 14;
  let y = margin;

  const addLine = (color: string) => {
    doc.setDrawColor(color);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 3;
  };

  const checkPage = (needed = 10) => {
    if (y + needed > 285) { doc.addPage(); y = margin; }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO COMPLETO', margin, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-AO')}   |   Processado por SALYA`, margin, 21);
  y = 36;

  // ── Empresa ───────────────────────────────────────────────────────────────
  if (empresa) {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA EMPRESA', margin, y);
    y += 4;
    addLine('#e2e8f0');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const eInfos = [
      ['Nome', empresa.nome || '-'],
      ['NIF', empresa.nif || '-'],
      ['Endereço', [empresa.endereco, empresa.municipio].filter(Boolean).join(', ') || '-'],
      ['Email', empresa.email || '-'],
      ['Telefone', empresa.telefone || '-'],
    ];
    eInfos.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, margin + 32, y);
      y += 5;
    });
    y += 4;
  }

  // ── Colaboradores ─────────────────────────────────────────────────────────
  checkPage(20);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`COLABORADORES (${colaboradores.length})`, margin, y);
  y += 4;
  addLine('#e2e8f0');

  if (colaboradores.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Sem colaboradores registados.', margin, y);
    y += 8;
  } else {
    // Table header
    const colW = [55, 35, 30, 30, 32];
    const colX = [margin, margin + 55, margin + 90, margin + 120, margin + 150];
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 3, W - 2 * margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    ['Nome', 'Cargo', 'Salário Base', 'Status', 'Contrato'].forEach((h, i) => doc.text(h, colX[i], y + 1));
    y += 7;
    doc.setFont('helvetica', 'normal');

    colaboradores.forEach((c, idx) => {
      checkPage(7);
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 3, W - 2 * margin, 6, 'F');
      }
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.text((c.nome || '-').substring(0, 28), colX[0], y);
      doc.text((c.cargo || '-').substring(0, 18), colX[1], y);
      doc.text(fmt(c.salarioBase), colX[2], y);
      const statusColor = c.status === 'Ativo' ? [16, 185, 129] : [239, 68, 68];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(c.status || '-', colX[3], y);
      doc.setTextColor(30, 30, 30);
      doc.text(c.tipoContrato || '-', colX[4], y);
      y += 6;
    });
    y += 4;
  }

  // ── Processamentos ────────────────────────────────────────────────────────
  checkPage(20);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`HISTÓRICO DE PROCESSAMENTOS (${processamentos.length})`, margin, y);
  y += 4;
  addLine('#e2e8f0');

  if (processamentos.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Sem processamentos registados.', margin, y);
    y += 8;
  } else {
    const colW2 = [48, 24, 35, 35, 35];
    const colX2 = [margin, margin + 48, margin + 72, margin + 107, margin + 142];
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 3, W - 2 * margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    ['Colaborador', 'Período', 'Total Bruto', 'Descontos', 'Líquido'].forEach((h, i) => doc.text(h, colX2[i], y + 1));
    y += 7;
    doc.setFont('helvetica', 'normal');

    let totBruto = 0, totDesc = 0, totLiq = 0;
    processamentos.forEach((p, idx) => {
      checkPage(7);
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 3, W - 2 * margin, 6, 'F');
      }
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.text((p.nomeColaborador || '-').substring(0, 26), colX2[0], y);
      doc.text(`${numToMonth(p.mes)} ${p.ano}`.substring(0, 16), colX2[1], y);
      doc.text(fmt(p.totalBruto), colX2[2], y);
      doc.setTextColor(220, 38, 38);
      doc.text(fmt(p.descontos), colX2[3], y);
      doc.setTextColor(79, 70, 229);
      doc.text(fmt(p.salarioLiquido), colX2[4], y);
      doc.setTextColor(30, 30, 30);
      totBruto += p.totalBruto || 0;
      totDesc += p.descontos || 0;
      totLiq += p.salarioLiquido || 0;
      y += 6;
    });

    // Totals row
    checkPage(10);
    y += 2;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y - 3, W - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAIS', colX2[0], y + 2);
    doc.text(fmt(totBruto), colX2[2], y + 2);
    doc.text(fmt(totDesc), colX2[3], y + 2);
    doc.text(fmt(totLiq), colX2[4], y + 2);
    y += 10;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}  •  SALYA Payroll System`, W / 2, 290, { align: 'center' });
  }

  return doc;
};

// ── Component ─────────────────────────────────────────────────────────────────

const Relatórios: React.FC = () => {
  const { empresaId, empresa: empresaCtx, colaboradores: colabCtx } = useContext(AppContext);
  const [chartProcessamento, setChartProcessamento] = useState<any[]>([]);
  const [chartAbsentismo, setChartAbsentismo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processamentos, setProcessamentos] = useState<ProcessamentoReport[]>([]);
  const [generating, setGenerating] = useState<'pdf' | 'csv' | null>(null);
  const [message, setMessage] = useState('');

  // Colaboradores filtered for current empresa
  const colaboradores = colabCtx.filter(
    c => c.status === 'Ativo' && (!empresaId || c.empresaId === empresaId || (c as any).empresa?.id === empresaId)
  );

  // Empresa info
  const empresa: EmpresaReport | null = empresaCtx
    ? { id: (empresaCtx as any).id || 0, nome: empresaCtx.nome || '', nif: empresaCtx.nif, endereco: (empresaCtx as any).endereco, municipio: (empresaCtx as any).municipio, email: empresaCtx.email, telefone: empresaCtx.telefone }
    : null;

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);

    const fetchCharts = api.get(`/dashboard/charts?empresaId=${empresaId}`)
      .then(charts => {
        setChartProcessamento(charts.processamentoMensal || []);
        setChartAbsentismo(charts.absentismoDepartamento || []);
      })
      .catch(() => { setChartProcessamento([]); setChartAbsentismo([]); });

    const fetchProcessamentos = api.get(`/processamentos/historico?empresaId=${empresaId}`)
      .then(data => setProcessamentos(Array.isArray(data) ? data : []))
      .catch(() => setProcessamentos([]));

    Promise.all([fetchCharts, fetchProcessamentos]).finally(() => setLoading(false));
  }, [empresaId]);

  // ── PDF download ────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    setGenerating('pdf');
    setMessage('');
    try {
      const doc = buildRelatoriosPDF(empresa, colaboradores as ColaboradorReport[], processamentos);
      const filename = `Relatorio_${empresa?.nome?.replace(/ /g, '_') || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      setMessage('✅ PDF gerado com sucesso!');
    } catch (e: any) {
      setMessage('❌ Erro ao gerar PDF: ' + e.message);
    } finally {
      setGenerating(null);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // ── CSV download ────────────────────────────────────────────────────────────
  const handleDownloadCSV = (type: 'colaboradores' | 'processamentos') => {
    setGenerating('csv');
    setMessage('');
    try {
      if (type === 'colaboradores') {
        const headers = ['ID', 'Nome', 'Cargo', 'Salário Base', 'Status', 'Tipo Contrato', 'NIF', 'Banco', 'IBAN'];
        const rows = (colaboradores as ColaboradorReport[]).map(c => [
          String(c.id), c.nome || '', c.cargo || '', String(c.salarioBase || 0), c.status || '', c.tipoContrato || '', c.nif || '', c.banco || '', c.iban || '',
        ]);
        downloadCSV(`Colaboradores_${new Date().toISOString().split('T')[0]}.csv`, rows, headers);
        setMessage('✅ CSV de colaboradores exportado!');
      } else {
        const headers = ['ID', 'Colaborador', 'Mês', 'Ano', 'Total Bruto (Kz)', 'Descontos (Kz)', 'Salário Líquido (Kz)', 'INSS (Kz)', 'IRT (Kz)'];
        const rows = processamentos.map(p => [
          String(p.id), p.nomeColaborador || '', numToMonth(p.mes), String(p.ano),
          String(p.totalBruto || 0), String(p.descontos || 0), String(p.salarioLiquido || 0),
          String(p.valorINSS || 0), String(p.valorIRT || 0),
        ]);
        downloadCSV(`Processamentos_${new Date().toISOString().split('T')[0]}.csv`, rows, headers);
        setMessage('✅ CSV de processamentos exportado!');
      }
    } catch (e: any) {
      setMessage('❌ Erro ao gerar CSV: ' + e.message);
    } finally {
      setGenerating(null);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6 md:space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Relatórios &amp; Insights</h1>
          <p className="text-sm font-medium text-slate-500">Exporte dados em PDF ou CSV e acompanhe métricas em tempo real.</p>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium transition-all ${message.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Export panel */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exportar Relatórios</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PDF Completo */}
          <div className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">PDF Completo</p>
                <p className="text-xs text-slate-500">Empresa + Colaboradores + Processamentos</p>
              </div>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={generating !== null}
              className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {generating === 'pdf' ? 'A gerar...' : 'Baixar PDF'}
            </button>
          </div>

          {/* CSV Colaboradores */}
          <div className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">CSV Colaboradores</p>
                <p className="text-xs text-slate-500">{colaboradores.length} colaboradores activos</p>
              </div>
            </div>
            <button
              onClick={() => handleDownloadCSV('colaboradores')}
              disabled={generating !== null || colaboradores.length === 0}
              className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {generating === 'csv' ? 'A gerar...' : 'Exportar CSV'}
            </button>
          </div>

          {/* CSV Processamentos */}
          <div className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">CSV Processamentos</p>
                <p className="text-xs text-slate-500">{processamentos.length} registos de pagamentos</p>
              </div>
            </div>
            <button
              onClick={() => handleDownloadCSV('processamentos')}
              disabled={generating !== null || processamentos.length === 0}
              className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {generating === 'csv' ? 'A gerar...' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">O PDF completo inclui:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Dados da empresa (NIF, endereço, contactos)</li>
              <li>Lista completa de colaboradores activos com salários</li>
              <li>Histórico detalhado de processamentos com totalizações</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Folha de Pagamento Anual</h3>
            <div className="px-3 py-1 bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-bold">Mensal</div>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Analizando Dados...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartProcessamento} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="total" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Absentismo por Dept.</h3>
            <span className="material-symbols-outlined text-slate-300">more_horiz</span>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Calculando Taxas...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartAbsentismo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="faltas" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="justificadas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Relatórios;
