import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/utils/validation';
import { ROUTES } from '@/config/constants';
import type { LoginInput } from '@/utils/validation';
import { getErrorMessage } from '@/utils/formatters';

export default function LoginPage() {
  const { loginAsync, isLoggingIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    clearErrors,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await loginAsync({ email: data.email, password: data.password });
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  const handleQuickLogin = (role: 'patient' | 'doctor' | 'admin') => {
    let email = '';
    let password = '';
    if (role === 'patient') {
      email = 'patient@healthcare.dev';
      password = 'Patient123!';
    } else if (role === 'doctor') {
      email = 'aarav.sharma@healthcare.dev';
      password = 'Doctor123!';
    } else if (role === 'admin') {
      email = 'admin@healthcare.dev';
      password = 'Admin123!';
    }
    setValue('email', email);
    setValue('password', password);
    clearErrors();
  };

  return (
    <AuthLayout>
      <AuthCard title="Welcome back" subtitle="Sign in to your account to continue">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Quick Sign In Options</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleQuickLogin('patient')}
              className="text-xs py-2"
            >
              Patient
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleQuickLogin('doctor')}
              className="text-xs py-2"
            >
              Doctor
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleQuickLogin('admin')}
              className="text-xs py-2"
            >
              Admin
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormError message={errors.root?.message} />

          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Password <span className="text-[var(--brand-danger)]" aria-hidden="true">*</span></label>
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-xs text-[var(--brand-primary)] hover:underline focus-visible:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              autoComplete="current-password"
              required
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--brand-primary)]"
              {...register('rememberMe')}
            />
            <span className="text-sm text-[var(--text-secondary)]">Remember me</span>
          </label>

          <Button type="submit" isLoading={isLoggingIn} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="font-medium text-[var(--brand-primary)] hover:underline focus-visible:underline">
            Create one
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
