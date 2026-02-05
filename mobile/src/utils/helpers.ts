// Helper functions for Personal Finance Manager

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0
  }).format(amount);
};

export const getRecordId = (id: any): string => {
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object' && id.ID) return id.ID;
  return JSON.stringify(id);
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
};

export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
