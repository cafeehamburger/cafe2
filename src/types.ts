export type CategoriaFinanceira = 'Café' | 'Hamburgueria';

export interface Colaborador {
  id: string;
  nome: string;
  setor?: string; // Cargo / função (opcional)
  turno?: CategoriaFinanceira; // 'Café' | 'Hamburgueria'
  chavePix?: string;
  telefone?: string;
  ativo?: boolean;
}

export interface PagamentoParcial {
  valor: number;
  data: string;
  obs?: string;
  observacao?: string;
}

export interface ItemCardapio {
  id: string;
  nome: string;
  preco: number;
  categoria: CategoriaFinanceira;
  dataCriacao?: string;
}

export interface VendaCardapio {
  id: string;
  itemId: string;
  itemNome: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  categoria: CategoriaFinanceira;
  data: string; // YYYY-MM-DD
  hora?: string;
  criadoEm?: string;
}

export interface SaidaDespesa {
  id: string;
  descricao: string;
  valor: number;
  categoria: CategoriaFinanceira;
  data: string; // YYYY-MM-DD
  observacao?: string;
  hora?: string;
  criadoEm?: string;
}

export interface ReceitaLancamento {
  id: string;
  colabId: string;
  utilizadorId?: string;
  titulo: string;
  categoria: CategoriaFinanceira;
  valorTotal: number;
  observacoes?: string;
  dataRef: string; // ISO String (ex: 2026-09-10T00:00:00.000Z)
  dataCriacao?: string;
  pagamentos: PagamentoParcial[];
  historicoPagamentos?: PagamentoParcial[];
}

export interface FirebaseCredentials {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface CafeteriaSettings {
  nomeCafeteria: string;
  slogan: string;
  githubRepoUrl: string;
  usarModoDemo: boolean;
  firebaseConfig: FirebaseCredentials;
}

export interface UserSession {
  uid: string;
  email: string | null;
  displayName?: string | null;
  isDemo?: boolean;
}
