import React from 'react';
import { faltaBonus } from '../data/mockData';

const FaltasBonus: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-2">Faltas e Bónus</h1>
      <p className="text-slate-500 mb-8">Gerencie lançamentos de horas extras, bónus e falta.</p>
      
      <div className="bg-white rounded-xl border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500">Colaborador</th>
              <th className="p-4 text-xs font-bold text-slate-500">Tipo</th>
              <th className="p-4 text-xs font-bold text-slate-500">Valor/Horas</th>
              <th className="p-4 text-xs font-bold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {faltaBonus.map(f => (
              <tr key={f.id}>
                <td className="p-4 font-medium">{f.colaborador}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    f.tipo === 'Hora Extra' ? 'bg-blue-100 text-blue-700' :
                    f.tipo === 'Bónus' ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
                  }`}>{f.tipo}</span>
                </td>
                <td className="p-4 font-medium">{typeof f.valor === 'number' && f.valor > 100 ? f.valor.toLocaleString() + ' Kz' : f.valor + 'h'}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    f.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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

export default FaltasBonus;
