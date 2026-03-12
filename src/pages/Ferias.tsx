import React from 'react';
import { ferias } from '../data/mockData';

const Ferias: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-2">Gestão de Férias</h1>
      <p className="text-slate-500 mb-8">Gerencie pedidos e controle de férias dos colaboradores.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <span className="material-symbols-outlined text-amber-500">beach_access</span>
          <p className="text-3xl font-bold mt-2">5</p>
          <p className="text-sm text-slate-500">Férias Agendadas</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <span className="material-symbols-outlined text-blue-500">pending</span>
          <p className="text-3xl font-bold mt-2">3</p>
          <p className="text-sm text-slate-500">Pendentes</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <span className="material-symbols-outlined text-emerald-500">check_circle</span>
          <p className="text-3xl font-bold mt-2">12</p>
          <p className="text-sm text-slate-500">Gozadas este Ano</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500">Colaborador</th>
              <th className="p-4 text-xs font-bold text-slate-500">Período</th>
              <th className="p-4 text-xs font-bold text-slate-500">Dias</th>
              <th className="p-4 text-xs font-bold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ferias.map(f => (
              <tr key={f.id}>
                <td className="p-4 font-medium">{f.colaborador}</td>
                <td className="p-4">{f.inicio} - {f.fim}</td>
                <td className="p-4">{f.dias} dias</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    f.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                    f.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ferias;
