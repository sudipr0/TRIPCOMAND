import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { extractError } from '@/lib/api-client';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { SubmitButton } from '@/features/auth/components/SubmitButton';
import { useLogin } from '@/features/auth/hooks/useAuth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: LoginValues) => login.mutate(values);
  const errorMessage = extractError(login.error)?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormAlert message={errorMessage} />
      <FormField htmlFor="email" label="Email address" required error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
      </FormField>
      <FormField htmlFor="password" label="Password" required error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
      </FormField>
      <div className="flex justify-end -mt-1">
        <Link to="/forgot-password" className="text-sm text-accent hover:text-accent-hover hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton loading={login.isPending} loadingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
