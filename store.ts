
import { 
  User, UserStatus, Role, Capability, Wallet, Transaction, TransactionType,
  RewardItem, Order, OrderStatus, AuditLog, MonthlyChallenge, Recognition 
} from './types';

interface DB {
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  rewardItems: RewardItem[];
  orders: Order[];
  challenges: MonthlyChallenge[];
  recognitions: Recognition[];
  auditLogs: AuditLog[];
  config: {
    currencyName: string;
    conversionRate: number;
    donationLimit: number;
  };
}

export const INITIAL_DB: DB = {
  users: [
    {
      id: 'admin-uuid',
      corporateId: 'admin',
      name: 'ADMINISTRADOR',
      passwordHash: '1234',
      status: UserStatus.ACTIVE,
      roles: [Role.ADMIN],
      capabilities: [Capability.GENTE_GESTAO, Capability.ADMIN], 
      createdAt: new Date().toISOString()
    }
  ],
  wallets: [
    { userId: 'admin-uuid', balance: 0, donatableGold: 0, donatableSilver: 0, donatableBronze: 0 }
  ],
  transactions: [],
  rewardItems: [
    { id: '1', name: 'Boné Supply', description: 'Boné bordado exclusivo da unidade', imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=400', cost: 8, stock: 10, category: 'Vestuário', isActive: true },
    { id: '2', name: 'Camiseta Preta', description: 'Camiseta algodão premium Supply', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400', cost: 12, stock: 8, category: 'Vestuário', isActive: true },
    { id: '3', name: 'Fone Bluetooth', description: 'Fone bluetooth alta fidelidade', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400', cost: 25, stock: 5, category: 'Eletrônicos', isActive: true },
    { id: '4', name: 'Garrafa Térmica', description: 'Garrafa 500ml inox térmica', imageUrl: 'https://images.unsplash.com/photo-1602143399364-793175df9576?auto=format&fit=crop&q=80&w=400', cost: 15, stock: 6, category: 'Acessórios', isActive: true }
  ],
  orders: [],
  challenges: [],
  recognitions: [],
  auditLogs: [],
  config: {
    currencyName: 'tampinhas',
    conversionRate: 1,
    donationLimit: 500
  }
};

export const getDB = (): DB => {
  const data = localStorage.getItem('tampinhas_digital_v1');
  if (!data) return INITIAL_DB;
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_DB;
  }
};

export const saveDB = (db: DB) => {
  localStorage.setItem('tampinhas_digital_v1', JSON.stringify(db));
};

export const addAuditLog = (db: DB, log: Omit<AuditLog, 'id' | 'createdAt'>) => {
  const newLog: AuditLog = {
    ...log,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  db.auditLogs.unshift(newLog);
};
