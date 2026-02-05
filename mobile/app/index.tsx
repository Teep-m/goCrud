// Home Screen - Transaction List and Summary

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useApi } from '../src/hooks/useApi';
import { SummaryCard } from '../src/components/SummaryCard';
import { TransactionItem } from '../src/components/TransactionItem';
import { colors, spacing, borderRadius, fontSize } from '../src/constants/theme';
import { formatCurrency } from '../src/utils/helpers';

export default function HomeScreen() {
  const {
    transactions,
    categories,
    summary,
    loading,
    error,
    fetchData,
    deleteTransaction,
  } = useApi();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            tintColor={colors.accentPrimary}
          />
        }
      >
        {/* Balance Header */}
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>総残高</Text>
          <Text style={styles.balanceValue}>
            {summary ? formatCurrency(summary.balance) : '¥0'}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard
            type="income"
            label="今月の収入"
            amount={summary?.total_income || 0}
            icon="📈"
          />
          <SummaryCard
            type="expense"
            label="今月の支出"
            amount={summary?.total_expense || 0}
            icon="📉"
          />
        </View>

        {/* Transaction List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 取引履歴</Text>
            <Text style={styles.sectionCount}>{transactions.length} 件</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {sortedTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>まだ取引がありません</Text>
            </View>
          ) : (
            sortedTransactions.map((tx, index) => (
              <TransactionItem
                key={tx.id?.ID || tx.id || index}
                transaction={tx}
                categories={categories}
                onDelete={deleteTransaction}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB - Add Transaction */}
      <Link href="/add" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  balanceLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.balanceColor,
    marginTop: spacing.xs,
  },
  summaryGrid: {
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorContainer: {
    backgroundColor: colors.expenseBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.expenseColor,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '300',
  },
});
