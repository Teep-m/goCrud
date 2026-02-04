import { useEffect, useState, useCallback } from 'react'
import './App.css'

// Types
interface Transaction {
  id: any
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
  created_at?: string
}

interface Category {
  id: any
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
}

interface Summary {
  total_income: number
  total_expense: number
  balance: number
  by_category: Record<string, number>
}

const API_BASE = 'http://localhost:8084/api'

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0
  }).format(amount)
}

const getRecordId = (id: any): string => {
  if (typeof id === 'string') return id
  if (id && typeof id === 'object' && id.ID) return id.ID
  return JSON.stringify(id)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function App() {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [txRes, catRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/transactions`),
        fetch(`${API_BASE}/categories`),
        fetch(`${API_BASE}/summary`)
      ])

      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(txData || [])
      }

      if (catRes.ok) {
        const catData = await catRes.json()
        setCategories(catData || [])
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json()
        setSummary(sumData)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get category info
  const getCategoryInfo = (categoryName: string): Category | undefined => {
    return categories.find(c => c.name === categoryName)
  }

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.type === formType)

  // Set default category when type changes
  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.name === formCategory)) {
      setFormCategory(filteredCategories[0].name)
    }
  }, [formType, filteredCategories, formCategory])

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAmount || !formCategory) return

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          amount: parseFloat(formAmount),
          category: formCategory,
          description: formDescription,
          date: formDate
        })
      })

      if (res.ok) {
        setFormAmount('')
        setFormDescription('')
        setFormDate(new Date().toISOString().split('T')[0])
        fetchData()
      }
    } catch (err) {
      console.error('Failed to create transaction:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: any) => {
    const recordId = getRecordId(id)
    try {
      const res = await fetch(`${API_BASE}/transactions/${encodeURIComponent(recordId)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading" style={{ width: '100px', height: '20px' }}></div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <header className="header fade-in">
        <div className="header__title">
          <span className="header__icon">💰</span>
          <div className="header__text">
            <h1>Personal Finance</h1>
            <p>収支を賢く管理しよう</p>
          </div>
        </div>
        <div className="header__balance">
          <p className="header__balance-label">総残高</p>
          <p className="header__balance-value">
            {summary ? formatCurrency(summary.balance) : '¥0'}
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card summary-card--income fade-in">
          <div className="summary-card__header">
            <span className="summary-card__icon">📈</span>
            <span className="summary-card__label">今月の収入</span>
          </div>
          <p className="summary-card__value">
            {summary ? formatCurrency(summary.total_income) : '¥0'}
          </p>
        </div>

        <div className="summary-card summary-card--expense fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="summary-card__header">
            <span className="summary-card__icon">📉</span>
            <span className="summary-card__label">今月の支出</span>
          </div>
          <p className="summary-card__value">
            {summary ? formatCurrency(summary.total_expense) : '¥0'}
          </p>
        </div>

        <div className="summary-card summary-card--balance fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="summary-card__header">
            <span className="summary-card__icon">💵</span>
            <span className="summary-card__label">今月の収支</span>
          </div>
          <p className="summary-card__value" style={{ color: summary && summary.balance >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
            {summary ? formatCurrency(summary.balance) : '¥0'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {/* Transaction List */}
        <section className="transaction-section fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="section-header">
            <h2>📋 取引履歴</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {transactions.length} 件
            </span>
          </div>

          {sortedTransactions.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__icon">📭</p>
              <p className="empty-state__text">まだ取引がありません</p>
            </div>
          ) : (
            <div className="transaction-list">
              {sortedTransactions.map((tx, index) => {
                const catInfo = getCategoryInfo(tx.category)
                return (
                  <div
                    key={getRecordId(tx.id) || index}
                    className={`transaction-item transaction-item--${tx.type} fade-in`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="transaction-item__icon">
                      {catInfo?.icon || (tx.type === 'income' ? '💰' : '💸')}
                    </div>
                    <div className="transaction-item__details">
                      <p className="transaction-item__category">{tx.category}</p>
                      <p className="transaction-item__description">
                        {tx.description || '説明なし'}
                      </p>
                    </div>
                    <div className="transaction-item__meta">
                      <p className="transaction-item__amount">
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="transaction-item__date">{formatDate(tx.date)}</p>
                    </div>
                    <button
                      className="transaction-item__delete"
                      onClick={() => handleDelete(tx.id)}
                      title="削除"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Add Transaction Form */}
        <section className="form-section fade-in" style={{ animationDelay: '0.4s' }}>
          <h2>➕ 新規取引</h2>

          <form onSubmit={handleSubmit}>
            {/* Type Toggle */}
            <div className="type-toggle">
              <button
                type="button"
                className={`type-toggle__btn type-toggle__btn--expense ${formType === 'expense' ? 'active' : ''}`}
                onClick={() => setFormType('expense')}
              >
                📉 支出
              </button>
              <button
                type="button"
                className={`type-toggle__btn type-toggle__btn--income ${formType === 'income' ? 'active' : ''}`}
                onClick={() => setFormType('income')}
              >
                📈 収入
              </button>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label htmlFor="amount">金額</label>
              <input
                id="amount"
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0"
                min="1"
                required
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">カテゴリ</label>
              <select
                id="category"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                required
              >
                {filteredCategories.map((cat, index) => (
                  <option key={getRecordId(cat.id) || index} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">説明（任意）</label>
              <input
                id="description"
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="メモを入力..."
              />
            </div>

            {/* Date */}
            <div className="form-group">
              <label htmlFor="date">日付</label>
              <input
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? '保存中...' : '💾 保存する'}
            </button>
          </form>

          {/* Category Pills */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              利用可能なカテゴリ
            </p>
            <div className="category-grid">
              {filteredCategories.slice(0, 6).map((cat, index) => (
                <div
                  key={getRecordId(cat.id) || index}
                  className="category-pill"
                  style={{ borderColor: cat.color }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default App
