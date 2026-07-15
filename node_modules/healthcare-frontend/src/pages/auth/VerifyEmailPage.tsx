import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { SuccessMessage } from '@/components/auth/SuccessMessage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/services/api/authApi';
import { ROUTES } from '@/config/constants';
import { getErrorMessage } from '@/utils/formatters';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [errorMsg, setErrorMsg] = useState('This verification link is invalid.');

  useEffect(() => {
    if (!token) return;
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrorMsg(getErrorMessage(err));
        setStatus('error');
      });
  }, [token]);

  return (
    <AuthLayout>
      <AuthCard title={status === 'loading' ? 'Verifying your email…' : ''}>
        {status === 'loading' && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Verifying email…" />
          </div>
        )}

        {status === 'success' && (
          <SuccessMessage
            title="Email verified!"
            message="Your email address has been confirmed. You can now sign in."
            action={
              <Link to={ROUTES.LOGIN}>
                <Button className="w-full">Go to sign in</Button>
              </Link>
            }
          />
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-danger)]/10">
              <svg className="h-7 w-7 text-[var(--brand-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Verification failed</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{errorMsg}</p>
            </div>
            <Link to={ROUTES.LOGIN}>
              <Button variant="secondary">Back to sign in</Button>
            </Link>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
