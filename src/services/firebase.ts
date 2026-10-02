import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  Colaborador,
  ReceitaLancamento,
  FirebaseCredentials,
  CafeteriaSettings,
  PagamentoParcial,
  CategoriaFinanceira,
  ItemCardapio,
  VendaCardapio,
  SaidaDespesa,
} from '../types';

const SETTINGS_STORAGE_KEY = 'grao_nobre_settings';
const DEMO_USERS_KEY = 'grao_nobre_demo_colabs';
const DEMO_RECS_KEY = 'grao_nobre_demo_recs';
const DEMO_ITENS_KEY = 'grao_nobre_demo_itens_cardapio';
const DEMO_VENDAS_KEY = 'grao_nobre_demo_vendas_cardapio';
const DEMO_SAIDAS_KEY = 'grao_nobre_demo_saidas_despesas';

const SEED_ITENS_CARDAPIO: ItemCardapio[] = [
  { id: 'it_c1', nome: 'Café Espresso Tradicional', preco: 6.5, categoria: 'Café' },
  { id: 'it_c2', nome: 'Cappuccino Cremoso', preco: 12.0, categoria: 'Café' },
  { id: 'it_c3', nome: 'Pão de Queijo Minas', preco: 8.0, categoria: 'Café' },
  { id: 'it_c4', nome: 'Fatia de Torta / Bolo Caseiro', preco: 14.5, categoria: 'Café' },
  { id: 'it_h1', nome: 'Smash Burger Clássico', preco: 28.0, categoria: 'Hamburgueria' },
  { id: 'it_h2', nome: 'Double Bacon Cheddar', preco: 36.0, categoria: 'Hamburgueria' },
  { id: 'it_h3', nome: 'Porção de Batata Rústica', preco: 18.0, categoria: 'Hamburgueria' },
  { id: 'it_h4', nome: 'Suco Natural / Refri', preco: 9.0, categoria: 'Hamburgueria' },
];

// Default initial config safely reading from environment or configured project
const metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};

export const DEFAULT_FIREBASE_CONFIG: FirebaseCredentials = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyCubwgXzYPEAW9C6k8kRyqnhvpx5iyUWHk",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "cafe-8122a.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "cafe-8122a",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "cafe-8122a.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "708885617914",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:708885617914:web:6b8ff7123a10a333857d43",
};

export const DEFAULT_SETTINGS: CafeteriaSettings = {
  nomeCafeteria: 'Financeiro Refeições - Café e Hamburgueria',
  slogan: 'Gestão Financeira & Folha de Pagamentos',
  githubRepoUrl: '',
  usarModoDemo: false, // Conectado diretamente ao projeto Firebase cafe-8122a
  firebaseConfig: DEFAULT_FIREBASE_CONFIG,
};

export function loadStoredSettings(): CafeteriaSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure we use the active configured keys if the stored ones are empty
      const mergedConfig = {
        ...DEFAULT_FIREBASE_CONFIG,
        ...(parsed.firebaseConfig || {}),
      };
      // If the stored config had empty or placeholder apiKey, use the current active one
      if (!mergedConfig.apiKey || mergedConfig.apiKey.length < 10) {
        mergedConfig.apiKey = DEFAULT_FIREBASE_CONFIG.apiKey;
        mergedConfig.authDomain = DEFAULT_FIREBASE_CONFIG.authDomain;
        mergedConfig.projectId = DEFAULT_FIREBASE_CONFIG.projectId;
        mergedConfig.storageBucket = DEFAULT_FIREBASE_CONFIG.storageBucket;
        mergedConfig.messagingSenderId = DEFAULT_FIREBASE_CONFIG.messagingSenderId;
        mergedConfig.appId = DEFAULT_FIREBASE_CONFIG.appId;
      }

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        firebaseConfig: mergedConfig,
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar configurações salvas:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: CafeteriaSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  }
}

// Initial Sample Data for Cafeteria & Hamburgueria
const SEED_COLABS: Colaborador[] = [
  { id: 'c1', nome: 'Lucas Silva', setor: '', turno: 'Café', chavePix: 'lucas.barista@pix.com', telefone: '(11) 98765-4321' },
  { id: 'c2', nome: 'Camila Rocha', setor: '', turno: 'Café', chavePix: 'camila.confeitaria@pix.com', telefone: '(11) 97654-3210' },
  { id: 'c3', nome: 'Mateus Oliveira', setor: '', turno: 'Café', chavePix: 'mateus.cafe@pix.com', telefone: '(11) 96543-2109' },
  { id: 'c4', nome: 'Rodrigo Santos', setor: '', turno: 'Hamburgueria', chavePix: 'rodrigo.burger@pix.com', telefone: '(11) 95432-1098' },
  { id: 'c5', nome: 'Juliana Mendes', setor: '', turno: 'Hamburgueria', chavePix: 'juliana.burger@pix.com', telefone: '(11) 94321-0987' },
  { id: 'c6', nome: 'Fernanda Lima', setor: '', turno: 'Hamburgueria', chavePix: 'fernanda.burger@pix.com', telefone: '(11) 93210-9876' },
];

function getInitialDemoReceitas(): ReceitaLancamento[] {
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();
  const dataRef = new Date(anoAtual, mesAtual, 10).toISOString();

  return [
    {
      id: 'r1',
      colabId: 'c1',
      titulo: 'Salário Turno Café (Manhã)',
      categoria: 'Café',
      valorTotal: 2600.0,
      observacoes: 'Salário mensal barista manhã',
      dataRef,
      pagamentos: [
        {
          valor: 1300.0,
          data: '15/09/2026',
          obs: '1ª quinzena via PIX',
        },
      ],
    },
    {
      id: 'r2',
      colabId: 'c2',
      titulo: 'Salário Confeitaria & Café (Manhã)',
      categoria: 'Café',
      valorTotal: 2800.0,
      observacoes: 'Produção de doces e salgados matinais',
      dataRef,
      pagamentos: [
        {
          valor: 1400.0,
          data: '15/09/2026',
          obs: '1ª parcela bancária',
        },
      ],
    },
    {
      id: 'r3',
      colabId: 'c3',
      titulo: 'Salário Atendente Café (Manhã)',
      categoria: 'Café',
      valorTotal: 1850.0,
      observacoes: 'Atendente balcão e salão diurno',
      dataRef,
      pagamentos: [],
    },
    {
      id: 'r4',
      colabId: 'c4',
      titulo: 'Salário Chapeiro (Hamburgueria Noite)',
      categoria: 'Hamburgueria',
      valorTotal: 2900.0,
      observacoes: 'Chapeiro responsável turno noturno',
      dataRef,
      pagamentos: [
        {
          valor: 1450.0,
          data: '15/09/2026',
          obs: 'Adiantamento via PIX',
        },
      ],
    },
    {
      id: 'r5',
      colabId: 'c5',
      titulo: 'Salário Cozinha & Porções (Hamburgueria Noite)',
      categoria: 'Hamburgueria',
      valorTotal: 2400.0,
      observacoes: 'Preparo de lanches e porções noturnas',
      dataRef,
      pagamentos: [],
    },
    {
      id: 'r6',
      colabId: 'c6',
      titulo: 'Salário Atendente / Garçom (Hamburgueria Noite)',
      categoria: 'Hamburgueria',
      valorTotal: 1950.0,
      observacoes: 'Atendimento de mesas no turno da noite',
      dataRef,
      pagamentos: [
        {
          valor: 1950.0,
          data: '05/09/2026',
          obs: 'Salário integral quitado',
        },
      ],
    },
  ];
}

// Local Demo State Manager
class DemoStore {
  private colabs: Colaborador[] = [];
  private recs: ReceitaLancamento[] = [];
  private itens: ItemCardapio[] = [];
  private vendas: VendaCardapio[] = [];
  private saidas: SaidaDespesa[] = [];
  private colabListeners: Set<(colabs: Colaborador[]) => void> = new Set();
  private recListeners: Set<(recs: ReceitaLancamento[]) => void> = new Set();
  private itemListeners: Set<(itens: ItemCardapio[]) => void> = new Set();
  private vendaListeners: Set<(vendas: VendaCardapio[]) => void> = new Set();
  private saidaListeners: Set<(saidas: SaidaDespesa[]) => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const storedUsers = localStorage.getItem(DEMO_USERS_KEY);
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers) as Colaborador[];
        this.colabs = parsed.map((c) => {
          let turno = c.turno;
          if (!turno) {
            const txt = ((c.setor || '') + ' ' + (c.nome || '')).toLowerCase();
            turno =
              txt.includes('burger') ||
              txt.includes('hamburguer') ||
              txt.includes('chapeiro') ||
              txt.includes('noite')
                ? 'Hamburgueria'
                : 'Café';
          }
          return { ...c, turno };
        });
      } else {
        this.colabs = SEED_COLABS;
      }

      const storedRecs = localStorage.getItem(DEMO_RECS_KEY);
      if (storedRecs) {
        const parsed = JSON.parse(storedRecs) as ReceitaLancamento[];
        this.recs = parsed.map((r) => ({
          ...r,
          categoria: (r.categoria === 'Hamburgueria' ? 'Hamburgueria' : 'Café') as CategoriaFinanceira,
        }));
      } else {
        this.recs = getInitialDemoReceitas();
      }

      const storedItens = localStorage.getItem(DEMO_ITENS_KEY);
      this.itens = storedItens ? JSON.parse(storedItens) : SEED_ITENS_CARDAPIO;

      const storedVendas = localStorage.getItem(DEMO_VENDAS_KEY);
      this.vendas = storedVendas ? JSON.parse(storedVendas) : [];

      const storedSaidas = localStorage.getItem(DEMO_SAIDAS_KEY);
      this.saidas = storedSaidas ? JSON.parse(storedSaidas) : [];
    } catch {
      this.colabs = SEED_COLABS;
      this.recs = getInitialDemoReceitas();
      this.itens = SEED_ITENS_CARDAPIO;
      this.vendas = [];
      this.saidas = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(this.colabs));
      localStorage.setItem(DEMO_RECS_KEY, JSON.stringify(this.recs));
      localStorage.setItem(DEMO_ITENS_KEY, JSON.stringify(this.itens));
      localStorage.setItem(DEMO_VENDAS_KEY, JSON.stringify(this.vendas));
      localStorage.setItem(DEMO_SAIDAS_KEY, JSON.stringify(this.saidas));
    } catch (e) {
      console.warn('Erro ao salvar no cache local:', e);
    }
  }

  notifyColabs() {
    this.save();
    this.colabListeners.forEach((l) => l([...this.colabs]));
  }

  notifyRecs() {
    this.save();
    this.recListeners.forEach((l) => l([...this.recs]));
  }

  notifyItens() {
    this.save();
    this.itemListeners.forEach((l) => l([...this.itens]));
  }

  notifyVendas() {
    this.save();
    this.vendaListeners.forEach((l) => l([...this.vendas]));
  }

  notifySaidas() {
    this.save();
    this.saidaListeners.forEach((l) => l([...this.saidas]));
  }

  subscribeColabs(callback: (colabs: Colaborador[]) => void): Unsubscribe {
    this.colabListeners.add(callback);
    callback([...this.colabs]);
    return () => this.colabListeners.delete(callback);
  }

  subscribeRecs(callback: (recs: ReceitaLancamento[]) => void): Unsubscribe {
    this.recListeners.add(callback);
    callback([...this.recs]);
    return () => this.recListeners.delete(callback);
  }

  subscribeItens(callback: (itens: ItemCardapio[]) => void): Unsubscribe {
    this.itemListeners.add(callback);
    callback([...this.itens]);
    return () => this.itemListeners.delete(callback);
  }

  subscribeVendas(callback: (vendas: VendaCardapio[]) => void): Unsubscribe {
    this.vendaListeners.add(callback);
    callback([...this.vendas]);
    return () => this.vendaListeners.delete(callback);
  }

  subscribeSaidas(callback: (saidas: SaidaDespesa[]) => void): Unsubscribe {
    this.saidaListeners.add(callback);
    callback([...this.saidas]);
    return () => this.saidaListeners.delete(callback);
  }

  addColab(nome: string, setor: string, turno: CategoriaFinanceira = 'Café'): Colaborador {
    const novo: Colaborador = {
      id: 'colab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      nome,
      setor,
      turno,
    };
    this.colabs.push(novo);
    this.notifyColabs();
    return novo;
  }

  deleteColab(id: string) {
    this.colabs = this.colabs.filter((c) => c.id !== id);
    this.recs = this.recs.filter((r) => r.colabId !== id && r.utilizadorId !== id);
    this.save();
    this.colabListeners.forEach((l) => l([...this.colabs]));
    this.recListeners.forEach((l) => l([...this.recs]));
  }

  addRec(rec: Omit<ReceitaLancamento, 'id'>): ReceitaLancamento {
    const nova: ReceitaLancamento = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...rec,
      pagamentos: rec.pagamentos || [],
      historicoPagamentos: rec.pagamentos || [],
    };
    this.recs.push(nova);
    this.notifyRecs();
    return nova;
  }

  updateRec(id: string, updates: Partial<ReceitaLancamento>) {
    this.recs = this.recs.map((r) => {
      if (r.id === id) {
        const pgs = updates.pagamentos !== undefined ? updates.pagamentos : r.pagamentos;
        return {
          ...r,
          ...updates,
          pagamentos: pgs,
          historicoPagamentos: pgs,
        };
      }
      return r;
    });
    this.notifyRecs();
  }

  deleteRec(id: string) {
    this.recs = this.recs.filter((r) => r.id !== id);
    this.notifyRecs();
  }

  addItem(item: Omit<ItemCardapio, 'id'>): ItemCardapio {
    const novo: ItemCardapio = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...item,
      dataCriacao: new Date().toISOString(),
    };
    this.itens.push(novo);
    this.notifyItens();
    return novo;
  }

  deleteItem(id: string) {
    this.itens = this.itens.filter((i) => i.id !== id);
    this.notifyItens();
  }

  addVenda(venda: Omit<VendaCardapio, 'id'>): VendaCardapio {
    const nova: VendaCardapio = {
      id: 'venda_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...venda,
      criadoEm: new Date().toISOString(),
    };
    this.vendas.push(nova);
    this.notifyVendas();
    return nova;
  }

  deleteVenda(id: string) {
    this.vendas = this.vendas.filter((v) => v.id !== id);
    this.notifyVendas();
  }

  addSaida(saida: Omit<SaidaDespesa, 'id'>): SaidaDespesa {
    const nova: SaidaDespesa = {
      id: 'saida_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...saida,
      criadoEm: new Date().toISOString(),
    };
    this.saidas.push(nova);
    this.notifySaidas();
    return nova;
  }

  deleteSaida(id: string) {
    this.saidas = this.saidas.filter((s) => s.id !== id);
    this.notifySaidas();
  }

  resetToSeed() {
    this.colabs = SEED_COLABS;
    this.recs = getInitialDemoReceitas();
    this.itens = SEED_ITENS_CARDAPIO;
    this.vendas = [];
    this.saidas = [];
    this.notifyColabs();
    this.notifyRecs();
    this.notifyItens();
    this.notifyVendas();
    this.notifySaidas();
  }
}

export const demoStore = new DemoStore();

// Firebase Singleton Instance Handler
let firebaseAppInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseClient(config?: FirebaseCredentials): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  hasValidConfig: boolean;
} {
  const currentConfig = config || loadStoredSettings().firebaseConfig;
  const hasValidConfig = Boolean(
    currentConfig.apiKey &&
      currentConfig.apiKey.length > 10 &&
      currentConfig.projectId &&
      !currentConfig.apiKey.includes('MY_')
  );

  if (!hasValidConfig) {
    return { app: null, auth: null, db: null, hasValidConfig: false };
  }

  try {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseAppInstance = apps[0];
    } else {
      firebaseAppInstance = initializeApp({
        apiKey: currentConfig.apiKey,
        authDomain: currentConfig.authDomain,
        projectId: currentConfig.projectId,
        storageBucket: currentConfig.storageBucket,
        messagingSenderId: currentConfig.messagingSenderId,
        appId: currentConfig.appId,
        measurementId: currentConfig.measurementId,
      });
    }

    if (!authInstance && firebaseAppInstance) {
      authInstance = getAuth(firebaseAppInstance);
      setPersistence(authInstance, browserLocalPersistence).catch(console.warn);
    }
    if (!firestoreInstance && firebaseAppInstance) {
      firestoreInstance = getFirestore(firebaseAppInstance);
    }

    return {
      app: firebaseAppInstance,
      auth: authInstance,
      db: firestoreInstance,
      hasValidConfig: true,
    };
  } catch (err) {
    console.warn('Erro ao inicializar Firebase:', err);
    return { app: null, auth: null, db: null, hasValidConfig: false };
  }
}

// Subscribe to Auth changes
export function subscribeAuth(
  onUser: (user: User | null, isDemo: boolean) => void
): () => void {
  const settings = loadStoredSettings();
  if (settings.usarModoDemo) {
    // Demo user session
    const demoUser = {
      uid: 'demo-gestor-cafeteria',
      email: 'gestor@refeicoes.com.br',
      displayName: 'Gestor(a) Financeiro Refeições',
    } as unknown as User;
    onUser(demoUser, true);
    return () => {};
  }

  const { auth, hasValidConfig } = getFirebaseClient(settings.firebaseConfig);
  if (!auth || !hasValidConfig) {
    onUser(null, false);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    onUser(user, false);
  });
}

// Data Subscriptions (Colaboradores and Receitas)
export function subscribeColaboradores(
  uid: string,
  isDemo: boolean,
  callback: (colabs: Colaborador[]) => void
): Unsubscribe {
  if (isDemo) {
    return demoStore.subscribeColabs(callback);
  }

  const { db } = getFirebaseClient();
  if (!db) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, `gestao-financeira/${uid}/colaboradores`);
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        let turno = data.turno as CategoriaFinanceira | undefined;
        if (!turno) {
          const txt = ((data.setor || '') + ' ' + (data.nome || '')).toLowerCase();
          turno =
            txt.includes('burger') ||
            txt.includes('hamburguer') ||
            txt.includes('chapeiro') ||
            txt.includes('noite')
              ? 'Hamburgueria'
              : 'Café';
        }
        return {
          id: d.id,
          nome: data.nome || '',
          setor: data.setor || '',
          turno,
          chavePix: data.chavePix || '',
          telefone: data.telefone || '',
          ativo: data.ativo !== false,
        } as Colaborador;
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar colaboradores no Firestore:', err);
    }
  );
}

export function subscribeReceitas(
  uid: string,
  isDemo: boolean,
  callback: (recs: ReceitaLancamento[]) => void
): Unsubscribe {
  if (isDemo) {
    return demoStore.subscribeRecs(callback);
  }

  const { db } = getFirebaseClient();
  if (!db) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, `gestao-financeira/${uid}/receitas`);
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          colabId: data.colabId || data.utilizadorId || '',
          titulo: data.titulo || '',
          categoria: data.categoria || 'Café',
          valorTotal: Number(data.valorTotal) || 0,
          observacoes: data.observacoes || '',
          dataRef: data.dataRef || data.dataCriacao || new Date().toISOString(),
          pagamentos: (data.pagamentos || data.historicoPagamentos || []).map((p: any) => ({
            valor: Number(p.valor) || 0,
            data: p.data || '',
            obs: p.obs || p.observacao || '',
          })),
        } as ReceitaLancamento;
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar receitas no Firestore:', err);
    }
  );
}

// Data Actions
export async function addColaborador(
  uid: string,
  isDemo: boolean,
  colab: {
    nome: string;
    setor?: string;
    turno?: CategoriaFinanceira;
    chavePix?: string;
    telefone?: string;
  }
): Promise<string> {
  const turno = colab.turno || 'Café';
  const setor = colab.setor?.trim() || '';
  if (isDemo) {
    const created = demoStore.addColab(colab.nome, setor, turno);
    return created.id;
  }
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  const docRef = await addDoc(collection(db, `gestao-financeira/${uid}/colaboradores`), {
    ...colab,
    setor,
    turno,
  });
  return docRef.id;
}

export async function deleteColaborador(
  uid: string,
  isDemo: boolean,
  colabId: string
): Promise<void> {
  if (isDemo) {
    demoStore.deleteColab(colabId);
    return;
  }
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  await deleteDoc(doc(db, `gestao-financeira/${uid}/colaboradores`, colabId));
}

export async function addReceita(
  uid: string,
  isDemo: boolean,
  rec: Omit<ReceitaLancamento, 'id'>
): Promise<string> {
  if (isDemo) {
    const created = demoStore.addRec(rec);
    return created.id;
  }
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  const docRef = await addDoc(collection(db, `gestao-financeira/${uid}/receitas`), rec);
  return docRef.id;
}

export async function addPagamentoParcial(
  uid: string,
  isDemo: boolean,
  receitaId: string,
  novoPagamento: PagamentoParcial,
  receitasCache: ReceitaLancamento[]
): Promise<void> {
  const receita = receitasCache.find((r) => r.id === receitaId);
  if (!receita) return;

  const currentPgs = [...(receita.pagamentos || receita.historicoPagamentos || [])];
  const atualizados = [...currentPgs, novoPagamento];

  if (isDemo) {
    demoStore.updateRec(receitaId, { pagamentos: atualizados, historicoPagamentos: atualizados });
    return;
  }

  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  await updateDoc(doc(db, `gestao-financeira/${uid}/receitas`, receitaId), {
    pagamentos: atualizados,
    historicoPagamentos: atualizados,
  });
}

export async function deletePagamentoParcial(
  uid: string,
  isDemo: boolean,
  receitaId: string,
  index: number,
  receitasCache: ReceitaLancamento[]
): Promise<void> {
  const receita = receitasCache.find((r) => r.id === receitaId);
  if (!receita) return;

  const atualizados = [...(receita.pagamentos || receita.historicoPagamentos || [])];
  if (index >= 0 && index < atualizados.length) {
    atualizados.splice(index, 1);
  }

  if (isDemo) {
    demoStore.updateRec(receitaId, { pagamentos: atualizados, historicoPagamentos: atualizados });
    return;
  }

  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  await updateDoc(doc(db, `gestao-financeira/${uid}/receitas`, receitaId), {
    pagamentos: atualizados,
    historicoPagamentos: atualizados,
  });
}

export async function resetarTodasAsBaixas(
  uid: string,
  isDemo: boolean,
  receitaId: string
): Promise<void> {
  if (isDemo) {
    demoStore.updateRec(receitaId, { pagamentos: [], historicoPagamentos: [] });
    return;
  }

  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  await updateDoc(doc(db, `gestao-financeira/${uid}/receitas`, receitaId), {
    pagamentos: [],
    historicoPagamentos: [],
  });
}

export async function deleteReceita(
  uid: string,
  isDemo: boolean,
  receitaId: string
): Promise<void> {
  if (isDemo) {
    demoStore.deleteRec(receitaId);
    return;
  }
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore não configurado.');
  await deleteDoc(doc(db, `gestao-financeira/${uid}/receitas`, receitaId));
}

// Itens Cardapio Subscriptions and Actions
// Itens Cardapio Subscriptions and Actions
export function subscribeItensCardapio(
  uid: string,
  isDemo: boolean,
  callback: (itens: ItemCardapio[]) => void
): Unsubscribe {
  // Sempre inicializa e notifica com os itens locais para resposta instantânea
  const unsubLocal = demoStore.subscribeItens(callback);

  if (isDemo) {
    return unsubLocal;
  }

  const { db } = getFirebaseClient();
  if (!db) {
    return unsubLocal;
  }

  const colRef = collection(db, `gestao-financeira/${uid}/itensCardapio`);
  let unsubFirestore: Unsubscribe = () => {};
  try {
    unsubFirestore = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              nome: data.nome || '',
              preco: Number(data.preco) || 0,
              categoria: (data.categoria === 'Hamburgueria' ? 'Hamburgueria' : 'Café') as CategoriaFinanceira,
              dataCriacao: data.dataCriacao,
            } as ItemCardapio;
          });
          callback(list);
        }
      },
      (err) => {
        console.warn('Aviso Firestore itensCardapio (utilizando armazenamento local):', err);
      }
    );
  } catch (err) {
    console.warn('Erro ao conectar listener Firestore itensCardapio:', err);
  }

  return () => {
    unsubLocal();
    unsubFirestore();
  };
}

export async function addItemCardapio(
  uid: string,
  isDemo: boolean,
  item: Omit<ItemCardapio, 'id'>
): Promise<string> {
  // Salva localmente primeiro para resposta imediata sem travar a interface
  const localItem = demoStore.addItem(item);

  if (isDemo) {
    return localItem.id;
  }

  const { db } = getFirebaseClient();
  if (db) {
    try {
      const docRef = await addDoc(collection(db, `gestao-financeira/${uid}/itensCardapio`), {
        ...item,
        dataCriacao: new Date().toISOString(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Aviso: Item salvo localmente. Para sincronizar na nuvem, atualize as regras do Firestore:', err);
      return localItem.id;
    }
  }
  return localItem.id;
}

export async function deleteItemCardapio(
  uid: string,
  isDemo: boolean,
  id: string
): Promise<void> {
  demoStore.deleteItem(id);

  if (isDemo) return;

  const { db } = getFirebaseClient();
  if (db) {
    try {
      await deleteDoc(doc(db, `gestao-financeira/${uid}/itensCardapio`, id));
    } catch (err) {
      console.warn('Aviso: Item removido localmente:', err);
    }
  }
}

// Vendas Cardapio Subscriptions and Actions
export function subscribeVendasCardapio(
  uid: string,
  isDemo: boolean,
  callback: (vendas: VendaCardapio[]) => void
): Unsubscribe {
  const unsubLocal = demoStore.subscribeVendas(callback);

  if (isDemo) {
    return unsubLocal;
  }

  const { db } = getFirebaseClient();
  if (!db) {
    return unsubLocal;
  }

  const colRef = collection(db, `gestao-financeira/${uid}/vendasCardapio`);
  let unsubFirestore: Unsubscribe = () => {};
  try {
    unsubFirestore = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              itemId: data.itemId || '',
              itemNome: data.itemNome || '',
              quantidade: Number(data.quantidade) || 0,
              precoUnitario: Number(data.precoUnitario) || 0,
              valorTotal: Number(data.valorTotal) || 0,
              categoria: (data.categoria === 'Hamburgueria' ? 'Hamburgueria' : 'Café') as CategoriaFinanceira,
              data: data.data || '',
              hora: data.hora || '',
              criadoEm: data.criadoEm,
            } as VendaCardapio;
          });
          callback(list);
        }
      },
      (err) => {
        console.warn('Aviso Firestore vendasCardapio (utilizando armazenamento local):', err);
      }
    );
  } catch (err) {
    console.warn('Erro ao conectar listener Firestore vendasCardapio:', err);
  }

  return () => {
    unsubLocal();
    unsubFirestore();
  };
}

export async function addVendaCardapio(
  uid: string,
  isDemo: boolean,
  venda: Omit<VendaCardapio, 'id'>
): Promise<string> {
  const localVenda = demoStore.addVenda(venda);

  if (isDemo) {
    return localVenda.id;
  }

  const { db } = getFirebaseClient();
  if (db) {
    try {
      const docRef = await addDoc(collection(db, `gestao-financeira/${uid}/vendasCardapio`), {
        ...venda,
        criadoEm: new Date().toISOString(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Aviso: Venda registrada localmente. Para sincronizar na nuvem, atualize as regras do Firestore:', err);
      return localVenda.id;
    }
  }
  return localVenda.id;
}

export async function deleteVendaCardapio(
  uid: string,
  isDemo: boolean,
  id: string
): Promise<void> {
  demoStore.deleteVenda(id);

  if (isDemo) return;

  const { db } = getFirebaseClient();
  if (db) {
    try {
      await deleteDoc(doc(db, `gestao-financeira/${uid}/vendasCardapio`, id));
    } catch (err) {
      console.warn('Aviso: Venda estornada localmente:', err);
    }
  }
}

// Saidas e Despesas Subscriptions and Actions
export function subscribeSaidasDespesas(
  uid: string,
  isDemo: boolean,
  callback: (saidas: SaidaDespesa[]) => void
): Unsubscribe {
  const unsubLocal = demoStore.subscribeSaidas(callback);

  if (isDemo) {
    return unsubLocal;
  }

  const { db } = getFirebaseClient();
  if (!db) {
    return unsubLocal;
  }

  const colRef = collection(db, `gestao-financeira/${uid}/saidasDespesas`);
  let unsubFirestore: Unsubscribe = () => {};
  try {
    unsubFirestore = onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              descricao: data.descricao || '',
              valor: Number(data.valor) || 0,
              categoria: (data.categoria === 'Hamburgueria' ? 'Hamburgueria' : 'Café') as CategoriaFinanceira,
              data: data.data || '',
              observacao: data.observacao || '',
              hora: data.hora || '',
              criadoEm: data.criadoEm,
            } as SaidaDespesa;
          });
          callback(list);
        }
      },
      (err) => {
        console.warn('Aviso Firestore saidasDespesas (utilizando armazenamento local):', err);
      }
    );
  } catch (err) {
    console.warn('Erro ao conectar listener Firestore saidasDespesas:', err);
  }

  return () => {
    unsubLocal();
    unsubFirestore();
  };
}

export async function addSaidaDespesa(
  uid: string,
  isDemo: boolean,
  saida: Omit<SaidaDespesa, 'id'>
): Promise<string> {
  const localSaida = demoStore.addSaida(saida);

  if (isDemo) {
    return localSaida.id;
  }

  const { db } = getFirebaseClient();
  if (db) {
    try {
      const docRef = await addDoc(collection(db, `gestao-financeira/${uid}/saidasDespesas`), {
        ...saida,
        criadoEm: new Date().toISOString(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Aviso: Saída registrada localmente. Para sincronizar na nuvem, atualize as regras do Firestore:', err);
      return localSaida.id;
    }
  }
  return localSaida.id;
}

export async function deleteSaidaDespesa(
  uid: string,
  isDemo: boolean,
  id: string
): Promise<void> {
  demoStore.deleteSaida(id);

  if (isDemo) return;

  const { db } = getFirebaseClient();
  if (db) {
    try {
      await deleteDoc(doc(db, `gestao-financeira/${uid}/saidasDespesas`, id));
    } catch (err) {
      console.warn('Aviso: Saída removida localmente:', err);
    }
  }
}

// Auth Actions
export async function loginFirebase(email: string, pass: string): Promise<User> {
  const { auth } = getFirebaseClient();
  if (!auth) throw new Error('Firebase Auth não configurado.');
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function registerFirebase(email: string, pass: string): Promise<User> {
  const { auth } = getFirebaseClient();
  if (!auth) throw new Error('Firebase Auth não configurado.');
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function logoutFirebase(): Promise<void> {
  const { auth } = getFirebaseClient();
  if (auth) {
    await signOut(auth);
  }
}
