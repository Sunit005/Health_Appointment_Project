import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, Link } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { resetPasswordSchema } from '@/utils/validation';
import { ROUTES } from '@/config/constants';
import { getErrorMessage } from '@/utils/formatters';
import { z } from 'zod';

type FormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { resetPasswordAsync, isResettingPassword } = useAuth();

  const {
    register, handleSubmit, control,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const password = useWatch({ control, name: 'password' });

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard title="Invalid link">
          <p className="text-sm text-[var(--text-secondary)]">This password reset link is invalid or has expired.</p>
          <Link to={ROUTES.FORGOT_PASSWORD} className="mt-4 block text-center text-sm text-[var(--brand-primary)] hover:underline">
            Request a new link
          </Link>
        </AuthCard>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      await resetPasswordAsync({ token: data.token, password: data.password, confirmPassword: data.confirmPassword });
    } catch (err) {
      setError('root', { message: getErrorMessage(err) });
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Set new password" subtitle="Choose a strong password for your account">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormError message={errors.root?.message} />
          <input type="hidden" {...register('token')} />

          <div>
            <PasswordInput label="New password" autoComplete="new-password" required placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <PasswordStrengthIndicator password={password ?? ''} />
          </div>

          <PasswordInput label="Confirm new password" autoComplete="new-password" required placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

          <Button type="submit" isLoading={isResettingPassword} className="w-full mt-1">
            Reset password
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
