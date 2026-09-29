import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Suporte global para a Web Speech API
const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Olá! Sou a sua assistente de IA especializada em Gestão de Processamento Salarial. Como posso lhe ajudar hoje?',
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Carrega vozes disponiveis e escolhe a voz da Francisca Online como padrao
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      const franciscaVoice = voices.find(v => v.name.toLowerCase().includes('francisca'));
      const ptVoices = voices.filter(v =>
        v.lang.startsWith('pt') ||
        v.name.toLowerCase().includes('portugu')
      );

      if (franciscaVoice) {
        setAvailableVoices(voices.filter(v => v.lang.startsWith('pt') || v.name.toLowerCase().includes('francisca')));
        setSelectedVoiceName(franciscaVoice.name);
      } else if (ptVoices.length > 0) {
        setAvailableVoices(ptVoices);
        const preferred =
          ptVoices.find(v => v.name.toLowerCase().includes('francisca')) ||
          ptVoices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('pt')) ||
          ptVoices.find(v => v.name.toLowerCase().includes('microsoft') && v.lang.startsWith('pt')) ||
          ptVoices.find(v => v.lang === 'pt-PT') ||
          ptVoices.find(v => v.lang === 'pt-BR') ||
          ptVoices[0];
        if (preferred) setSelectedVoiceName(preferred.name);
      } else if (voices.length > 0) {
        setAvailableVoices(voices.slice(0, 10));
        setSelectedVoiceName(voices[0].name);
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Função para leitura por Voz (Text-to-Speech)
  const speakText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('O seu navegador não suporta a funcionalidade de voz.');
      return;
    }

    if (isSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleaned = cleanText(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);

    // Escolher a voz da Francisca Online ou selecionada
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.name === selectedVoiceName) ||
      voices.find(v => v.name.toLowerCase().includes('francisca')) ||
      voices.find(v => v.lang.startsWith('pt') && v.name.toLowerCase().includes('google')) ||
      voices.find(v => v.lang.startsWith('pt') && v.name.toLowerCase().includes('microsoft')) ||
      voices.find(v => v.lang.startsWith('pt')) ||
      null;

    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'pt-PT';
    utterance.rate = 0.92;   // ligeiramente mais lento = mais natural
    utterance.pitch = 1.05;  // ligeiramente mais agudo = mais humano
    utterance.volume = 1.0;

    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    setIsSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Função para captação por Microfone (Speech-to-Text)
  const toggleListening = () => {
    if (!SpeechRecognitionAPI) {
      alert('O seu navegador não suporta reconhecimento de voz. Experimente o Google Chrome ou Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'pt-PT';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Erro de reconhecimento de voz:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
        console.error('Falha ao iniciar microfone:', err);
        setIsListening(false);
    }
  };

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

    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

    const SYSTEM_INSTRUCTION = `Você é a SalIA (SALYA + IA), assistente de IA sênior, extremamente competente e especialista em Recursos Humanos, Processamento Salarial, Fiscalidade Angolana e Legislação Laboral de Angola (Lei Geral do Trabalho - LGT 12/23).

DATA E HORA ACTUAL (use sempre que o utilizador perguntar sobre data ou hora):
- Data de hoje: ${todayStr}
- Hora actual: ${timeStr}

SOBRE A EMPRESA CRIADORA (ILUNGI):
- O SALYA Payroll é desenvolvido e gerido pela ILUNGI (site oficial: https://ilungi.ao/).
- A ILUNGI é uma empresa angolana de tecnologia e inovação focada no desenvolvimento de soluções de software corporativo de alta performance, transformação digital e inteligência aplicada aos negócios em Angola.
- Contactos Oficiais ILUNGI: Email geral@ilungi.co.ao, WhatsApp +244 935 793 270.

SOBRE A PLATAFORMA SALYA (GUIA DE UTILIZAÇÃO):
1. COMO CRIAR UMA CONTA:
   - Aceda a https://app.salya.ao e clique em "Criar Conta" ou "Registar".
   - Escolha o plano desejado (Demo 7 dias, Micro Empresa, Profissional ou Corporate).
   - Preencha os dados da empresa (Nome, NIF, Email, Telefone) e finalize o registo.
   - Após o registo, receberá um email de activação para confirmar a sua conta.

2. COMO CRIAR UMA EMPRESA/ENTIDADE:
   - Após o login, aceda ao menu Configurações > Minhas Entidades.
   - Clique em +Nova Entidade e preencha: Nome Comercial, NIF, Morada, Regime Fiscal e logotipo.
   - Defina as taxas de retenção e o regime de INSS aplicável.
   - Guarde e a empresa ficará disponível para processar salários.

3. COMO PROCESSAR SALÁRIOS (LIQUIDAÇÃO MENSAL):
   - No menu lateral, clique em Processamento Salarial.
   - Seleccione o Mês e Ano do exercício pretendido.
   - Clique em Liquidação Mensal para calcular automaticamente todos os colaboradores activos.
   - Reveja os cálculos de IRT, INSS, subsídios e descontos.
   - Registe faltas, horas extras ou adiantamentos se aplicável.
   - Clique em Confirmar para fechar o processamento.
   - Gere e descarregue os recibos em PDF individualmente ou em massa.

4. COMO VER RELATÓRIOS:
   - No menu lateral, clique em Relatórios.
   - Pode exportar: Folha de Pagamento mensal (Excel/CSV), Mapa de INSS, Mapa de IRT para a AGT, Ficheiro de integração para o ERP Primavera e Recibos de Vencimento em PDF.
   - Filtre por entidade, período ou colaborador conforme necessário.

5. COMO ADICIONAR COLABORADORES:
   - Aceda ao menu Colaboradores e clique em +Novo Colaborador.
   - Preencha: Nome completo, NIF, IBAN, Cargo, Categoria, Data de admissão, Salário Base e Subsídios.
   - Defina o tipo de contrato (IND, Termo Certo, Prestador de Serviços, etc.) e o período de experiência.
   - Guarde para que o colaborador seja incluído nos próximos processamentos.

DOMÍNIO TÉCNICO & LEGISLAÇÃO LABORAL ANGOLANA:
1. Lei Geral do Trabalho (LGT 12/23):
   - Período de Experiência (Art. 19.º): 60 dias para trabalhadores não qualificados; 120 dias para qualificados/técnicos; 180 dias para cargos de direção, chefia e quadros superiores.
   - Férias (Art. 170.º): 2 dias úteis de férias por cada mês de trabalho efetivo, máximo 22 dias úteis por ano. Subsídio de Férias = 100% do salário base.
   - Subsídio de Natal (13.º Mês): Pago obrigatoriamente em Dezembro. 1 Salário Base integral para 12 meses ou proporcional.
   - Rescisão & Indemnizações: Grande Empresa (100%/ano), Média Empresa (50%/ano), Pequena/Micro Empresa (35%/ano).

2. Impostos e Previdência (AGT & INSS):
   - IRT: Isento até 100.000 Kz. Escalões de 13%, 16% e 18%. Prestadores de Serviço: 6,5% (Grupo B/C).
   - INSS: 3% (trabalhador) + 8% (patronal) = 11% total. Prestadores de serviço são isentos.
   - Isenções de Subsídios: Alimentação e Transporte isentos até 30.000 Kz/mês cada.

DIRETRIZES DE COMPORTAMENTO:
1. IDENTIDADE: Apresente-se como SalIA, assistente da ILUNGI e SALYA.
2. SAUDAÇÕES: Seja humana, calorosa e educada. Responda sempre a cumprimentos antes de perguntar como pode ajudar.
3. DATA/HORA: Se perguntarem que dia ou hora é, responda directamente usando a data/hora actual fornecida acima.
4. PERGUNTAS DE PLATAFORMA: Responda em detalhe sobre como usar o SALYA (criar conta, empresa, processar salários, relatórios, etc.).
5. FORA DO ESCOPO: Recuse educadamente tópicos completamente alheios (culinária, desporto, entretenimento puro).`;

    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '');

    if (apiKey) {
      try {
        const historyContents = messages.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

        historyContents.push({
          role: 'user',
          parts: [{ text: currentInput }]
        });

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents: historyContents
          })
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error(`[SalIA] Gemini API error ${res.status}:`, errBody);
          // Mostra erro visível ao utilizador para facilitar diagnóstico
          const errMsg = errBody?.error?.message || `Erro de API (HTTP ${res.status})`;
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              sender: 'assistant',
              text: `Ocorreu um erro ao contactar a IA: ${errMsg}\n\nA usar resposta local como alternativa.`,
              timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          const botText = cleanText(candidateText);
          const botMsg: Message = {
            id: String(Date.now()),
            sender: 'assistant',
            text: botText,
            timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
          };
          setMessages((prev) => [...prev, botMsg]);
          setLoading(false);

          if (autoVoice) {
            speakText(botText, botMsg.id);
          }
          return;
        }
      } catch (err) {
        console.error('[SalIA] Erro de rede ao chamar Gemini:', err);
      }
    } else {
      console.warn('[SalIA] Sem API Key configurada — a usar fallback local.');
    }

    const lower = currentInput.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // match: basta UMA das palavras-chave aparecer na frase
    const match = (keywords: string[]) => keywords.some(k => lower.includes(k));
    // matchAll: TODAS as palavras-chave devem aparecer (para termos compostos)
    const matchAll = (keywords: string[]) => keywords.every(k => lower.includes(k));

    let responseText = '';

    if (match(['ilungi', 'quem criou', 'quem fez', 'criadora'])) {
      responseText = `A ILUNGI (https://ilungi.ao/) é a empresa angolana de tecnologia responsável pelo desenvolvimento da plataforma SALYA.\n\nEspecializada em transformação digital e software corporativo de elevada performance em Angola.\n\nContactos:\n• Website: https://ilungi.ao/\n• Email: geral@ilungi.co.ao\n• WhatsApp: +244 935 793 270`;

    } else if (match(['irt', 'imposto rendimento', 'tabela irt', 'retencao irt', 'agt', 'grupo b', 'grupo c'])) {
      responseText = `IRT — Imposto sobre Rendimentos do Trabalho (Tabela AGT 2026)\n\n• Até 100.000 Kz → Isento\n• 100.001 – 150.000 Kz → 13% (parcela a abater: 13.000 Kz)\n• 150.001 – 200.000 Kz → 16% (parcela a abater: 17.500 Kz)\n• Acima de 200.000 Kz → 18% (parcela a abater: 21.500 Kz)\n\nPrestadores de Serviço têm retenção na fonte fixa de 6,5% (IRT Grupo B/C).\nO SALYA calcula a retenção de IRT automaticamente em cada liquidação.`;

    } else if (match(['inss', 'seguranca social', 'contribuicao', 'previdencia', 'quota patronal'])) {
      responseText = `INSS — Segurança Social em Angola\n\n• 3% a cargo do Trabalhador\n• 8% a cargo da Entidade Empregadora (Quota Patronal)\n• Total: 11% sobre a massa salarial tributável\n\nPrestadores de Serviço são isentos de INSS.\nO SALYA gera a folha de remunerações e guias para a Segurança Social.`;

    } else if (match(['ferias', 'mapa de ferias', 'dias de ferias', 'gozo', 'subsidio ferias', 'dias uteis ferias'])) {
      responseText = `Férias — LGT 12/23 (Art. 170.º)\n\n• 2 dias úteis de férias por cada mês completo de trabalho (máximo de 22 dias úteis por ano).\n• Subsídio de Férias = 100% do salário base do trabalhador.\n• O SALYA gere automaticamente os dias acumulados, gozados e o mapa de férias.`;

    } else if (match(['natal', 'subsidio natal', 'decimo terceiro', '13 mes', '13o mes'])) {
      responseText = `Subsídio de Natal (13.º Mês)\n\nPago obrigatoriamente no mês de Dezembro ou no fecho de contas por rescisão:\n• Trabalhador com 12 meses de serviço = 1 Salário Base integral.\n• Trabalhador com fração de ano = (Salário Base ÷ 12) × meses trabalhados.`;

    } else if (match(['rescisao', 'despedimento', 'fecho de contas', 'desligamento', 'indenizacao', 'caducidade', 'aviso previo', 'fecho contas'])) {
      responseText = `Rescisão Contratual — LGT 12/23\n\nO fecho de contas no SALYA calcula automaticamente:\n1. Salário proporcional aos dias trabalhados no mês de saída\n2. Férias não gozadas e subsídio de férias proporcional\n3. Subsídio de Natal proporcional\n4. Compensação por caducidade ou indemnização por despedimento\n5. Dedução de INSS (3%) e IRT sobre o montante sujeito a imposto`;

    } else if (match(['contrato', 'tipos de contrato', 'modalidade', 'termo certo', 'tempo indeterminado', 'prestador'])) {
      responseText = `Tipos de Contratos de Trabalho em Angola (LGT 12/23):\n\n1. Contrato por Tempo Indeterminado — regra geral para funções permanentes.\n2. Contrato a Termo Certo — para necessidades temporárias ou projetos.\n3. Contrato a Tempo Parcial (Part-time).\n4. Contrato de Teletrabalho.\n5. Contrato de Aprendizagem / Estágio Profissional.\n6. Prestação de Serviços — regime autónomo, isento de INSS, IRT de 6,5%.`;

    } else if (match(['oi', 'ola', 'boa', 'tudo bem', 'bom dia', 'hello', 'hi', 'saudacoes', 'como vai'])) {
      responseText = `Olá! Sou a sua assistente de IA especializada em Gestão de Processamento Salarial. Como posso lhe ajudar hoje?`;

    } else if (match(['que dia', 'que horas', 'horas sao', 'data hoje', 'dia hoje', 'hoje e', 'dia e', 'hora actual', 'hora e'])) {
      const now = new Date();
      const d = now.toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const h = now.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
      responseText = `Hoje é ${d} e são ${h} (hora de Luanda).`;

    } else if (matchAll(['criar', 'conta']) || match(['registar', 'criar conta', 'como criar conta', 'vou criar conta'])) {
      responseText = `Como Criar uma Conta no SALYA:\n\n1. Aceda a https://app.salya.ao\n2. Clique em Criar Conta ou Registar\n3. Escolha o plano: Demo (7 dias grátis), Micro Empresa, Profissional ou Corporate\n4. Preencha os dados: nome da empresa, NIF, email e telefone\n5. Confirme o email de activação\n\nApós activação, pode iniciar sessão e configurar a sua empresa.`;

    } else if (matchAll(['criar', 'empresa']) || match(['nova entidade', 'configurar empresa', 'adicionar empresa'])) {
      responseText = `Como Criar uma Empresa/Entidade no SALYA:\n\n1. Após o login, aceda a Configurações > Minhas Entidades\n2. Clique em +Nova Entidade\n3. Preencha: Nome Comercial, NIF, Morada, Regime Fiscal e logotipo\n4. Configure as taxas de retenção e o regime de INSS\n5. Guarde — a empresa ficará disponível para processamento salarial\n\nPode gerir múltiplas empresas numa só conta SALYA.`;

    } else if (match(['processar', 'processamento', 'liquidacao', 'liquidar', 'calcular salario', 'salario mensal', 'folha'])) {
      responseText = `Como Processar Salários no SALYA:\n\n1. No menu lateral, clique em Processamento Salarial\n2. Seleccione o Mês e o Ano do exercício\n3. Clique em Liquidação Mensal para calcular todos os colaboradores activos\n4. Reveja IRT, INSS, subsídios e descontos gerados automaticamente\n5. Registe faltas, horas extras ou adiantamentos se necessário\n6. Clique em Confirmar para fechar o processamento\n7. Gere e descarregue os Recibos em PDF individualmente ou em massa`;

    } else if (match(['relatorio', 'exportar', 'descarregar', 'excel', 'csv', 'primavera', 'ver relatorio'])) {
      responseText = `Como Ver e Exportar Relatórios no SALYA:\n\n1. No menu lateral, clique em Relatórios\n2. Escolha o tipo:\n   • Folha de Pagamento Mensal (Excel / CSV)\n   • Mapa de Remunerações para o INSS\n   • Mapa de Retenção de IRT para a AGT\n   • Ficheiro de integração para o ERP Primavera\n   • Recibos de Vencimento em PDF (individual ou em massa)\n3. Filtre por entidade, período e colaborador\n4. Clique em Exportar ou Descarregar`;

    } else if (match(['colaborador', 'funcionario', 'trabalhador', 'adicionar', 'cadastrar', 'novo funcionario'])) {
      responseText = `Como Adicionar um Colaborador no SALYA:\n\n1. Aceda ao menu Colaboradores\n2. Clique em +Novo Colaborador\n3. Preencha: Nome, NIF, IBAN, Cargo, Data de Admissão, Salário Base e Subsídios\n4. Defina o Tipo de Contrato e o Período de Experiência\n5. Guarde — o colaborador será incluído nos próximos processamentos`;

    } else if (match(['recibo', 'contra-cheque', 'contracheque', 'pdf', 'imprimir recibo'])) {
      responseText = `Recibos de Vencimento no SALYA\n\nPermite gerar e descarregar recibos em PDF em 2 vias (Empresa e Colaborador) nos formatos A5 ou A4, com detalhe de todos os subsídios, descontos legais (IRT e INSS) e QR Code de autenticidade.`;

    } else if (match(['horas extra', 'hora extra', 'trabalho suplementar', 'trabalho noturno'])) {
      responseText = `Horas Extraordinárias — LGT 12/23 (Art. 143.º)\n\n• Dias úteis: acréscimo mínimo de +50% por hora extra\n• Finais de semana e Feriados: acréscimo de +100%\n• Limite legal: máximo 2 horas por dia e 40 horas por mês.`;

    } else if (match(['maternidade', 'paternidade', 'gravidez', 'licenca', 'aleitamento'])) {
      responseText = `Licença de Maternidade e Paternidade\n\n• Maternidade: 90 dias consecutivos com subsídio pago pela Segurança Social (INSS).\n• Paternidade: 1 dia no nascimento + 5 dias subsequentes.\n• Dispensa diária de 2 horas para aleitamento durante o primeiro ano.`;

    } else if (match(['falta', 'ausencia', 'absentismo', 'falta injustificada', 'falta justificada'])) {
      responseText = `Gestão de Faltas — LGT 12/23\n\n• Faltas Justificadas: Não implicam perda de remuneração (ex: doença com atestado, falecimento de familiar).\n• Faltas Injustificadas: Implicam desconto proporcional no salário base e no INSS.\n• No SALYA, as faltas são inseridas no módulo de Assiduidade ou no Processamento.`;

    } else if (match(['salya', 'plataforma', 'sistema', 'suporte', 'contacto', 'ajuda salya'])) {
      responseText = `Sobre o SALYA Payroll\n\nO SALYA é a plataforma líder em Angola para Gestão de Folha de Pagamento, desenvolvida pela ILUNGI. Garante conformidade total com a LGT 12/23, AGT e INSS.\n\nContactos de Suporte:\n• Email: geral@ilungi.co.ao\n• WhatsApp: +244 935 793 270`;

    } else {
      responseText = `Entendido! Posso ajudá-lo com:\n• Como processar salários ou ver relatórios no SALYA\n• Cálculo de IRT, INSS, Férias e Rescisões\n• Tipos de contratos e Legislação (LGT 12/23)\n• Como criar conta, empresa ou adicionar colaboradores\n\nPode reformular a sua pergunta ou escolher um dos atalhos acima.`;
    }

    const cleanResponse = cleanText(responseText);

    setTimeout(() => {
      const botMsg: Message = {
        id: String(Date.now()),
        sender: 'assistant',
        text: cleanResponse,
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);

      if (autoVoice) {
        speakText(cleanResponse, botMsg.id);
      }
    }, 400);
  };

  return (
    <>
      {/* Botão Flutuante de Disparo SalIA */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[90] size-14 sm:size-15 rounded-full bg-purple-700 hover:bg-purple-800 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group overflow-hidden border-2 border-purple-500/40 p-0.5"
        title="SalIA — Assistente de IA SALYA"
      >
        <img src="/salia-avatar.png" alt="SalIA Icon" className="size-full object-cover rounded-full group-hover:scale-105 transition-transform" />
        <span className="absolute -top-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-white rounded-full" />
      </button>

      {/* Painel Flutuante Responsivo SalIA */}
      {isOpen && (
        <div className="fixed bottom-[5.5rem] right-4 sm:right-6 z-[150] w-[calc(100vw-2rem)] sm:w-[440px] max-w-full h-[62vh] sm:h-[620px] max-h-[700px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom-5 duration-200 font-app">
          
          {/* Cabeçalho Corporativo com Marca SalIA */}
          <div className="p-4 px-5 bg-slate-950 text-white flex items-center justify-between shrink-0 border-b border-purple-900/40 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-purple-950 border border-purple-700/50 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/salia-avatar.png" alt="SalIA Avatar" className="size-full object-cover rounded-2xl" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight flex items-center gap-1.5 tracking-wide">
                  <span>Sal</span>
                  <span className="text-purple-400 font-extrabold text-lg">IA</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Assistente de Gestão de Folha de Salário</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Selector de Voz */}
              {availableVoices.length > 1 && (
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="text-[9px] bg-white/10 text-white border border-white/20 rounded-lg px-1.5 py-1 outline-none cursor-pointer max-w-[90px] truncate"
                  title="Escolher voz"
                >
                  {availableVoices.map(v => (
                    <option key={v.name} value={v.name} className="text-slate-900 bg-white text-[10px]">
                      {v.name.replace('Microsoft ', '').replace('Google ', '').split(' ').slice(0, 2).join(' ')}
                    </option>
                  ))}
                </select>
              )}

              {/* Botão de Leitura de Voz Automática */}
              <button
                type="button"
                onClick={() => setAutoVoice(!autoVoice)}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  autoVoice ? 'bg-emerald-500 text-white font-bold' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title={autoVoice ? 'Voz Automática Ativada' : 'Ativar Voz Automática'}
              >
                <span className="material-symbols-outlined text-lg">
                  {autoVoice ? 'volume_up' : 'volume_off'}
                </span>
              </button>

              <button
                onClick={() => {
                  if (isSpeakingId) window.speechSynthesis.cancel();
                  setIsOpen(false);
                }}
                className="text-white/70 hover:text-white p-1.5 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos */}
          <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button onClick={() => { setInput('Quem criou o Salya e o que é a ILUNGI?'); }} className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-semibold whitespace-nowrap hover:border-[#8e34eb] hover:text-[#8e34eb] transition-all">
              Sobre ILUNGI
            </button>
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
          </div>

          {/* Corpo de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                  {m.sender === 'assistant' && (
                    <img src="/salia-avatar.png" alt="SalIA" className="size-7 rounded-xl object-cover border border-purple-300/40 shrink-0 shadow-xs mb-1" />
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-xs relative group ${
                      m.sender === 'user'
                        ? 'bg-[#8e34eb] text-white rounded-br-none font-medium'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/80 rounded-bl-none font-normal'
                    }`}
                  >
                    <p className="whitespace-pre-line">{cleanText(m.text)}</p>

                    {/* Ícone de Leitura por Voz para mensagens da SalIA */}
                    {m.sender === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => speakText(m.text, m.id)}
                        className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 text-[10px] text-[#8e34eb] dark:text-purple-300 font-semibold hover:opacity-80 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isSpeakingId === m.id ? 'volume_off' : 'volume_up'}
                        </span>
                        <span>{isSpeakingId === m.id ? 'Parar leitura' : 'Ouvir resposta'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 w-fit text-slate-400">
                <img src="/salia-avatar.png" alt="SalIA" className="size-5 rounded-lg object-cover animate-pulse" />
                <span className="text-[11px] font-medium">SalIA está a analisar...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form de Envio com Microfone e Digitação */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            {/* Botão de Microfone (Speech-to-Text) */}
            <button
              type="button"
              onClick={toggleListening}
              className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isListening ? 'A escutar... clique para parar' : 'Falar por Voz (Microfone)'}
            >
              <span className="material-symbols-outlined text-lg">
                {isListening ? 'mic_off' : 'mic'}
              </span>
            </button>

            <input
              type="text"
              placeholder={isListening ? 'A escutar a sua voz...' : 'Escreva ou fale a sua dúvida à SalIA...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium outline-none transition-all text-slate-800 dark:text-slate-100 ${
                isListening ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-200 dark:border-slate-700 focus:border-[#8e34eb]'
              }`}
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

