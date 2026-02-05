// Add Transaction Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useApi } from '../src/hooks/useApi';
import { colors, spacing, borderRadius, fontSize } from '../src/constants/theme';
import { formatDateForInput } from '../src/utils/helpers';

export default function AddTransactionScreen() {
  const { categories, fetchData, createTransaction } = useApi();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [submitting, setSubmitting] = useState(false);

  // Load categories on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.type === type);

  // Set default category when type changes
  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.some(c => c.name === category)) {
      setCategory(filteredCategories[0].name);
    }
  }, [type, filteredCategories, category]);

  const handleSubmit = async () => {
    if (!amount || !category) {
      Alert.alert('エラー', '金額とカテゴリを入力してください');
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('エラー', '正しい金額を入力してください');
      return;
    }

    setSubmitting(true);
    const success = await createTransaction({
      type,
      amount: parsedAmount,
      category,
      description,
      date,
    });

    setSubmitting(false);

    if (success) {
      router.back();
    } else {
      Alert.alert('エラー', '取引の保存に失敗しました');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && styles.typeButtonExpenseActive,
            ]}
            onPress={() => setType('expense')}
          >
            <Text style={[
              styles.typeButtonText,
              type === 'expense' && styles.typeButtonTextActive,
            ]}>
              📉 支出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && styles.typeButtonIncomeActive,
            ]}
            onPress={() => setType('income')}
          >
            <Text style={[
              styles.typeButtonText,
              type === 'income' && styles.typeButtonTextActive,
            ]}>
              📈 収入
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>金額</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        {/* Category Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>カテゴリ</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
              dropdownIconColor={colors.textSecondary}
            >
              {filteredCategories.map((cat) => (
                <Picker.Item
                  key={cat.id?.ID || cat.id || cat.name}
                  label={`${cat.icon} ${cat.name}`}
                  value={cat.name}
                  color={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>説明（任意）</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="メモを入力..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Date Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>日付</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Category Pills Preview */}
        <View style={styles.categoryPreview}>
          <Text style={styles.categoryPreviewLabel}>利用可能なカテゴリ</Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.slice(0, 6).map((cat) => (
              <TouchableOpacity
                key={cat.id?.ID || cat.id || cat.name}
                style={[
                  styles.categoryPill,
                  category === cat.name && styles.categoryPillActive,
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                <Text style={styles.categoryPillText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? '保存中...' : '💾 保存する'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  typeButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.borderColor,
    alignItems: 'center',
  },
  typeButtonExpenseActive: {
    backgroundColor: colors.expenseBg,
    borderColor: colors.expenseColor,
  },
  typeButtonIncomeActive: {
    backgroundColor: colors.incomeBg,
    borderColor: colors.incomeColor,
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.textPrimary,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  pickerContainer: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderColor,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
    backgroundColor: 'transparent',
  },
  categoryPreview: {
    marginBottom: spacing.xl,
  },
  categoryPreviewLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgGlass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  categoryPillActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  categoryPillIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  categoryPillText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.accentPrimary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
