// Types for Personal Finance Manager

export interface Transaction {
  id: any;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at?: string;
}

export interface Category {
  id: any;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface Summary {
  total_income: number;
  total_expense: number;
  balance: number;
  by_category: Record<string, number>;
}
