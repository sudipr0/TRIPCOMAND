import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { SaveIcon, UncheckedIcon } from '@/components/icons';
import { extractError } from '@/lib/api-client';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { SubmitButton } from '@/features/auth/components/SubmitButton';
import { useRegister } from '@/features/auth/hooks/useAuth';

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type RegisterValues = z.infer<typeof schema>;

function PasswordHint({ valid, children }: { valid: boolean; children: React.ReactNode }) {
  const Icon = valid ? SaveIcon : UncheckedIcon;
  return (
    <li className={valid ? 'text-[hsl(152_60%_28%)]' : 'text-fg-subtle'}>
      <Icon size={12} weight={valid ? 'bold' : 'regular'} className="shrink-0" />
      <span>{children}</span>
    </li>
  );
}

export function RegisterForm() {
  const registerAccount = useRegister();
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });
  const password = watch('password', '');
  const errorMessage = extractError(registerAccount.error)?.message;

  const onSubmit = ({ confirmPassword: _confirmPassword, ...values }: RegisterValues) => registerAccount.mutate(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormAlert message={errorMessage} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField htmlFor="firstName" label="First name" required error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} {...register('firstName')} />
        </FormField>
        <FormField htmlFor="lastName" label="Last name" required error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} {...register('lastName')} />
        </FormField>
      </div>
      <FormField htmlFor="email" label="Email address" required error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
      </FormField>
      <FormField htmlFor="password" label="Password" required error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
        <ul className="mt-2 grid gap-1 text-xs">
          <PasswordHint valid={password.length >= 8}>At least 8 characters</PasswordHint>
          <PasswordHint valid={/[0-9]/.test(password)}>At least 1 number</PasswordHint>
          <PasswordHint valid={/[A-Z]/.test(password)}>At least 1 uppercase letter</PasswordHint>
        </ul>
      </FormField>
      <FormField htmlFor="confirmPassword" label="Confirm password" required error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
      </FormField>
      <SubmitButton loading={registerAccount.isPending} loadingLabel="Creating account...">
        Create account
      </SubmitButton>
    </form>
  );
}
