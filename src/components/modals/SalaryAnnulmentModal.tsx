import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface SalaryAnnulmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (justificacao: string) => Promise<void>;
  salarioInfo?: {
    numeroColaborador: string;
    nomeColaborador: string;
    mes: string;
    salarioBase: number;
  };
  loading?: boolean;
}

export default function SalaryAnnulmentModal({
  isOpen,
  onClose,
  onSubmit,
  salarioInfo,
  loading = false
}: SalaryAnnulmentModalProps) {
  const [justificacao, setJustificacao] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError("");

    if (!justificacao.trim()) {
      setError("Justificação é obrigatória");
      return;
    }

    if (justificacao.trim().length < 20) {
      setError("Justificação deve ter pelo menos 20 caracteres");
      return;
    }

    try {
      await onSubmit(justificacao);
      setJustificacao("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao anular salário");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Anular Salário em Atraso</h2>
              <p className="text-xs text-slate-500 mt-1">Ação irreversível com registro de auditoria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Info do Salário */}
        {salarioInfo && (
          <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Colaborador:</span>
              <span className="font-semibold">{salarioInfo.nomeColaborador}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Nº Colaborador:</span>
              <span className="font-mono font-semibold">{salarioInfo.numeroColaborador}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Período:</span>
              <span className="font-semibold">{salarioInfo.mes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Salário Base:</span>
              <span className="font-semibold text-green-600">
                {salarioInfo.salarioBase.toFixed(2)} AOA
              </span>
            </div>
          </div>
        )}

        {/* Alert */}
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <p className="text-xs text-red-700">
            ⚠️ Esta ação registará um log de auditoria permanente com a justificação fornecida.
          </p>
        </div>

        {/* Justificação */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Justificação para Anulamento
            <span className="text-red-600">*</span>
          </label>
          <textarea
            value={justificacao}
            onChange={(e) => {
              setJustificacao(e.target.value);
              setError("");
            }}
            placeholder="Explique por que este salário está sendo anulado (mínimo 20 caracteres)..."
            className="w-full p-3 border border-slate-200 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
            rows={4}
          />
          <div className="flex justify-between items-center text-xs">
            <span className={justificacao.length < 20 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
              {justificacao.length}/20 caracteres mínimo
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || justificacao.trim().length < 20}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            {loading ? "Processando..." : "Confirmar Anulamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
