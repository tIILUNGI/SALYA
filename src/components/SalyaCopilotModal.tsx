import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Função utilitária para remover asteriscos de marcação e formatar texto limpo
const cleanText = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove **bold**
    .replace(/\*(.*?)\*/g, '$1')     // remove *italic*
    .replace(/__(.*?)__/g, '$1');    // remove __underline__
};

export const SalyaCopilotModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Olá! Sou a SalIA, a sua assistente de IA especializada em Gestão de Processamento Salarial, Lei Geral do Trabalho (LGT 12/23), IRT e INSS em Angola. Como posso ajudar a sua empresa hoje?',
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);

    const lower = currentInput.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const match = (keywords: string[]) => keywords.some(k => lower.includes(k));

    let responseText = '';

    if (match(['irt', 'imposto rendimento', 'tabela irt', 'retencao irt', 'agt', 'grupo b', 'grupo c'])) {
      responseText = `IRT — Imposto sobre Rendimentos do Trabalho (Tabela AGT 2026)\n\n• Até 100.000 Kz → Isento\n• 100.001 – 150.000 Kz → 13% (parcela a abater: 13.000 Kz)\n• 150.001 – 200.000 Kz → 16% (parcela a abater: 17.500 Kz)\n• Acima de 200.000 Kz → 18% (parcela a abater: 21.500 Kz)\n\nPrestadores de Serviço têm retenção na fonte fixa de 6,5% (IRT Grupo B/C).\nO SALYA calcula a retenção de IRT automaticamente em cada liquidação.`;

    } else if (match(['inss', 'seguranca social', 'contribuicao', 'previdencia', 'quota patronal'])) {
      responseText = `INSS — Segurança Social em Angola\n\n• 3% a cargo do Trabalhador (descontado do salário base tributável)\n• 8% a cargo da Entidade Empregadora (Quota Patronal)\n• Total: 11% sobre a massa salarial tributável\n\nPrestadores de Serviço são isentos de INSS.\nO SALYA gera a folha de remunerações e guias para a Segurança Social.`;

    } else if (match(['ferias', 'dias uteis', 'gozo', 'acumulo ferias', 'subsidio ferias'])) {
      responseText = `Férias — LGT 12/23 (Art. 170.º)\n\n• 2 dias úteis de férias por cada mês completo de trabalho (máximo de 22 dias úteis por ano).\n• Subsídio de Férias = 100% do salário base do trabalhador.\n• O SALYA gere automaticamente os dias acumulados, gozados e o mapa de férias.`;

    } else if (match(['natal', 'subsidio natal', '13', 'decimo terceiro'])) {
      responseText = `Subsídio de Natal (13.º Mês)\n\nPago obrigatoriamente no mês de Dezembro ou no fecho de contas por rescisão:\n• Trabalhador com 12 meses de serviço = 1 Salário Base integral.\n• Trabalhador com fração de ano = (Salário Base ÷ 12) × meses trabalhados.`;

    } else if (match(['rescisao', 'despedimento', 'fecho contas', 'desligamento', 'indenizacao', 'caducidade', 'aviso previo'])) {
      responseText = `Rescisão Contratual — LGT 12/23\n\nO fecho de contas no SALYA calcula automaticamente:\n1. Salário proporcional aos dias trabalhados no mês de saída\n2. Férias não gozadas e subsídio de férias proporcional\n3. Subsídio de Natal proporcional\n4. Compensação por caducidade ou indemnização por despedimento\n5. Dedução de INSS (3%) e IRT sobre o montante sujeito a imposto`;

    } else if (match(['justa causa', 'despedimento justa', 'abandono', 'processo disciplinar'])) {
      responseText = `Despedimento por Justa Causa (Art. 206.º LGT 12/23)\n\nAplica-se por faltas injustificadas repetidas ou infração disciplinar grave. O trabalhador perde o direito a indemnização, mantendo apenas os salários em atraso e o proporcional de férias e subsídio de Natal adquiridos.`;

    } else if (match(['salario minimo', 'remuneracao minima', 'salario base minimo'])) {
      responseText = `Salário Mínimo Nacional em Angola\n\nO valor do salário mínimo nacional é fixado por Decreto Presidencial (actualmente 70.000 Kz para o sector geral). O SALYA valida os salários base no cadastro de colaboradores para cumprir a legislação.`;

    } else if (match(['horas extra', 'hora extra', 'trabalho suplementar', 'trabalho noturno'])) {
      responseText = `Horas Extraordinárias — LGT 12/23 (Art. 143.º)\n\n• Dias úteis: acréscimo mínimo de +50% por hora extra\n• Finais de semana e Feriados: acréscimo de +100%\n• Limite legal: máximo 2 horas por dia e 40 horas por mês.`;

    } else if (match(['maternidade', 'licenca maternidade', 'gravidez', 'paternidade', 'aleitamento'])) {
      responseText = `Licença de Maternidade e Paternidade\n\n• Maternidade: 90 dias consecutivos com subsídio pago pela Segurança Social (INSS).\n• Paternidade: 1 dia no nascimento + 5 dias subsequentes dispensados do trabalho.\n• Dispensa diária de 2 horas para aleitamento durante o primeiro ano.`;

    } else if (match(['falta', 'faltas', 'ausencia', 'falta justificada', 'falta injustificada'])) {
      responseText = `Gestão de Faltas — LGT 12/23\n\n• Faltas Justificadas: Não implicam perda de remuneração (ex: doença com atestado, falecimento de familiar, casamento).\n• Faltas Injustificadas: Implicam desconto proporcional no salário base e no INSS.\n• No SALYA, as faltas são inseridas no módulo de Assiduidade ou no Processamento.`;

    } else if (match(['recibo', 'contracheque', 'pdf recibo', 'imprimir recibo', 'qr code'])) {
      responseText = `Recibos de Vencimento no SALYA\n\nPermite gerar e descarregar recibos em PDF em 2 vias (Empresa e Colaborador) nos formatos A5 ou A4, com detalhe de todos os subsídios, descontos legais (IRT e INSS) e QR Code de autenticidade.`;

    } else if (match(['proxypay', 'multicaixa', 'pagamento', 'referencia atm', 'subscricao', 'plano', 'renovar'])) {
      responseText = `Planos e Pagamentos na Plataforma SALYA\n\n• Pagamento por Referência Multicaixa (ProxyPay): ativação automática instantânea.\n• Transferência Bancária Manual: mediante envio de comprovativo para ativação pelo Administrador.\n• Planos disponíveis: Demo (7 dias), Micro Empresa, Profissional e Corporate.`;

    } else if (match(['relatorio', 'exportar', 'excel', 'csv', 'primavera', 'contabilidade'])) {
      responseText = `Relatórios e Integrações Contabilísticas\n\nNo SALYA é possível exportar:\n• Folhas de Pagamento mensais em Excel e CSV\n• Ficheiros de integração para o ERP Primavera\n• Mapas de retenção de IRT para a AGT\n• Mapas de remunerações para a Segurança Social (INSS)`;

    } else if (match(['tipo de contrato', 'tipos de contrato', 'modalidades de contrato', 'contrato por termo', 'termo certo', 'tempo indeterminado', 'contrato trabalho', 'contratos', 'contrato'])) {
      responseText = `Tipos de Contratos de Trabalho em Angola (LGT 12/23):\n\n1. Contrato por Tempo Indeterminado:\n• Regra geral da LGT 12/23 para funções e postos permanentes.\n\n2. Contrato a Termo Certo / Determinado:\n• Para necessidades temporárias, substituições ou projetos de duração limitada.\n\n3. Contrato a Tempo Parcial (Part-time):\n• Prestado em horário reduzido, proporcional ao período de 44h semanais.\n\n4. Contrato de Teletrabalho:\n• Realizado fora das instalações da empresa através de meios tecnológicos.\n\n5. Contrato de Aprendizagem / Estágio Profissional:\n• Vocacionado para a formação e integração de jovens no mercado de trabalho.\n\n6. Prestação de Serviços (Trabalhador Independente):\n• Regime de trabalho autónomo sem vínculo laboral (isento de INSS e com retenção de IRT de 6,5%).\n\nNo SALYA, pode definir o tipo de contrato, data de início/fim e período de experiência no perfil de cada colaborador.`;

    } else if (match(['periodo de experiencia', 'periodo de ensaio', 'ensaio', 'probatorio'])) {
      responseText = `Período de Experiência (Art. 19.º LGT 12/23):\n\n• Trabalhadores não qualificados: até 60 dias\n• Trabalhadores qualificados e técnicos: até 120 dias\n• Cargos de direção, chefia e quadros superiores: até 180 dias\n\nDurante este período, qualquer das partes pode rescindir o contrato sem necessidade de pré-aviso ou indemnização.`;

    } else if (match(['subsidios', 'alimentacao', 'transporte', 'limite isencao', 'isento'])) {
      responseText = `Subsídios e Isenções Fiscais (IRT e INSS):\n\n• Subsídio de Alimentação: Isento de IRT e INSS até 30.000 Kz/mês.\n• Subsídio de Transporte: Isento de IRT e INSS até 30.000 Kz/mês.\n• Outros Subsídios (Turno, Atacadores, Antiguidade, Habitação): Sujeitos a IRT e INSS conforme tributável.\n\nO SALYA aplica os limites de isenção automaticamente no cálculo dos vencimentos.`;

    } else if (match(['como processar', 'processar salario', 'folha pagamento', 'calcular salario', 'liquidacao'])) {
      responseText = `Como Processar Salários no SALYA\n\n1. Aceda ao menu Processamento Salarial\n2. Escolha o Mês e Ano do exercício\n3. Clique em Liquidação Mensal para calcular todos os funcionários activos\n4. Ajuste faltas ou horas suplementares específicas se necessário\n5. Clique em Confirmar e Gerar Recibos`;

    } else if (match(['colaborador', 'funcionario', 'trabalhador', 'adicionar colaborador', 'cadastrar'])) {
      responseText = `Gestão de Colaboradores\n\nPara cadastrar um funcionário:\n1. Aceda ao menu Colaboradores\n2. Clique no botão + Novo Colaborador\n3. Preencha os dados pessoais, NIF, IBAN, cargo, salário base e subsídios\n4. Guardar o registo para incluir nos próximos processamentos`;

    } else if (match(['empresa', 'entidade', 'nif', 'criar empresa', 'configuracao'])) {
      responseText = `Gestão de Entidades no SALYA\n\nPode gerir uma ou mais empresas/entidades a partir do menu Configurações > Minhas Entidades, definindo o NIF, regime fiscal, taxas de retenção e logotipo oficial.`;

    } else if (match(['salya', 'sistema', 'plataforma', 'ajuda', 'suporte', 'contacto', 'ilungi'])) {
      responseText = `Sobre o SALYA Payroll\n\nO SALYA é a plataforma líder em Angola para Gestão de Folha de Pagamento, desenvolvida pela ILUNGI. Garante conformidade total com a LGT 12/23, AGT e INSS.\n\nContactos de Suporte:\n• Email: geral@ilungi.co.ao\n• WhatsApp: +244 935 793 270`;

    } else {
      // Out-of-scope restriction message
      responseText = `Desculpe, mas como assistente especializada da plataforma SALYA, apenas posso responder a questões relacionadas com a Gestão de Folha de Pagamento, Legislação Trabalhista de Angola (LGT 12/23), Impostos e Previdência (IRT, INSS, AGT), Contratos e Recursos do Sistema SALYA.\n\nPosso ajudá-lo com:\n• Tipos de Contratos de Trabalho (LGT 12/23) e Período de Experiência\n• Cálculo de IRT e INSS (Patronal e Trabalhador)\n• Regras de Férias, Faltas e Subsídios (Natal, Alimentação, Transporte)\n• Rescisão Contratual, Indemnizações e Fecho de Contas\n• Emissão de Recibos, Relatórios e Integração Primavera ERP\n• Funcionalidades e Suporte da Plataforma SALYA`;
    }

    // Garante que o texto de resposta não tem asteriscos
    const cleanResponse = cleanText(responseText);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'assistant',
          text: cleanResponse,
          timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setLoading(false);
    }, 400);
  };

  return (
    <>
      {/* Botão Flutuante de Disparo (Discreto & Elegante) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[90] size-13 sm:size-14 rounded-full bg-[#8e34eb] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
        title="SalIA — Assistente de IA SALYA"
      >
        <span className="material-symbols-outlined text-26 group-hover:rotate-12 transition-transform">smart_toy</span>
        <span className="absolute -top-0.5 -right-0.5 size-3.5 bg-emerald-400 border-2 border-white rounded-full animate-ping" />
        <span className="absolute -top-0.5 -right-0.5 size-3.5 bg-emerald-500 border-2 border-white rounded-full" />
      </button>

      {/* Painel Flutuante Responsivo SalIA */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 z-[150] w-[calc(100vw-2rem)] sm:w-[420px] max-w-full h-[520px] sm:h-[580px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Cabeçalho Corporativo */}
          <div className="p-4 px-5 bg-gradient-to-r from-slate-950 via-[#8e34eb] to-purple-950 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                  SalIA
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">LGT 12/23</span>
                </h3>
                <p className="text-[10px] text-purple-200 font-medium">Assistente de Gestão &amp; Legislação Angola</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Atalhos Rápidos (Sem Emojis) */}
          <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button onClick={() => { setInput('Quantos tipos de contratos existem na LGT 12/23?'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              Tipos de Contrato
            </button>
            <button onClick={() => { setInput('Como funciona o cálculo do IRT?'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              IRT AGT
            </button>
            <button onClick={() => { setInput('Qual é a taxa de INSS?'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              INSS (3% / 8%)
            </button>
            <button onClick={() => { setInput('Regras de Férias na LGT 12/23'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              Férias (LGT)
            </button>
            <button onClick={() => { setInput('Como calcular a rescisão contratual?'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              Rescisão Contratual
            </button>
            <button onClick={() => { setInput('Subsídio de Natal 13 mês'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              Subsídio de Natal
            </button>
            <button onClick={() => { setInput('Como funcionam as Horas Extras?'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              Horas Extras
            </button>
          </div>

          {/* Corpo de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-[#8e34eb] text-white rounded-br-none font-medium'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/80 rounded-bl-none font-normal'
                  }`}
                >
                  <p className="whitespace-pre-line">{cleanText(m.text)}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 w-fit text-slate-400">
                <span className="material-symbols-outlined text-sm animate-spin text-[#8e34eb]">sync</span>
                <span className="text-[11px] font-medium">SalIA está a analisar...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form de Envio */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="Escreva uma dúvida à SalIA..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-[#8e34eb] transition-all text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="size-10 bg-[#8e34eb] text-white rounded-xl flex items-center justify-center shrink-0 hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
