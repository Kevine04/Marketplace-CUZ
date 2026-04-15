import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../components/Card';
import { validateAuthInput } from '../utils/auth';
import type { Role, UserAccount } from '../types';

type AuthScreenProps = {
  onLogin: (account: UserAccount) => void;
};

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [role, setRole] = useState<Role>('buyer');

  const handleSubmit = () => {
    const message = validateAuthInput(email, studentId);
    if (message) {
      Alert.alert('Unable to continue', message);
      return;
    }

    onLogin({
      email: email.trim().toLowerCase(),
      studentId: studentId.trim(),
      role,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Card>
        <Text style={styles.pageTitle}>Marketplace CUZ</Text>
        <Text style={styles.subtitle}>
          Student marketplace where buyers and sellers trade on campus without language or confidence barriers.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Student Gmail address"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={studentId}
          onChangeText={setStudentId}
          placeholder="Student ID number"
          style={styles.input}
        />

        <View style={styles.row}>
          <RoleButton label="Buyer" active={role === 'buyer'} onPress={() => setRole('buyer')} />
          <RoleButton label="Seller" active={role === 'seller'} onPress={() => setRole('seller')} />
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryLabel}>Create Account / Login</Text>
        </Pressable>
      </Card>
    </SafeAreaView>
  );
}

function RoleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.roleButton, active ? styles.roleButtonActive : undefined]}>
      <Text style={[styles.roleText, active ? styles.roleTextActive : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    padding: 16,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#555',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#adb5bd',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  roleText: {
    color: '#495057',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#198754',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});
