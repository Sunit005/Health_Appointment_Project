import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema } from '@/utils/validation';
import { ROUTES } from '@/config/constants';
import type { RegisterInput } from '@/utils/validation';
import { getErrorMessage } from '@/utils/formatters';

export default function RegisterPage() {
  const { registerAsync, isRegistering } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '', password: '', confirmPassword: '',
      firstName: '', lastName: '', phoneNumber: '',
      dob: '', termsAccepted: false,
    },
  });

  const password = useWatch({ control, name: 'password' });

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerAsync(data);
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Create your account" subtitle="Join Healthcare Manager — it's free" className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormError message={errors.root?.message} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" required placeholder="John" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last name" required placeholder="Doe" error={errors.lastName?.message} {...register('lastName')} />
          </div>

          <Input label="Email address" type="email" autoComplete="email" required placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
          <Input label="Phone number" type="tel" placeholder="+1 234 567 890" error={errors.phoneNumber?.message} {...register('phoneNumber')} />
          <Input label="Date of birth" type="date" required error={errors.dob?.message} {...register('dob')} />

          <div>
            <PasswordInput label="Password" autoComplete="new-password" required placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <PasswordStrengthIndicator password={password ?? ''} />
          </div>

          <PasswordInput label="Confirm password" autoComplete="new-password" required placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-subtle)] accent-[var(--brand-primary)]"
              {...register('termsAccepted')}
              aria-describedby={errors.termsAccepted ? 'terms-error' : undefined}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              I agree to the{' '}
              <a href="#" className="text-[var(--brand-primary)] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[var(--brand-primary)] hover:underline">Privacy Policy</a>
            </span>
          </label>
          {errors.termsAccepted && (
            <p id="terms-error" role="alert" className="text-xs text-[var(--brand-danger)]">{errors.termsAccepted.message}</p>
          )}

          <Button type="submit" isLoading={isRegistering} className="mt-1 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-[var(--brand-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
