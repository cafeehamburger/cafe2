import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, DollarSign, CheckCircle2 } from 'lucide-react';
import type { CategoriaFinanceira, ItemCardapio, VendaCardapio } from '../types';
import { formatarMoeda } from '../utils/format';

interface ModalRegistrarVendaProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemCardapio | null;
  categoriaAtiva: CategoriaFinanceira;
  dataPadrao?: string; // YYYY-MM-DD
  onSalvarVenda: (venda: Omit<VendaCardapio, 'id'>) => Promise<void>;
}

export const ModalRegistrarVenda: React.FC<ModalRegistrarVendaProps> = ({
  isOpen,
  onClose,
  item,
  categoriaAtiva,
  dataPadrao,
  onSalvarVenda,
}) => {
  const hoje = new Date().toISOString().split('T')[0];
  const [quantidade, setQuantidade] = useState<number>(1);
  const [data, setData] = useState(dataPadrao || hoje);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (!isOpen || !item) return null;

  const valorTotal = quantidade * item.preco;

  const handleIncrement = (qtd: number) => {
    setQuantidade((prev) => Math.max(1, prev + qtd));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (quantidade <= 0) {
      setErro('A quantidade deve ser de pelo menos 1 unidade.');
      return;
    }

    setLoading(true);
    try {
      const agora = new Date();
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await onSalvarVenda({
        itemId: item.id,
        itemNome: item.nome,
        quantidade,
        precoUnitario: item.preco,
        valorTotal,
        categoria: categoriaAtiva,
        data: data || hoje,
        hora,
      });

      setQuantidade(1);
      onClose();
    } catch (err) {
      console.error(err);
      setErro('Erro ao registrar venda do item.');
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
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isCafe
              ? 'bg-gradient-to-r from-emerald-900 via-stone-900 to-amber-950'
              : 'bg-gradient-to-r from-emerald-900 via-stone-900 to-orange-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Lançar Venda do Item</h3>
              <p className="text-xs text-stone-300">
                {isCafe ? '☕ Café (Manhã)' : '🍔 Hamburgueria (Noite)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Item Info Box */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Item Selecionado
              </span>
              <h4 className="text-base font-bold text-stone-900">{item.nome}</h4>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-500 block">Preço Unitário</span>
              <span className="text-base font-black text-emerald-700">
                {formatarMoeda(item.preco)}
              </span>
            </div>
          </div>

          {/* Quantity Controls */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Quantidade de Vendas
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleIncrement(-1)}
                className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus size={18} />
              </button>

              <input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 h-11 text-center font-black text-xl text-stone-900 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none"
              />

              <button
                type="button"
                onClick={() => handleIncrement(1)}
                className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center justify-between gap-1.5 mt-2">
              {[1, 2, 5, 10, 20].map((qtd) => (
                <button
                  key={qtd}
                  type="button"
                  onClick={() => setQuantidade(qtd)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                    quantidade === qtd
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  +{qtd}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Data da Venda
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
            />
          </div>

          {/* Subtotal Preview */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              Total da Venda ({quantidade}x):
            </span>
            <span className="text-xl font-black text-emerald-800">
              {formatarMoeda(valorTotal)}
            </span>
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
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{loading ? 'Registrando...' : `Confirmar Entrada (+ ${formatarMoeda(valorTotal)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
