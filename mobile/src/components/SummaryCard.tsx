// Summary Card Component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme';
import { formatCurrency } from '../utils/helpers';

interface SummaryCardProps {
  type: 'income' | 'expense' | 'balance';
  label: string;
  amount: number;
  icon: string;
}

export function SummaryCard({ type, label, amount, icon }: SummaryCardProps) {
  const getAccentColor = () => {
    switch (type) {
      case 'income':
        return colors.incomeColor;
      case 'expense':
        return colors.expenseColor;
      case 'balance':
        return colors.accentPrimary;
    }
  };

  return (
    <View style={[styles.card, { borderTopColor: getAccentColor() }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: getAccentColor() }]}>
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderTopWidth: 3,
    borderColor: colors.borderColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
});
