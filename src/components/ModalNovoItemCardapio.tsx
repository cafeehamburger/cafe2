import React, { useState } from 'react';
import { X, Utensils, DollarSign, Sparkles } from 'lucide-react';
import type { CategoriaFinanceira, ItemCardapio } from '../types';

interface ModalNovoItemCardapioProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaAtiva: CategoriaFinanceira;
  onSalvarItem: (item: Omit<ItemCardapio, 'id'>) => Promise<void>;
}

export const ModalNovoItemCardapio: React.FC<ModalNovoItemCardapioProps> = ({
  isOpen,
  onClose,
  categoriaAtiva,
  onSalvarItem,
}) => {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) {
      setErro('Por favor informe o nome do item.');
      return;
    }

    const valorParsed = parseFloat(preco.replace(',', '.'));
    if (isNaN(valorParsed) || valorParsed <= 0) {
      setErro('Por favor informe um preço válido maior que zero.');
      return;
    }

    setLoading(true);
    try {
      await onSalvarItem({
        nome: nome.trim(),
        preco: valorParsed,
        categoria: categoriaAtiva,
      });
      setNome('');
      setPreco('');
      onClose();
    } catch (err) {
      console.error(err);
      setErro('Erro ao cadastrar o item no cardápio.');
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
              ? 'bg-gradient-to-r from-stone-900 via-amber-950 to-amber-900'
              : 'bg-gradient-to-r from-stone-900 via-orange-950 to-orange-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Utensils size={18} className="text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-50">Novo Item do Cardápio</h3>
              <p className="text-xs text-amber-200/80">
                Aba {isCafe ? '☕ Café (Manhã)' : '🍔 Hamburgueria (Noite)'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Nome do Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={isCafe ? 'Ex: Café Espresso, Pão de Queijo, Cappuccino' : 'Ex: Smash Burger, Batata Frita, Suco'}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:border-amber-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Preço Unitário de Venda (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                R$
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-bold focus:bg-white focus:border-amber-600 outline-none"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Valor cobrado por cada unidade nas vendas do dia.
            </p>
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
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                isCafe
                  ? 'bg-amber-800 hover:bg-amber-900'
                  : 'bg-orange-700 hover:bg-orange-800'
              }`}
            >
              <Sparkles size={14} />
              <span>{loading ? 'Salvando...' : 'Adicionar ao Cardápio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
