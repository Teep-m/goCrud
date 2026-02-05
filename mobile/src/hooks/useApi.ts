// Custom hook for API calls

import { useState, useCallback } from 'react';
import { API_BASE } from '../constants/api';
import { Transaction, Category, Summary } from '../types';

export function useApi() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [txRes, catRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/transactions`),
        fetch(`${API_BASE}/categories`),
        fetch(`${API_BASE}/summary`)
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData || []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData || []);
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to create transaction:', err);
      return false;
    }
  }, [fetchData]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      return false;
    }
  }, [fetchData]);

  return {
    transactions,
    categories,
    summary,
    loading,
    error,
    fetchData,
    createTransaction,
    deleteTransaction,
  };
}
