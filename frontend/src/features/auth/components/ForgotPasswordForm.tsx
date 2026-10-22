import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { SuccessIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractError } from '@/lib/api-client';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { SubmitButton } from '@/features/auth/components/SubmitButton';
import { useForgotPassword } from '@/features/auth/hooks/useAuth';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });
type ForgotPasswordValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(schema) });

  if (submittedEmail) {
    return (
      <div className="py-5 text-center">
        <SuccessIcon size={32} weight="fill" className="mx-auto text-accent" />
        <h2 className="mt-4 text-lg font-semibold">Check your email</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
          If an account exists for {submittedEmail}, you'll receive reset instructions.
        </p>
        <Button asChild variant="link" className="mt-6">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = (values: ForgotPasswordValues) => {
    forgotPassword.mutate(values.email, { onSuccess: () => setSubmittedEmail(values.email) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormAlert message={extractError(forgotPassword.error)?.message} />
      <FormField htmlFor="email" label="Email address" required error={errors.email?.message} hint="We'll send a secure reset link if the account exists.">
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
      </FormField>
      <SubmitButton loading={forgotPassword.isPending} loadingLabel="Sending link...">
        Send reset link
      </SubmitButton>
    </form>
  );
}
