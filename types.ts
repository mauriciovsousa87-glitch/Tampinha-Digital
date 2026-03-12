
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED'
}

export enum Role {
  USER = 'USER',
  APPROVER = 'APPROVER',
  ADMIN = 'ADMIN'
}

export enum Capability {
  RECEIVE_ONLY = 'SOMENTE_RECEBE',
  LEADERSHIP = 'LIDERANÇA',
  APPROVE_PURCHASES = 'APROVAR_RESGATES',
  ADMIN = 'ADMINISTRADOR',
  OPERADOR = 'OPERADOR',
  SUPERVISOR_COORDENADOR = 'SUPERVISOR_COORDENADOR',
  GERENTE_AREA = 'GERENTE_AREA',
  GERENTE_FABRIL = 'GERENTE_FABRIL',
  GENTE_GESTAO = 'GENTE_GESTAO'
}

export interface User {
  id: string;
  corporateId: string;
  name: string;
  passwordHash: string;
  status: UserStatus;
  roles: Role[];
  capabilities: Capability[];
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balance: number; // Saldo PESSOAL para gastar na loja
  // Carteira de DOAÇÃO (Verba recebida do Admin)
  donatableGold: number;
  donatableSilver: number;
  donatableBronze: number;
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export enum CoinType {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD'
}

export type PilarType = 'Segurança' | 'Qualidade' | 'Manutenção' | 'Financeiro' | 'Logística' | 'Meio Ambiente' | 'Gestão' | 'Gente';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; 
  coinCount?: number; // Quantidade de moedas físicas (Ex: 2 moedas de ouro)
  coinType?: CoinType; 
  pillar?: PilarType;
  fromUserId: string | 'SYSTEM';
  toUserId: string;
  reason: string;
  category: string;
  createdAt: string;
  createdBy: string;
  isDonationVerba?: boolean; // Flag para diferenciar carga de verba de reconhecimento real
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  cost: number;
  stock: number;
  category: string;
  isActive: boolean;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ADJUSTMENT_REQUESTED = 'ADJUSTMENT_REQUESTED',
  DELIVERED = 'DELIVERED'
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  note?: string;
  approverId?: string;
}

export interface OrderItem {
  itemId: string;
  qty: number;
  costEach: number;
}

export enum ChallengeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum CompanyPrinciple {
  SONHO = 'O sonho nos motiva a trabalhar juntos com um propósito comum.',
  GENTE = 'Gente excelente, com liberdade para crescer, é o nosso ativo mais valioso.',
  DESENVOLVIMENTO = 'Selecionamos e desenvolvemos pessoas que podem ser melhores que nós.',
  INSATISFACAO = 'Nunca estamos satisfeitos com nossos resultados.',
  CONSUMIDOR = 'O consumidor é o nosso patrão.',
  DONOS = 'Somos uma companhia de donos.',
  SIMPLICIDADE = 'Acreditamos que o bom senso e a simplicidade valem mais que a complexidade.',
  CUSTOS = 'Gerenciamos nossos custos rigorosamente para liberar recursos para o crescimento.',
  EXEMPLO = 'Liderar pelo exemplo é o melhor caminho.',
  INTEGRIDADE = 'Não pegamos atalhos; integridade e consistência são fundamentais.'
}

export interface Recognition {
  id: string;
  fromUserId: string;
  toUserId: string;
  principle: CompanyPrinciple;
  createdAt: string;
  isRead: boolean;
}

export interface MonthlyChallenge {
  id: string;
  area: string;
  kpi: string;
  meta: string;
  status: ChallengeStatus;
  isMetaHit: boolean;
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
}
