'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  requestPasswordResetSchema,
  resetPasswordWithCodeSchema,
  verifyResetCodeSchema,
  type RequestPasswordResetInput,
} from '@/lib/validations/auth';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

type Step = 'request' | 'verify' | 'reset' | 'success';

const codeStepSchema = verifyResetCodeSchema.omit({ email: true, requestId: true });
type CodeStepInput = z.infer<typeof codeStepSchema>;

const resetStepSchema = resetPasswordWithCodeSchema.pick({
  newPassword: true,
  confirmPassword: true,
});
type ResetStepInput = z.infer<typeof resetStepSchema>;

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailForm = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
  });

  const codeForm = useForm<CodeStepInput>({
    resolver: zodResolver(codeStepSchema),
  });

  const resetForm = useForm<ResetStepInput>({
    resolver: zodResolver(resetStepSchema),
  });

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) return null;
    try {
      return new Date(expiresAt).toLocaleTimeString();
    } catch (error) {
      return null;
    }
  }, [expiresAt]);

  const resetFlow = () => {
    setStep('request');
    setEmail('');
    setRequestId(null);
    setCode('');
    setExpiresAt(null);
    setInfoMessage(null);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    emailForm.reset();
    codeForm.reset();
    resetForm.reset();
  };

  const handleCancel = () => {
    resetFlow();
    onBack();
  };

  const handleRequestCode = emailForm.handleSubmit(async (data) => {
    setIsRequesting(true);
    setInfoMessage(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setEmail(data.email);
        setRequestId(result.requestId ?? null);
        setExpiresAt(result.expiresAt ?? null);
        setInfoMessage('Ingresa el código de 6 caracteres que enviamos a tu correo.');
        codeForm.reset();
        setStep('verify');
      } else {
        alert(result.message || 'No pudimos enviar el código de verificación.');
      }
    } catch (error) {
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsRequesting(false);
    }
  });

  const handleVerifyCode = codeForm.handleSubmit(async (data) => {
    if (!requestId) {
      alert('La solicitud de recuperación no es válida. Vuelve a intentarlo.');
      return;
    }

    setIsVerifying(true);
    setInfoMessage(null);
    const normalizedCode = data.code.trim().toUpperCase();

    try {
      const response = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          requestId,
          code: normalizedCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCode(normalizedCode);
        setInfoMessage('Código verificado. Ahora crea una nueva contraseña.');
        resetForm.reset();
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setStep('reset');
      } else {
        codeForm.setError('code', {
          type: 'server',
          message: result.message || 'Código inválido. Revisa e inténtalo de nuevo.',
        });
      }
    } catch (error) {
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  });

  const handleResendCode = async () => {
    if (!email) return;

    setIsResending(true);
    setInfoMessage(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        setRequestId(result.requestId ?? null);
        setExpiresAt(result.expiresAt ?? null);
        setInfoMessage('Generamos un nuevo código. Revisa tu correo nuevamente.');
        codeForm.reset();
      } else {
        alert(result.message || 'No pudimos reenviar el código.');
      }
    } catch (error) {
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = resetForm.handleSubmit(async (data) => {
    if (!requestId || !code) {
      alert('La solicitud de recuperación no es válida. Vuelve a intentarlo.');
      return;
    }

    setIsResetting(true);
    setInfoMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          requestId,
          code,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setInfoMessage(null);
        setStep('success');
      } else {
        alert(result.message || 'No pudimos actualizar tu contraseña.');
      }
    } catch (error) {
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsResetting(false);
    }
  });

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Contraseña actualizada
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tu contraseña se restableció correctamente. Ahora puedes iniciar sesión con tus nuevas
              credenciales.
            </p>
            <button
              onClick={() => {
                resetFlow();
                onBack();
              }}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {step === 'request' && 'Ingresa tu email para recibir un código de verificación.'}
            {step === 'verify' && 'Ingresa el código que enviamos a tu correo electrónico.'}
            {step === 'reset' && 'Crea una nueva contraseña segura para tu cuenta.'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
          {infoMessage && (
            <div className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {infoMessage}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  {...emailForm.register('email')}
                  type="email"
                  id="reset-email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="tu@email.com"
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRequesting}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequesting ? 'Enviando...' : 'Enviar Código'}
                </button>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Enviamos un código a <span className="font-medium">{email}</span>.
                  {formattedExpiry && ` El código expira a las ${formattedExpiry}.`}
                </p>
                <label
                  htmlFor="reset-code"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Código de verificación
                </label>
                <input
                  {...codeForm.register('code')}
                  type="text"
                  id="reset-code"
                  inputMode="text"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="mt-1 block w-full uppercase tracking-[0.3em] px-3 py-2 border border-gray-300 rounded-md text-center text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="AAAA11"
                />
                {codeForm.formState.errors.code && (
                  <p className="mt-1 text-sm text-red-600">
                    {codeForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    resetFlow();
                  }}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cambiar email
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? 'Verificando...' : 'Verificar Código'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                {isResending ? 'Reenviando código...' : 'Reenviar código'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
                Restableciendo contraseña para <span className="font-semibold">{email}</span>
              </div>

              <div>
                <label
                  htmlFor="reset-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    {...resetForm.register('newPassword')}
                    id="reset-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500"
                  >
                    {showNewPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                {resetForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    {...resetForm.register('confirmPassword')}
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Repite tu nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500"
                  >
                    {showConfirmPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('verify');
                    setInfoMessage('Ingresa el código de 6 caracteres que enviamos a tu correo.');
                  }}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cambiar código
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
