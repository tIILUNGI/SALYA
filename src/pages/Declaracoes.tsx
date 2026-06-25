import React, { useState, useContext, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import { AppContext } from '../App';
import { Colaborador } from '../types';
import { getLogoUrl } from '../services/api';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatMoney = (value?: number | null) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return amount.toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Converte número para extenso (suporte a valores angolanos)
function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  const units = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove',
    'Dez', 'Onze', 'Doze', 'Treze', 'Catorze', 'Quinze', 'Dezasseis', 'Dezassete', 'Dezoito', 'Dezanove'];
  const tens = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
  const hundreds = ['', 'Cem', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

  if (n === 0) return 'Zero';
  if (n === 100) return 'Cem';

  const convert = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      return u === 0 ? tens[t] : `${tens[t]} e ${units[u]}`;
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      const hWord = h === 1 && rest > 0 ? 'Cento' : hundreds[h];
      return rest === 0 ? hWord : `${hWord} e ${convert(rest)}`;
    }
    if (num < 1000000) {
      const th = Math.floor(num / 1000);
      const rest = num % 1000;
      const thWord = th === 1 ? 'Mil' : `${convert(th)} Mil`;
      return rest === 0 ? thWord : `${thWord} e ${convert(rest)}`;
    }
    const mil = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const milWord = mil === 1 ? 'Um Milhão' : `${convert(mil)} Milhões`;
    return rest === 0 ? milWord : `${milWord} e ${convert(rest)}`;
  };

  const intPart = Math.floor(n);
  return `${convert(intPart)} Kwanzas`;
}

const formatDateAdmissao = (dateStr?: string) => {
  if (!dateStr) return '___________';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
};

const TodayDate = () => {
  const now = new Date();
  const day = now.getDate();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  return `${day} de ${month} de ${year}`;
};

const Declaracoes: React.FC = () => {
  const { empresa, colaboradores, empresaId } = useContext(AppContext);

  const ativos = useMemo(() =>
    colaboradores.filter(c =>
      c.status === 'Ativo' && (!empresaId || c.empresaId === empresaId || (c as any).empresa?.id === empresaId)
    ), [colaboradores, empresaId]);

  const [search, setSearch] = useState('');
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState('A Direcção');

  const filtered = useMemo(() =>
    ativos.filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.cargo && c.cargo.toLowerCase().includes(search.toLowerCase())) ||
      (c.nif && c.nif.includes(search))
    ), [ativos, search]);

  const handleSelectColab = (colab: Colaborador) => {
    setSelectedColab(colab);
    setShowPreview(true);
  };

  const handleExportPDF = () => {
    const el = document.getElementById('declaracao-trabalho');
    if (!el || !selectedColab) return;
    html2pdf().from(el).set({
      margin: 0,
      filename: `Declaracao_Trabalho_${selectedColab.nome.replace(/ /g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3.5, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  const handlePrint = () => {
    const el = document.getElementById('declaracao-trabalho');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head>
        <title>Declaração de Trabalho</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
          * { box-sizing: border-box; }
        </style>
      </head><body onload="window.print();window.onafterprint=()=>window.close();">
        ${el.outerHTML}
      </body></html>
    `);
    w.document.close();
  };

  const docIdentLabel = empresa?.categoria === 'Particular' ? 'Nº BI/Passaporte' : 'NIF';
  const colabDocIdent = selectedColab?.bi || selectedColab?.nif || '___________';
  const salario = selectedColab?.salarioBase || 0;
  const salarioPorExtenso = numberToWords(salario);

  return (
    <div className="p-4 md:p-6 w-full max-w-full font-app">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-medium text-slate-700">Declarações de Trabalho</h2>
          <p className="text-sm text-slate-400 mt-0.5">Selecione um colaborador para emitir a declaração</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg">
          <span className="material-symbols-outlined text-primary text-sm">description</span>
          <span className="text-xs font-medium text-primary">{ativos.length} colaborador(es) ativo(s)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Lista de colaboradores */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4 border border-slate-100">
            {/* Pesquisa */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Pesquisar colaborador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Lista */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                  <p className="text-sm text-slate-400 mt-2">Nenhum colaborador encontrado</p>
                </div>
              ) : (
                filtered.map(colab => (
                  <button
                    key={colab.id}
                    onClick={() => handleSelectColab(colab)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedColab?.id === colab.id
                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-primary/20 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      selectedColab?.id === colab.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {colab.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-slate-800 truncate">{colab.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{colab.cargo || '—'}</p>
                    </div>
                    {selectedColab?.id === colab.id && (
                      <span className="material-symbols-outlined text-primary ml-auto text-sm flex-shrink-0">check_circle</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pré-visualização / Estado vazio */}
        <div className="lg:col-span-3">
          {!showPreview || !selectedColab ? (
            <div className="glass-card border border-slate-100 flex flex-col items-center justify-center py-24 text-center">
              <div className="size-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-primary/40">description</span>
              </div>
              <h3 className="text-base font-semibold text-slate-600 mb-1">Selecione um colaborador</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Escolha um colaborador na lista ao lado para pré-visualizar e emitir a declaração de trabalho.
              </p>
            </div>
          ) : (
            <div className="glass-card border border-slate-100 overflow-hidden">
              {/* Barra de acções */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {selectedColab.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{selectedColab.nome}</p>
                    <p className="text-[10px] text-slate-400">{selectedColab.cargo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Imprimir
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Exportar PDF
                  </button>
                  <button
                    onClick={() => { setShowPreview(false); setSelectedColab(null); }}
                    className="size-7 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>

              {/* Barra de configuração rápida */}
              <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-4">
                <div className="flex items-center gap-3 flex-grow max-w-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Responsável:</span>
                  <input 
                    type="text"
                    value={responsavelNome}
                    onChange={e => setResponsavelNome(e.target.value)}
                    className="flex-grow text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary outline-none transition-all"
                    placeholder="Nome que aparecerá na assinatura..."
                  />
                </div>
              </div>

              {/* Pré-visualização da declaração */}
              <div className="p-4 bg-slate-100 overflow-y-auto max-h-[75vh]">
                <div
                  id="declaracao-trabalho"
                  style={{
                    width: '190mm',
                    minHeight: '277mm',
                    margin: '0 auto',
                    backgroundColor: '#fff',
                    padding: '20mm',
                    boxSizing: 'border-box',
                    fontFamily: '"Times New Roman", serif',
                    fontSize: '12pt',
                    color: '#000',
                    lineHeight: '1.6',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    {/* Cabeçalho da empresa */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '25mm' }}>
                      {empresa?.logoUrl && (
                        <img
                          src={getLogoUrl(empresa.logoUrl)}
                          alt="Logótipo"
                          style={{ height: '28mm', maxWidth: '60mm', objectFit: 'contain', marginBottom: '6mm' }}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div style={{ lineHeight: '1.4' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '15pt', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#1a1a1a' }}>{empresa?.nome || '[NOME DA EMPRESA]'}</p>
                        <div style={{ fontSize: '9pt', color: '#444' }}>
                          <p style={{ margin: '2px 0' }}>{docIdentLabel}: <strong>{empresa?.nif || '___________'}</strong></p>
                          {empresa?.endereco && <p style={{ margin: '2px 0' }}>{empresa.endereco}{empresa.municipio ? `, ${empresa.municipio}` : ''}</p>}
                          {(empresa?.email || empresa?.telefone) && (
                            <p style={{ margin: '2px 0' }}>
                              {[empresa.email, empresa.telefone].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Título */}
                    <div style={{ textAlign: 'center', margin: '10mm 0 12mm' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '14pt', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                        Declaração de Trabalho
                      </p>
                    </div>

                    {/* Corpo */}
                    <div style={{ textAlign: 'justify', marginBottom: '8mm' }}>
                      <p style={{ margin: '0 0 6mm 0' }}>
                        Declaramos para os devidos efeitos que o(a) Sr.(a) <strong>{selectedColab.nome}</strong>,
                        portador(a) do Documento de Identidade n.º <strong>{colabDocIdent}</strong>,
                        exerce funções nesta empresa desde <strong>{formatDateAdmissao(selectedColab.dataAdmissao)}</strong>,
                        ocupando actualmente o cargo de <strong>{selectedColab.cargo || '___________'}</strong>,
                        aufere uma remuneração mensal de <strong>{formatMoney(salario)} Kz ({salarioPorExtenso})</strong>.
                      </p>

                      <p style={{ margin: '0 0 6mm 0' }}>
                        No exercício das suas funções, o(a) referido(a) trabalhador(a) tem desempenhado
                        as actividades inerentes ao cargo com zelo, responsabilidade e profissionalismo,
                        contribuindo para o alcance dos objectivos da organização.
                      </p>

                      <p style={{ margin: 0 }}>
                        A presente declaração é emitida a pedido do(a) interessado(a) para os fins que julgar convenientes.
                      </p>
                    </div>

                    {/* Local e data */}
                    <div style={{ textAlign: 'center', marginTop: '18mm', marginBottom: '16mm' }}>
                      <p style={{ margin: 0, fontSize: '11pt' }}>
                        <strong>{empresa?.provincia || empresa?.municipio || 'Luanda'}, {TodayDate()}</strong>
                      </p>
                    </div>

                    {/* Assinatura */}
                    <div style={{ borderTop: '1px solid #000', paddingTop: '6mm', textAlign: 'center', marginTop: '12mm', width: '80mm', margin: '20mm auto 0' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '12pt', margin: '0 0 2px 0' }}>
                        {responsavelNome}
                      </p>
                      <p style={{ fontSize: '10pt', margin: 0, color: '#333' }}>
                        Responsável
                      </p>
                    </div>
                  </div>

                  {/* Rodapé discreto */}
                  <div style={{ textAlign: 'center', fontSize: '8pt', color: '#94a3b8', borderTop: '0.5px solid #f1f5f9', paddingTop: '4mm' }}>
                    Processado por Salya
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Declaracoes;
