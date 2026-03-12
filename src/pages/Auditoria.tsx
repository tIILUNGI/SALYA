import React from 'react';
import { auditoria } from '../data/mockData';

const Auditoria: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-2">Relatórios de Auditoria</h1>
      <p className="text-slate-500 mb-8">Logs de auditoria e controle interno.</p>
      <div className="bg-white rounded-xl border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500">Data/Hora</th>
              <th className="p-4 text-xs font-bold text-slate-500">Usuário</th>
              <th className="p-4 text-xs font-bold text-slate-500">Ação</th>
              <th className="p-4 text-xs font-bold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditoria.map(a => (
              <tr key={a.id}>
                <td className="p-4 text-sm">{a.data}</td>
                <td className="p-4 font-medium">{a.usuario}</td>
                <td className="p-4">{a.acao}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    a.status === 'Sucesso' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Auditoria;
