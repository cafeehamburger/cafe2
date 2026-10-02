import React, { useState } from 'react';
import { X, ArrowDownCircle, DollarSign, Calendar } from 'lucide-react';
import type { CategoriaFinanceira, SaidaDespesa } from '../types';

interface ModalNovaSaidaProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaAtiva: CategoriaFinanceira;
  dataPadrao?: string; // YYYY-MM-DD
  onSalvarSaida: (saida: Omit<SaidaDespesa, 'id'>) => Promise<void>;
}

export const ModalNovaSaida: React.FC<ModalNovaSaidaProps> = ({
  isOpen,
  onClose,
  categoriaAtiva,
  dataPadrao,
  onSalvarSaida,
}) => {
  const hoje = new Date().toISOString().split('T')[0];
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(dataPadrao || hoje);
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!descricao.trim()) {
      setErro('Por favor informe a descrição da saída/despesa.');
      return;
    }

    const valorParsed = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorParsed) || valorParsed <= 0) {
      setErro('Por favor informe um valor válido maior que zero.');
      return;
    }

    setLoading(true);
    try {
      const agora = new Date();
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await onSalvarSaida({
        descricao: descricao.trim(),
        valor: valorParsed,
        categoria: categoriaAtiva,
        data: data || hoje,
        observacao: observacao.trim() || undefined,
        hora,
      });

      setDescricao('');
      setValor('');
      setObservacao('');
      onClose();
    } catch (err) {
      console.error(err);
      setErro('Erro ao registrar saída de caixa.');
    } finally {
      setLoading(false);
    }
  };

  const isCafe = categoriaAtiva === 'Café';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-rose-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-rose-300">
              <ArrowDownCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-50">Lançar Saída / Despesa</h3>
              <p className="text-xs text-rose-200/80">
                Caixa de {isCafe ? '☕ Café (Manhã)' : '🍔 Hamburgueria (Noite)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Descrição da Despesa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Compra de leite/café, gás, sacolas, manutenção..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:border-red-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Valor da Saída (R$) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                  R$
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-bold focus:bg-white focus:border-red-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Data do Lançamento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-xs font-medium focus:bg-white focus:border-red-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Observações / Comprovante (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Pago via PIX, nota fiscal nº 123..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-xs focus:bg-white focus:border-red-600 outline-none resize-none"
            />
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {erro}
            </p>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-red-700 hover:bg-red-800 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowDownCircle size={14} />
              <span>{loading ? 'Salvando...' : 'Confirmar Saída do Caixa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
