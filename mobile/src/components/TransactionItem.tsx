// Transaction Item Component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme';
import { formatCurrency, formatDate, getRecordId } from '../utils/helpers';
import { Transaction, Category } from '../types';

interface TransactionItemProps {
  transaction: Transaction;
  categories: Category[];
  onDelete: (id: string) => void;
}

export function TransactionItem({ transaction, categories, onDelete }: TransactionItemProps) {
  const categoryInfo = categories.find(c => c.name === transaction.category);
  const isIncome = transaction.type === 'income';

  const handleDelete = () => {
    Alert.alert(
      '削除確認',
      'この取引を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => onDelete(getRecordId(transaction.id))
        }
      ]
    );
  };

  return (
    <TouchableOpacity onLongPress={handleDelete} style={styles.container}>
      <View style={[
        styles.iconContainer,
        { backgroundColor: isIncome ? colors.incomeBg : colors.expenseBg }
      ]}>
        <Text style={styles.icon}>
          {categoryInfo?.icon || (isIncome ? '💰' : '💸')}
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.category}>{transaction.category}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || '説明なし'}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={[
          styles.amount,
          { color: isIncome ? colors.incomeColor : colors.expenseColor }
        ]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgGlass,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  details: {
    flex: 1,
  },
  category: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  meta: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
