import React, { useState, useMemo } from 'react';
import { X, Copy, Download, Check, Sparkles, Filter, Calendar, ShoppingBag, DollarSign, Users } from 'lucide-react';
import type {
  Colaborador,
  ReceitaLancamento,
  CategoriaFinanceira,
  VendaCardapio,
  SaidaDespesa,
} from '../types';
import { formatarMoeda, normalizarTexto } from '../utils/format';

interface ModalRelatorioProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: Colaborador[];
  receitas: ReceitaLancamento[];
  vendasCardapio?: VendaCardapio[];
  saidasDespesas?: SaidaDespesa[];
  nomeCafeteria: string;
  dataVisao: Date;
}

const TODAS_CATEGORIAS: CategoriaFinanceira[] = ['Café', 'Hamburgueria'];

export const ModalRelatorio: React.FC<ModalRelatorioProps> = ({
  isOpen,
  onClose,
  colaboradores,
  receitas,
  vendasCardapio = [],
  saidasDespesas = [],
  nomeCafeteria,
  dataVisao,
}) => {
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<CategoriaFinanceira[]>([
    'Café',
    'Hamburgueria',
  ]);

  const [mesAnoString, setMesAnoString] = useState<string>(() => {
    const y = dataVisao.getFullYear();
    const m = (dataVisao.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  });

  const [ordem, setOrdem] = useState<'decrescente' | 'crescente' | 'alfabetica'>('decrescente');
  const [copiado, setCopiado] = useState<boolean>(false);

  // Toggle single category
  const toggleCategoria = (cat: CategoriaFinanceira) => {
    if (categoriasSelecionadas.includes(cat)) {
      if (categoriasSelecionadas.length === 1) {
        alert('Selecione ao menos uma categoria para o relatório.');
        return;
      }
      setCategoriasSelecionadas(categoriasSelecionadas.filter((c) => c !== cat));
    } else {
      setCategoriasSelecionadas([...categoriasSelecionadas, cat]);
    }
  };

  const selecionarTodas = () => {
    setCategoriasSelecionadas([...TODAS_CATEGORIAS]);
  };

  // Process data for the report
  const relatorioData = useMemo(() => {
    if (!mesAnoString) {
      return {
        texto: 'Selecione um mês válido.',
        totalGeral: 0,
        recebidoGeral: 0,
        pendenteGeral: 0,
        totalVendasValor: 0,
        totalVendasQtd: 0,
        totalSaidasValor: 0,
        saldoCaixaPeriodo: 0,
        listaItensVendidos: [],
        colaboradoresRelatorio: [],
      };
    }

    const [anoStr, mesStr] = mesAnoString.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10) - 1;

    // Filter recipes for this month + selected categories + active collaborators
    const recsDoMes = receitas.filter((r) => {
      const d = new Date(r.dataRef || r.dataCriacao || '');
      if (isNaN(d.getTime())) return false;

      const isMes = d.getMonth() === mes && d.getFullYear() === ano;
      const cat = r.categoria || 'Café';
      const isCat = categoriasSelecionadas.includes(cat);

      // Verify colab exists
      const idColab = r.colabId || r.utilizadorId;
      const isAtivo = colaboradores.some((c) => c.id === idColab);

      return isMes && isCat && isAtivo;
    });

    let totalGeral = 0;
    let recebidoGeral = 0;

    interface DadosColab {
      id: string;
      nome: string;
      setor: string;
      turno: string;
      chavePix?: string;
      totalPrevisto: number;
      totalPago: number;
      pendenteTotal: number;
      detalheCategoria: Record<string, { previsto: number; pago: number; pendente: number }>;
    }

    const mapColab: Record<string, DadosColab> = {};

    recsDoMes.forEach((r) => {
      const somaPg = (r.pagamentos || []).reduce((acc, p) => acc + (p.valor || 0), 0);
      totalGeral += r.valorTotal;
      recebidoGeral += somaPg;

      const idColab = r.colabId || r.utilizadorId || 'sem-id';
      if (!mapColab[idColab]) {
        const c = colaboradores.find((u) => u.id === idColab);
        const t = c?.turno || (r.categoria === 'Hamburgueria' ? 'Hamburgueria' : 'Café');
        mapColab[idColab] = {
          id: idColab,
          nome: c ? c.nome.toUpperCase() : 'COLABORADOR',
          setor: c?.setor || '',
          turno: t,
          chavePix: c?.chavePix,
          totalPrevisto: 0,
          totalPago: 0,
          pendenteTotal: 0,
          detalheCategoria: {},
        };
      }

      const pendente = r.valorTotal - somaPg;
      mapColab[idColab].totalPrevisto += r.valorTotal;
      mapColab[idColab].totalPago += somaPg;
      mapColab[idColab].pendenteTotal += pendente;

      const cat = r.categoria || 'Café';
      if (!mapColab[idColab].detalheCategoria[cat]) {
        mapColab[idColab].detalheCategoria[cat] = { previsto: 0, pago: 0, pendente: 0 };
      }
      mapColab[idColab].detalheCategoria[cat].previsto += r.valorTotal;
      mapColab[idColab].detalheCategoria[cat].pago += somaPg;
      mapColab[idColab].detalheCategoria[cat].pendente += pendente;
    });

    let lista = Object.values(mapColab);

    if (ordem === 'crescente') {
      lista.sort((a, b) => a.pendenteTotal - b.pendenteTotal);
    } else if (ordem === 'decrescente') {
      lista.sort((a, b) => b.pendenteTotal - a.pendenteTotal);
    } else {
      lista.sort((a, b) =>
        normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome), 'pt-BR')
      );
    }

    // Processamento de Vendas do Cardápio no Mês
    const vendasDoMes = vendasCardapio.filter((v) => {
      const isMes = v.data && v.data.startsWith(mesAnoString);
      const cat = v.categoria || 'Café';
      return isMes && categoriasSelecionadas.includes(cat);
    });

    let totalVendasValor = 0;
    let totalVendasQtd = 0;
    const mapaItensVendidos: Record<
      string,
      { nome: string; categoria: string; qtd: number; total: number }
    > = {};

    vendasDoMes.forEach((v) => {
      totalVendasValor += v.valorTotal || 0;
      totalVendasQtd += v.quantidade || 0;

      const idKey = v.itemId || v.itemNome;
      if (!mapaItensVendidos[idKey]) {
        mapaItensVendidos[idKey] = {
          nome: v.itemNome,
          categoria: v.categoria || 'Café',
          qtd: 0,
          total: 0,
        };
      }
      mapaItensVendidos[idKey].qtd += v.quantidade;
      mapaItensVendidos[idKey].total += v.valorTotal;
    });

    const listaItensVendidos = Object.values(mapaItensVendidos).sort(
      (a, b) => b.total - a.total
    );

    const vendasPorCategoria: Record<string, { qtd: number; total: number }> = {};
    categoriasSelecionadas.forEach((cat) => {
      vendasPorCategoria[cat] = { qtd: 0, total: 0 };
    });
    vendasDoMes.forEach((v) => {
      const cat = v.categoria || 'Café';
      if (!vendasPorCategoria[cat]) {
        vendasPorCategoria[cat] = { qtd: 0, total: 0 };
      }
      vendasPorCategoria[cat].qtd += v.quantidade;
      vendasPorCategoria[cat].total += v.valorTotal;
    });

    // Processamento de Saídas / Despesas no Mês
    const saidasDoMes = saidasDespesas.filter((s) => {
      const isMes = s.data && s.data.startsWith(mesAnoString);
      const cat = s.categoria || 'Café';
      return isMes && categoriasSelecionadas.includes(cat);
    });
    const totalSaidasValor = saidasDoMes.reduce((acc, s) => acc + (s.valor || 0), 0);

    const saldoCaixaPeriodo = totalVendasValor - recebidoGeral - totalSaidasValor;

    const dtRef = new Date(ano, mes, 10);
    const nomeMesAno = dtRef
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .toUpperCase();

    // Construction of WhatsApp message
    let texto = `☕ *FECHAMENTO FINANCEIRO & FOLHA - ${nomeCafeteria.toUpperCase()}*\n`;
    texto += `📅 *Competência:* ${nomeMesAno}\n`;
    texto += `🏷️ *Categorias Incluídas:* ${categoriasSelecionadas.join(', ')}\n\n`;

    // Bloco 1: Vendas dos Itens do Cardápio
    texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `🛒 *VENDAS DO CARDÁPIO (FATURAMENTO)*\n`;
    if (vendasDoMes.length === 0) {
      texto += `• Nenhuma venda de item registrada no período.\n`;
    } else {
      texto += `• *Total Faturado:* *${formatarMoeda(totalVendasValor)}* (${totalVendasQtd} unidades vendidas)\n`;
      categoriasSelecionadas.forEach((cat) => {
        const icon = cat === 'Hamburgueria' ? '🍔' : '☕';
        const dados = vendasPorCategoria[cat] || { qtd: 0, total: 0 };
        texto += `  ↳ ${icon} ${cat}: ${formatarMoeda(dados.total)} (${dados.qtd} un.)\n`;
      });

      texto += `\n📦 *Itens do Cardápio Vendidos:*\n`;
      listaItensVendidos.forEach((item) => {
        const icon = item.categoria === 'Hamburgueria' ? '🍔' : '☕';
        texto += `• ${icon} ${item.nome}: *${item.qtd} un.* — ${formatarMoeda(item.total)}\n`;
      });
    }
    texto += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Bloco 2: Resumo Financeiro & Folha
    texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `📊 *RESUMO FINANCEIRO & CAIXA*\n`;
    texto += `• (+) Total Vendas Cardápio: ${formatarMoeda(totalVendasValor)}\n`;
    texto += `• (-) Total Folha Prevista (Equipe): ${formatarMoeda(totalGeral)}\n`;
    texto += `• (-) Total Já Pago à Equipe: ${formatarMoeda(recebidoGeral)}\n`;
    texto += `• (⏳) Saldo Pendente a Pagar: *${formatarMoeda(totalGeral - recebidoGeral)}*\n`;
    if (totalSaidasValor > 0) {
      texto += `• (-) Saídas / Despesas Operacionais: ${formatarMoeda(totalSaidasValor)}\n`;
    }
    texto += `• *Saldo em Caixa do Período:* *${formatarMoeda(saldoCaixaPeriodo)}*\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Bloco 3: Detalhamento por Colaborador
    texto += `👥 *DETALHAMENTO DA EQUIPE:*\n\n`;

    if (lista.length === 0) {
      texto += `Nenhum lançamento de colaborador registrado para as categorias e mês selecionados.\n`;
    } else {
      lista.forEach((item) => {
        const turnoIcon = item.turno === 'Hamburgueria' ? '🍔' : '☕';
        const turnoDesc = `${turnoIcon} Turno ${item.turno}`;
        const tagDesc = item.setor ? ` (${item.setor} • ${turnoDesc})` : ` (${turnoDesc})`;
        if (item.pendenteTotal <= 0.01) {
          texto += `✅ *${item.nome}*${tagDesc}: Quitado integralmente\n`;
          texto += `   ↳ Total pago no período: ${formatarMoeda(item.totalPago)}\n\n`;
        } else {
          texto += `⏳ *${item.nome}*${tagDesc}: Pendente *${formatarMoeda(
            item.pendenteTotal
          )}*\n`;
          texto += `   ↳ Previsto: ${formatarMoeda(item.totalPrevisto)} | Pago: ${formatarMoeda(
            item.totalPago
          )}\n`;

          const detalhes: string[] = [];
          for (const [catName, catVal] of Object.entries(item.detalheCategoria)) {
            if (catVal.pendente > 0.01) {
              detalhes.push(`${catName}: ${formatarMoeda(catVal.pendente)}`);
            }
          }
          if (detalhes.length > 0) {
            texto += `   ↳ _Pendência por item: ${detalhes.join(' | ')}_\n`;
          }
          if (item.chavePix) {
            texto += `   ↳ _PIX: ${item.chavePix}_\n`;
          }
          texto += `\n`;
        }
      });
    }

    texto += `_Gerado pelo sistema financeiro ${nomeCafeteria} em ${new Date().toLocaleDateString(
      'pt-BR'
    )}_`;

    return {
      texto,
      totalGeral,
      recebidoGeral,
      pendenteGeral: totalGeral - recebidoGeral,
      totalVendasValor,
      totalVendasQtd,
      totalSaidasValor,
      saldoCaixaPeriodo,
      listaItensVendidos,
      colaboradoresRelatorio: lista,
    };
  }, [mesAnoString, categoriasSelecionadas, ordem, receitas, colaboradores, vendasCardapio, saidasDespesas, nomeCafeteria]);

  if (!isOpen) return null;

  const copiarRelatorio = async () => {
    try {
      await navigator.clipboard.writeText(relatorioData.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      alert('Não foi possível copiar automaticamente. Selecione o texto abaixo e copie manualmente.');
    }
  };

  const exportarCSV = () => {
    const cabecalho = ['Colaborador', 'Cargo', 'Total Previsto', 'Total Pago', 'Saldo Pendente', 'Chave PIX'];
    const linhas = relatorioData.colaboradoresRelatorio.map((c) => [
      `"${c.nome}"`,
      `"${c.setor || ''}"`,
      c.totalPrevisto.toFixed(2),
      c.totalPago.toFixed(2),
      c.pendenteTotal.toFixed(2),
      `"${c.chavePix || ''}"`,
    ]);

    let csvTexto = [cabecalho.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');

    if (relatorioData.listaItensVendidos.length > 0) {
      csvTexto += '\n\n"--- VENDAS DE ITENS DO CARDAPIO ---"\n';
      csvTexto += 'Item;Categoria;Quantidade Vendida;Total Faturado\n';
      relatorioData.listaItensVendidos.forEach((item) => {
        csvTexto += `"${item.nome}";"${item.categoria}";${item.qtd};${item.total.toFixed(2)}\n`;
      });
      csvTexto += `\n"TOTAL FATURADO ITENS";"";${relatorioData.totalVendasQtd};${relatorioData.totalVendasValor.toFixed(2)}\n`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvTexto;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio-financeiro-cafeteria-${mesAnoString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="modal-relatorio-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="modal-relatorio-card"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-100">Relatório Inteligente da Cafeteria</h3>
              <p className="text-xs text-stone-300">
                Formatação automática pronta para envio via WhatsApp ou exportação CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Controls */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-stone-800">
          {/* Categories Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Filter size={14} className="text-amber-600" />
                Categorias no Relatório
              </label>
              <button
                type="button"
                onClick={selecionarTodas}
                className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer"
              >
                Marcar Todas
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TODAS_CATEGORIAS.map((cat) => {
                const ativo = categoriasSelecionadas.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all text-left cursor-pointer ${
                      ativo
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        ativo ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      {ativo ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month & Ordering Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-600" />
                Mês de Referência
              </label>
              <input
                type="month"
                value={mesAnoString}
                onChange={(e) => setMesAnoString(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-medium focus:bg-white focus:border-amber-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Critério de Ordenação
              </label>
              <select
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm font-medium focus:bg-white focus:border-amber-600 outline-none cursor-pointer"
              >
                <option value="decrescente">Maior Valor Pendente</option>
                <option value="crescente">Menor Valor Pendente</option>
                <option value="alfabetica">Ordem Alfabética</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <ShoppingBag size={12} /> Vendas Cardápio
              </span>
              <p className="text-sm font-black text-emerald-700 mt-0.5">
                {formatarMoeda(relatorioData.totalVendasValor)}
              </p>
              <span className="text-[10px] text-emerald-600 block">
                {relatorioData.totalVendasQtd} un. vendidas
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Users size={12} /> Folha Prevista
              </span>
              <p className="text-sm font-black text-amber-800 mt-0.5">
                {formatarMoeda(relatorioData.totalGeral)}
              </p>
              <span className="text-[10px] text-amber-600 block">
                Equipe ({relatorioData.colaboradoresRelatorio.length})
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1">
                <Check size={12} /> Já Pago
              </span>
              <p className="text-sm font-black text-stone-800 mt-0.5">
                {formatarMoeda(relatorioData.recebidoGeral)}
              </p>
              <span className="text-[10px] text-stone-500 block">
                Falta: {formatarMoeda(relatorioData.pendenteGeral)}
              </span>
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                relatorioData.saldoCaixaPeriodo >= 0
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-red-50/70 border-red-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1">
                <DollarSign size={12} /> Saldo Caixa
              </span>
              <p
                className={`text-sm font-black mt-0.5 ${
                  relatorioData.saldoCaixaPeriodo >= 0 ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                {formatarMoeda(relatorioData.saldoCaixaPeriodo)}
              </p>
              <span className="text-[10px] text-stone-500 block">
                Vendas - Baixas - Saídas
              </span>
            </div>
          </div>

          {/* Textarea Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Pré-visualização da Mensagem:
              </span>
              <span className="text-xs text-stone-500">
                Pendente total:{' '}
                <strong className="text-amber-800 font-bold">
                  {formatarMoeda(relatorioData.pendenteGeral)}
                </strong>
              </span>
            </div>
            <textarea
              id="texto-relatorio-whatsapp"
              readOnly
              rows={10}
              value={relatorioData.texto}
              className="w-full p-4 rounded-xl border border-stone-300 bg-stone-900 text-amber-100 font-mono text-xs leading-relaxed outline-none shadow-inner resize-none select-all"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={exportarCSV}
            className="py-2 px-3.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            Exportar Planilha (CSV)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              id="btn-copiar-whatsapp"
              type="button"
              onClick={copiarRelatorio}
              className={`py-2 px-5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                copiado
                  ? 'bg-emerald-700 ring-2 ring-emerald-500'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-700/20'
              }`}
            >
              {copiado ? (
                <>
                  <Check size={16} /> Copiado com Sucesso!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copiar p/ WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
