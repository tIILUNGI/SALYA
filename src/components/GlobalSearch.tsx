import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'Páginas' | 'Colaboradores' | 'Empresas' | 'Ações';
  icon: string;
  action: () => void;
}

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const { colaboradores, empresas, setEmpresa, setEmpresaId } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Ctrl+K atalho
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Static pages and actions
  const staticItems: SearchResult[] = useMemo(() => [
    {
      id: 'page_dashboard',
      title: 'Dashboard',
      description: 'Ver visão geral do sistema',
      category: 'Páginas',
      icon: 'dashboard',
      action: () => { navigate('/dashboard'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'page_colab',
      title: 'Colaboradores',
      description: 'Gestão de trabalhadores',
      category: 'Páginas',
      icon: 'group',
      action: () => { navigate('/colaboradores'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'page_proc',
      title: 'Processamento Salarial',
      description: 'Efectuar liquidação mensal',
      category: 'Páginas',
      icon: 'payments',
      action: () => { navigate('/processamento'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'page_proc_atraso',
      title: 'Salários em Atraso',
      description: 'Gerir pagamentos pendentes',
      category: 'Páginas',
      icon: 'history',
      action: () => { navigate('/processamento-atraso'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'page_relat',
      title: 'Relatórios',
      description: 'Exportar mapas e guias',
      category: 'Páginas',
      icon: 'assessment',
      action: () => { navigate('/relatorios'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'page_config',
      title: 'Configurações',
      description: 'Definições do sistema e empresa',
      category: 'Páginas',
      icon: 'settings',
      action: () => { navigate('/configuracoes'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'page_profile',
      title: 'O Meu Perfil',
      description: 'Editar dados da conta',
      category: 'Páginas',
      icon: 'person',
      action: () => { navigate('/profile'); setIsFocused(false); setQuery(''); }
    },
    {
      id: 'action_new_colab',
      title: 'Adicionar Colaborador',
      description: 'Cadastrar novo funcionário',
      category: 'Ações',
      icon: 'person_add',
      action: () => { navigate('/colaboradores'); setIsFocused(false); setQuery(''); }
    }
  ], [navigate]);

  const filteredResults = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    const results: SearchResult[] = [];

    // 1. Pages & Actions
    staticItems.forEach(item => {
      if (item.title.toLowerCase().includes(lowerQuery) || item.description.toLowerCase().includes(lowerQuery)) {
        results.push(item);
      }
    });

    // 2. Colaboradores
    colaboradores.forEach(colab => {
      if (colab.nome.toLowerCase().includes(lowerQuery) || (colab.cargo || '').toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `colab_${colab.id}`,
          title: colab.nome,
          description: colab.cargo || 'Colaborador',
          category: 'Colaboradores',
          icon: 'person',
          action: () => { navigate('/colaboradores'); setIsFocused(false); setQuery(''); }
        });
      }
    });

    // 3. Empresas
    empresas.forEach(emp => {
      if (emp.nome.toLowerCase().includes(lowerQuery) || emp.nif.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `emp_${emp.id}`,
          title: emp.nome,
          description: `${emp.categoria === 'Particular' ? 'Nº BI/Passaporte' : 'NIF'}: ${emp.nif}`,
          category: 'Empresas',
          icon: 'apartment',
          action: () => { setEmpresa(emp); setEmpresaId(emp.id); setIsFocused(false); setQuery(''); }
        });
      }
    });

    return results.slice(0, 8); // Limit results for better UI
  }, [query, staticItems, colaboradores, empresas, navigate, setEmpresa, setEmpresaId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(filteredResults.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(filteredResults.length, 1)) % Math.max(filteredResults.length, 1));
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      } else if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, filteredResults, selectedIndex]);

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center flex-1 max-w-md mx-6">
      <div className={`w-full flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${isFocused ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-100 dark:hover:bg-slate-700/50'} rounded-xl transition-all`}>
        <div className="flex items-center gap-3 flex-1">
          <span className={`material-symbols-outlined text-xl transition-colors ${isFocused ? 'text-primary' : 'text-slate-400'}`}>search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Pesquisar por tudo... (Ctrl+K)"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 w-full focus:ring-0"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        {!isFocused && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm uppercase">Ctrl</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm uppercase">K</span>
          </div>
        )}
      </div>

      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] flex flex-col">

        <div className="max-h-[min(60vh,450px)] overflow-y-auto p-4 custom-scrollbar">
          {!query ? (
            <div className="py-8 text-center">
              <div className="size-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-slate-300 text-3xl">manage_search</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Comece a digitar para pesquisar...</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 px-8">
                {['Dashboard', 'Colaboradores', 'Recibos', 'Configurações'].map(tip => (
                  <button 
                    key={tip}
                    onClick={() => setQuery(tip)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-primary/5 hover:text-primary rounded-xl text-xs font-semibold text-slate-500 transition-all border border-slate-100 dark:border-slate-700"
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-slate-200 text-5xl mb-3">sentiment_dissatisfied</span>
              <p className="text-slate-500 dark:text-slate-400">Nenhum resultado encontrado para "{query}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {['Páginas', 'Colaboradores', 'Empresas', 'Ações'].map(category => {
                const results = filteredResults.filter(r => r.category === category);
                if (results.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h3 className="px-3 text-[10px] font-bold text-slate-400">{category}</h3>
                    <div className="space-y-1">
                      {results.map((result) => {
                        const globalIndex = filteredResults.indexOf(result);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <button
                            key={result.id}
                            onClick={result.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left ${
                              isSelected 
                                ? 'bg-primary/10 border-primary/20 shadow-sm' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}>
                              <span className="material-symbols-outlined text-lg">{result.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                                {result.title}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{result.description}</p>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-primary/50 text-xl">keyboard_return</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
