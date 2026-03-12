import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Colaborador } from '../types';

const Colaboradores: React.FC = () => {
  const { colaboradores, setColaboradores, empresaId, showConfirm } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ativo' | 'Afastado'>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<Partial<Colaborador>>({
    nome: '',
    numeroColaborador: '',
    nif: '',
    inss: '',
    cargo: '',
    tipoContrato: 'Contrato por Tempo Indeterminado',
    salarioBase: 0,
    status: 'Ativo',
    email: '',
    iban: '',
    dataAdmissao: new Date().toISOString().split('T')[0]
  });

  const filteredColaboradores = colaboradores.filter(c => {
    const isFromCompany = c.empresaId === empresaId;
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (c.nif && c.nif.includes(searchTerm)) || (c.cargo && c.cargo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'All' ? true : c.status === filter;
    return isFromCompany && matchesSearch && matchesFilter;
  });

  const handleOpenModal = (colab?: Colaborador) => {
    if (colab) {
      setEditingId(colab.id);
      setFormData(colab);
    } else {
      setEditingId(null);
      setFormData({
        nome: '', 
        numeroColaborador: '', 
        nif: '', 
        inss: '', 
        cargo: '', 
        tipoContrato: 'Contrato por Tempo Indeterminado', 
        salarioBase: 0, 
        status: 'Ativo', 
        email: '', 
        dataAdmissao: new Date().toISOString().split('T')[0],
        empresaId: empresaId || undefined
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSave = { ...formData, empresaId: empresaId || undefined };
    
    if (!editingId) {
      const year = dataToSave.dataAdmissao ? new Date(dataToSave.dataAdmissao).getFullYear() : new Date().getFullYear();
      const cargoAbrev = (dataToSave.cargo || 'FUNC').substring(0, 3).toUpperCase();
      const companyColabs = colaboradores.filter(c => c.empresaId === empresaId);
      const sequence = companyColabs.length + 1;
      dataToSave.numeroColaborador = `${year}${cargoAbrev}${sequence}`;
      
      const newColab = { ...dataToSave, id: Date.now() } as Colaborador;
      setColaboradores([...colaboradores, newColab]);
    } else {
      setColaboradores(colaboradores.map(c => c.id === editingId ? { ...c, ...dataToSave } as Colaborador : c));
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    const colab = colaboradores.find(c => c.id === id);
    if (!colab) return;

    showConfirm({
      title: 'Remover Colaborador',
      text: `Tem a certeza que deseja eliminar o colaborador "${colab.nome}"? Esta acção removerá todos os registros associados.`,
      onConfirm: () => {
        setColaboradores(colaboradores.filter(c => c.id !== id));
      }
    });
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight">Colaboradores</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie informações, contratos e status da sua equipe.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Novo Cadastro
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 w-full max-w-md items-center gap-3">
            <div className="relative w-full group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-all" 
                placeholder="Pesquisar por nome, NIF ou cargo..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFilter('All')} className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-wider border ${filter === 'All' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-500 border-slate-200'} transition-all`}>
              Todos
            </button>
            <button onClick={() => setFilter('Ativo')} className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-wider border ${filter === 'Ativo' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'} transition-all`}>
              Ativos
            </button>
            <button onClick={() => setFilter('Afastado')} className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-wider border ${filter === 'Afastado' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-500 border-slate-200'} transition-all`}>
              Afastados
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrato / NIF</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salário Base</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredColaboradores.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{c.nome.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{c.nome}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{c.cargo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.tipoContrato}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.nif}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-primary">{(c.salarioBase || 0).toLocaleString()} Kz</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenModal(c)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredColaboradores.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">person_off</span>
              <p className="text-slate-400 text-sm font-medium">Nenhum colaborador encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-black text-white">
              <h3 className="text-lg font-black uppercase tracking-widest">{editingId ? 'Editar Cadastro' : 'Novo Colaborador'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="size-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo / Função</label>
                  <input required type="text" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIF</label>
                  <input required type="text" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Salário Base (Kz)</label>
                  <input required type="number" value={formData.salarioBase} onChange={e => setFormData({...formData, salarioBase: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-black text-primary" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Admissão</label>
                  <input required type="date" value={formData.dataAdmissao} onChange={e => setFormData({...formData, dataAdmissao: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">IBAN</label>
                  <input required type="text" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-mono text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-bold">
                    <option value="Ativo">Ativo</option>
                    <option value="Afastado">Afastado</option>
                  </select>
                </div>
              </div>
              <div className="mt-10 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">Finalizar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colaboradores;
