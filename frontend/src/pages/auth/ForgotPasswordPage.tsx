import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SuccessMessage } from '@/components/auth/SuccessMessage';
import { useAuth } from '@/hooks/useAuth';
import { forgotPasswordSchema } from '@/utils/validation';
import { ROUTES } from '@/config/constants';
import type { ForgotPasswordInput } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const { forgotPasswordAsync, isSendingReset, forgotPasswordSuccess } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    await forgotPasswordAsync(data.email);
  };

  if (forgotPasswordSuccess) {
    return (
      <AuthLayout>
        <AuthCard title="">
          <SuccessMessage
            title="Check your inbox"
            message="If an account exists for that email, we've sent a password reset link. It expires in 1 hour."
            action={
              <Link to={ROUTES.LOGIN}>
                <Button variant="secondary" className="w-full">Back to sign in</Button>
              </Link>
            }
          />
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" isLoading={isSendingReset} className="w-full">
            Send reset link
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          <Link to={ROUTES.LOGIN} className="text-[var(--brand-primary)] hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
