import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { ErrorIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractError } from '@/lib/api-client';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { SubmitButton } from '@/features/auth/components/SubmitButton';
import { useResetPassword } from '@/features/auth/hooks/useAuth';

const schema = z
  .object({ password: z.string().min(8, 'Password must be at least 8 characters'), confirmPassword: z.string().min(1, 'Please confirm your password') })
  .refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type ResetPasswordValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const token = params.get('token');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (resetPassword.isSuccess) {
      toast.success('Password reset');
      navigate('/login', { replace: true });
    }
  }, [navigate, resetPassword.isSuccess]);

  if (!token) {
    return (
      <div className="py-5 text-center">
        <ErrorIcon size={32} weight="fill" className="mx-auto text-danger" />
        <h2 className="mt-4 text-lg font-semibold">Invalid reset link</h2>
        <p className="mt-2 text-sm text-fg-muted">This password reset link is missing or no longer valid.</p>
        <Button asChild variant="link" className="mt-6">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = ({ password }: ResetPasswordValues) => resetPassword.mutate({ token, password });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormAlert message={extractError(resetPassword.error)?.message} />
      <FormField htmlFor="password" label="New password" required error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
      </FormField>
      <FormField htmlFor="confirmPassword" label="Confirm password" required error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
      </FormField>
      <SubmitButton loading={resetPassword.isPending} loadingLabel="Updating password...">
        Update password
      </SubmitButton>
    </form>
  );
}
