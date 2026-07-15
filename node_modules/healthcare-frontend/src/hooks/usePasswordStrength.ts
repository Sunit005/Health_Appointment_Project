import { useMemo } from 'react';

export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'strong' | 'very-strong';

interface PasswordStrength {
  level: StrengthLevel;
  score: number; // 0-4
  label: string;
  color: string;
  width: string;
  checks: { label: string; passed: boolean }[];
}

export function usePasswordStrength(password: string): PasswordStrength {
  return useMemo(() => {
    if (!password) {
      return {
        level: 'empty', score: 0, label: '', color: 'bg-transparent',
        width: '0%', checks: [],
      };
    }

    const checks = [
      { label: 'At least 8 characters', passed: password.length >= 8 },
      { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
      { label: 'Number', passed: /[0-9]/.test(password) },
      { label: 'Special character', passed: /[^A-Za-z0-9]/.test(password) },
    ];

    const score = checks.filter((c) => c.passed).length;

    const map: Record<number, Omit<PasswordStrength, 'checks' | 'score'>> = {
      0: { level: 'weak', label: 'Weak', color: 'bg-red-500', width: '25%' },
      1: { level: 'weak', label: 'Weak', color: 'bg-red-500', width: '25%' },
      2: { level: 'fair', label: 'Fair', color: 'bg-amber-500', width: '50%' },
      3: { level: 'strong', label: 'Strong', color: 'bg-emerald-500', width: '75%' },
      4: { level: 'very-strong', label: 'Very strong', color: 'bg-emerald-600', width: '100%' },
    };

    return { ...map[score], score, checks };
  }, [password]);
}
