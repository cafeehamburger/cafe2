import React, { useState, useMemo } from 'react';
import {
  Utensils,
  ArrowDownCircle,
  Plus,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import type {
  CategoriaFinanceira,
  ItemCardapio,
  VendaCardapio,
  SaidaDespesa,
  ReceitaLancamento,
  Colaborador,
} from '../types';
import { formatarMoeda } from '../utils/format';
import { ModalNovoItemCardapio } from './ModalNovoItemCardapio';
import { ModalNovaSaida } from './ModalNovaSaida';
import { ModalRegistrarVenda } from './ModalRegistrarVenda';

interface FluxoCaixaTurnoProps {
  categoriaAtiva: CategoriaFinanceira;
  itensCardapio: ItemCardapio[];
  vendasCardapio: VendaCardapio[];
  saidasDespesas: SaidaDespesa[];
  receitas: ReceitaLancamento[];
  colaboradores: Colaborador[];
  onAddItemCardapio: (item: Omit<ItemCardapio, 'id'>) => Promise<void>;
  onDeleteItemCardapio: (id: string) => Promise<void>;
  onAddVendaCardapio: (venda: Omit<VendaCardapio, 'id'>) => Promise<void>;
  onDeleteVendaCardapio: (id: string) => Promise<void>;
  onAddSaidaDespesa: (saida: Omit<SaidaDespesa, 'id'>) => Promise<void>;
  onDeleteSaidaDespesa: (id: string) => Promise<void>;
}

export const FluxoCaixaTurno: React.FC<FluxoCaixaTurnoProps> = ({
  categoriaAtiva,
  itensCardapio,
  vendasCardapio,
  saidasDespesas,
  receitas,
  colaboradores,
  onAddItemCardapio,
  onDeleteItemCardapio,
  onAddVendaCardapio,
  onDeleteVendaCardapio,
  onAddSaidaDespesa,
  onDeleteSaidaDespesa,
}) => {
  const hojeIso = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState<string>(hojeIso);
  const [modalNovoItemAberto, setModalNovoItemAberto] = useState(false);
  const [modalNovaSaidaAberto, setModalNovaSaidaAberto] = useState(false);
  const [itemParaVenda, setItemParaVenda] = useState<ItemCardapio | null>(null);
  const [abaExtrato, setAbaExtrato] = useState<'todos' | 'vendas' | 'funcionarios' | 'saidas'>('todos');
  const [cardapioExpandido, setCardapioExpandido] = useState(true);

  const isCafe = categoriaAtiva === 'Café';

  // Format selected date to DD/MM/AAAA for matching PagamentoParcial.data
  const dataPtBr = useMemo(() => {
    if (!dataSelecionada) return '';
    const parts = dataSelecionada.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
  }, [dataSelecionada]);

  // Itens do cardápio da categoria ativa
  const itensDoTurno = useMemo(() => {
    return itensCardapio.filter((item) => (item.categoria || 'Café') === categoriaAtiva);
  }, [itensCardapio, categoriaAtiva]);

  // Vendas do dia na categoria ativa
  const vendasDoDia = useMemo(() => {
    return vendasCardapio.filter((v) => {
      const isCat = (v.categoria || 'Café') === categoriaAtiva;
      const isData = v.data === dataSelecionada;
      return isCat && isData;
    });
  }, [vendasCardapio, categoriaAtiva, dataSelecionada]);

  // Total de vendas do dia
  const totalVendasDia = useMemo(() => {
    return vendasDoDia.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
  }, [vendasDoDia]);

  // Saídas / Despesas do dia na categoria ativa
  const saidasDoDia = useMemo(() => {
    return saidasDespesas.filter((s) => {
      const isCat = (s.categoria || 'Café') === categoriaAtiva;
      const isData = s.data === dataSelecionada;
      return isCat && isData;
    });
  }, [saidasDespesas, categoriaAtiva, dataSelecionada]);

  // Total de saídas do dia
  const totalSaidasDia = useMemo(() => {
    return saidasDoDia.reduce((acc, s) => acc + (s.valor || 0), 0);
  }, [saidasDoDia]);

  // Pagamentos de colaboradores efetuados no dia na categoria ativa
  const pagamentosColabsDoDia = useMemo(() => {
    const lista: {
      id: string;
      colabNome: string;
      tituloLancamento: string;
      valor: number;
      obs?: string;
    }[] = [];

    receitas.forEach((r) => {
      if ((r.categoria || 'Café') !== categoriaAtiva) return;
      const colab = colaboradores.find((c) => c.id === r.colabId || c.id === r.utilizadorId);
      const colabNome = colab ? colab.nome : 'Colaborador';

      const pgs = r.pagamentos || r.historicoPagamentos || [];
      pgs.forEach((p, idx) => {
        // Compare with both DD/MM/YYYY and YYYY-MM-DD
        if (p.data === dataPtBr || p.data === dataSelecionada) {
          lista.push({
            id: `${r.id}_pg_${idx}`,
            colabNome,
            tituloLancamento: r.titulo,
            valor: p.valor,
            obs: p.obs || p.observacao,
          });
        }
      });
    });

    return lista;
  }, [receitas, colaboradores, categoriaAtiva, dataPtBr, dataSelecionada]);

  // Total pago a funcionários no dia
  const totalPagoColabsDia = useMemo(() => {
    return pagamentosColabsDoDia.reduce((acc, p) => acc + (p.valor || 0), 0);
  }, [pagamentosColabsDoDia]);

  // Saldo em caixa do dia = Vendas - Pagamentos Funcionários - Saídas
  const saldoCaixaDia = totalVendasDia - totalPagoColabsDia - totalSaidasDia;

  // Mapa de quantidades vendidas por item no dia selecionado
  const mapaVendasItem = useMemo(() => {
    const map: Record<string, { qtd: number; total: number }> = {};
    vendasDoDia.forEach((v) => {
      if (!map[v.itemId]) {
        map[v.itemId] = { qtd: 0, total: 0 };
      }
      map[v.itemId].qtd += v.quantidade;
      map[v.itemId].total += v.valorTotal;
    });
    return map;
  }, [vendasDoDia]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden mb-6">
      {/* Top Header with Gradient */}
      <div
        className={`p-4 sm:p-5 text-white ${
          isCafe
            ? 'bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900'
            : 'bg-gradient-to-r from-stone-900 via-orange-950 to-stone-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isCafe ? 'bg-amber-600/30 text-amber-200' : 'bg-orange-600/30 text-orange-200'
              }`}
            >
              <DollarSign size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-stone-100">
                  Fluxo de Caixa do Turno
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isCafe
                      ? 'bg-amber-800/80 text-amber-200 border border-amber-600/40'
                      : 'bg-orange-800/80 text-orange-200 border border-orange-600/40'
                  }`}
                >
                  {isCafe ? '☕ Café (Manhã)' : '🍔 Hamburgueria (Noite)'}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Entradas por item do cardápio, pagamentos à equipe e controle de despesas.
              </p>
            </div>
          </div>

          {/* Action Buttons for the active tab (Cafe or Hamburguer) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalNovoItemAberto(true)}
              className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Utensils size={15} />
              <span>Novo Item do Cardápio</span>
            </button>

            <button
              type="button"
              onClick={() => setModalNovaSaidaAberto(true)}
              className="py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowDownCircle size={15} />
              <span>Lançar Saída / Despesa</span>
            </button>
          </div>
        </div>

        {/* Date Selector & Fast Actions Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-300 font-medium flex items-center gap-1">
              <Calendar size={14} className="text-amber-400" />
              <span>Data do Caixa:</span>
            </span>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-semibold text-xs outline-none focus:border-amber-400 cursor-pointer"
            />
            {dataSelecionada !== hojeIso && (
              <button
                type="button"
                onClick={() => setDataSelecionada(hojeIso)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
              >
                Voltar para Hoje
              </button>
            )}
          </div>

          <div className="text-[11px] text-stone-300">
            Visualizando dados de: <strong>{dataPtBr || dataSelecionada}</strong>
          </div>
        </div>
      </div>

      {/* Main KPI Summary Grid for the Day */}
      <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Entradas (Vendas de Itens) */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Vendas do Cardápio</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <ShoppingBag size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-700">
              +{formatarMoeda(totalVendasDia)}
            </p>
            <span className="text-[11px] text-stone-500 mt-1 block">
              {vendasDoDia.length} lançamento(s) de venda
            </span>
          </div>

          {/* Card 2: Pagamentos a Funcionários */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600" />
            <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Pago à Equipe</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Users size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-900">
              -{formatarMoeda(totalPagoColabsDia)}
            </p>
            <span className="text-[11px] text-stone-500 mt-1 block">
              {pagamentosColabsDoDia.length} repasse(s) pago(s) hoje
            </span>
          </div>

          {/* Card 3: Saídas / Despesas */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Saídas / Despesas</span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <ArrowDownCircle size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-700">
              -{formatarMoeda(totalSaidasDia)}
            </p>
            <span className="text-[11px] text-stone-500 mt-1 block">
              {saidasDoDia.length} despesa(s) lançada(s)
            </span>
          </div>

          {/* Card 4: Saldo em Caixa do Dia */}
          <div
            className={`p-4 rounded-xl border shadow-2xs relative overflow-hidden ${
              saldoCaixaDia >= 0
                ? 'bg-emerald-50/70 border-emerald-300'
                : 'bg-red-50/70 border-red-300'
            }`}
          >
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                saldoCaixaDia >= 0 ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            />
            <div className="flex items-center justify-between text-stone-600 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Saldo em Caixa do Dia</span>
              <div
                className={`p-1.5 rounded-lg ${
                  saldoCaixaDia >= 0
                    ? 'bg-emerald-200/60 text-emerald-800'
                    : 'bg-red-200/60 text-red-800'
                }`}
              >
                {saldoCaixaDia >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            </div>
            <p
              className={`text-xl sm:text-2xl font-black ${
                saldoCaixaDia >= 0 ? 'text-emerald-900' : 'text-red-900'
              }`}
            >
              {formatarMoeda(saldoCaixaDia)}
            </p>
            <span className="text-[11px] font-semibold text-stone-600 mt-1 block">
              {saldoCaixaDia >= 0 ? '✓ Caixa positivo' : '⚠️ Saldo negativo no dia'}
            </span>
          </div>
        </div>
      </div>

      {/* Section: Itens do Cardápio & Lançamento de Vendas */}
      <div className="p-4 sm:p-5 border-b border-stone-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Utensils size={16} className={isCafe ? 'text-amber-700' : 'text-orange-600'} />
              <span>Itens do Cardápio ({isCafe ? 'Café' : 'Hamburgueria'})</span>
            </h4>
            <span className="text-xs bg-stone-100 text-stone-600 font-semibold px-2 py-0.5 rounded-full">
              {itensDoTurno.length} {itensDoTurno.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalNovoItemAberto(true)}
              className="text-xs text-amber-900 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
            >
              <Plus size={13} />
              <span>Cadastrar Item</span>
            </button>

            <button
              type="button"
              onClick={() => setCardapioExpandido(!cardapioExpandido)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title={cardapioExpandido ? 'Recolher' : 'Expandir'}
            >
              {cardapioExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {cardapioExpandido && (
          <>
            {itensDoTurno.length === 0 ? (
              <div className="text-center py-6 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                <Utensils size={28} className="mx-auto text-stone-400 mb-2" />
                <p className="text-xs text-stone-600 font-medium">
                  Nenhum item cadastrado no cardápio de {categoriaAtiva}.
                </p>
                <button
                  type="button"
                  onClick={() => setModalNovoItemAberto(true)}
                  className="mt-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  + Cadastrar Primeiro Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {itensDoTurno.map((item) => {
                  const dadosVendaHoje = mapaVendasItem[item.id] || { qtd: 0, total: 0 };
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-amber-400 transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h5 className="font-bold text-xs text-stone-900 leading-snug">
                            {item.nome}
                          </h5>
                          <button
                            type="button"
                            onClick={() => onDeleteItemCardapio(item.id)}
                            title="Remover item do cardápio"
                            className="text-stone-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-base font-black text-emerald-700">
                            {formatarMoeda(item.preco)}
                          </span>
                          <span className="text-[11px] text-stone-500">cada</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-stone-500 leading-tight">
                          Hoje:{' '}
                          <strong className="text-stone-800">
                            {dadosVendaHoje.qtd}x ({formatarMoeda(dadosVendaHoje.total)})
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => setItemParaVenda(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Lançar Venda</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Section: Extrato / Movimentações do Dia */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Receipt size={14} className="text-stone-500" />
            <span>Extrato de Movimentações do Dia ({dataPtBr || dataSelecionada})</span>
          </h4>

          {/* Filters for transactions */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAbaExtrato('todos')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                abaExtrato === 'todos'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setAbaExtrato('vendas')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                abaExtrato === 'vendas'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Vendas ({vendasDoDia.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaExtrato('funcionarios')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                abaExtrato === 'funcionarios'
                  ? 'bg-white text-amber-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Equipe ({pagamentosColabsDoDia.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaExtrato('saidas')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                abaExtrato === 'saidas'
                  ? 'bg-white text-rose-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Saídas ({saidasDoDia.length})
            </button>
          </div>
        </div>

        {/* Unified Transaction List */}
        <div className="space-y-2">
          {/* Vendas */}
          {(abaExtrato === 'todos' || abaExtrato === 'vendas') &&
            vendasDoDia.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 flex-shrink-0">
                    <ShoppingBag size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 truncate">{v.itemNome}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                        {v.quantidade}x
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                      {v.hora && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {v.hora}
                        </span>
                      )}
                      <span>Unitário: {formatarMoeda(v.precoUnitario)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-black text-sm text-emerald-700">
                    +{formatarMoeda(v.valorTotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteVendaCardapio(v.id)}
                    title="Estornar lançamento de venda"
                    className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

          {/* Pagamentos a Funcionários */}
          {(abaExtrato === 'todos' || abaExtrato === 'funcionarios') &&
            pagamentosColabsDoDia.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-900 flex-shrink-0">
                    <Users size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 truncate">
                        Repasse a {p.colabNome}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        Folha / Vale
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 truncate mt-0.5">
                      Lançamento: {p.tituloLancamento} {p.obs ? `• ${p.obs}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-black text-sm text-amber-900">
                    -{formatarMoeda(p.valor)}
                  </span>
                </div>
              </div>
            ))}

          {/* Saídas / Despesas */}
          {(abaExtrato === 'todos' || abaExtrato === 'saidas') &&
            saidasDoDia.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-rose-50/40 border border-rose-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-800 flex-shrink-0">
                    <ArrowDownCircle size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 truncate">{s.descricao}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-900">
                        Despesa Operacional
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5 truncate">
                      {s.hora && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {s.hora}
                        </span>
                      )}
                      {s.observacao && <span>• {s.observacao}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-black text-sm text-rose-700">
                    -{formatarMoeda(s.valor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteSaidaDespesa(s.id)}
                    title="Excluir saída"
                    className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

          {vendasDoDia.length === 0 &&
            pagamentosColabsDoDia.length === 0 &&
            saidasDoDia.length === 0 && (
              <div className="text-center py-6 text-stone-400 text-xs bg-stone-50 rounded-xl border border-stone-200">
                Nenhuma movimentação registrada no caixa para {dataPtBr || dataSelecionada}.
              </div>
            )}
        </div>
      </div>

      {/* Modals */}
      <ModalNovoItemCardapio
        isOpen={modalNovoItemAberto}
        onClose={() => setModalNovoItemAberto(false)}
        categoriaAtiva={categoriaAtiva}
        onSalvarItem={onAddItemCardapio}
      />

      <ModalNovaSaida
        isOpen={modalNovaSaidaAberto}
        onClose={() => setModalNovaSaidaAberto(false)}
        categoriaAtiva={categoriaAtiva}
        dataPadrao={dataSelecionada}
        onSalvarSaida={onAddSaidaDespesa}
      />

      <ModalRegistrarVenda
        isOpen={!!itemParaVenda}
        onClose={() => setItemParaVenda(null)}
        item={itemParaVenda}
        categoriaAtiva={categoriaAtiva}
        dataPadrao={dataSelecionada}
        onSalvarVenda={onAddVendaCardapio}
      />
    </div>
  );
};
