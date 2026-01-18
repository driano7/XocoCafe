/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 *  Principal Developer: Donovan Riaño
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at:
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  --------------------------------------------------------------------
 *  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 *  Copyright (c) 2025 Xoco Café.
 *  Desarrollador Principal: Donovan Riaño.
 *
 *  Este archivo está licenciado bajo la Apache License 2.0.
 *  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

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
import { useLanguage } from '@/components/Language/LanguageProvider';

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
  const { t } = useLanguage();
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
  const inputClasses = 'brand-input';
  const labelClasses =
    'block text-sm font-semibold tracking-wide text-primary-900 dark:text-primary-100';
  const pageContainerClasses =
    'relative min-h-screen bg-gradient-to-br from-primary-50 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8';

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
        setInfoMessage(
          t('forgot_password.email_sent') ||
            'Ingresa el código de 6 caracteres que enviamos a tu correo.'
        );
        codeForm.reset();
        setStep('verify');
      } else {
        alert(
          result.message ||
            t('auth.errors.send_failed') ||
            'No pudimos enviar el código de verificación.'
        );
      }
    } catch (error) {
      alert(t('auth.errors.connection') || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsRequesting(false);
    }
  });

  const handleVerifyCode = codeForm.handleSubmit(async (data) => {
    if (!requestId) {
      alert(
        t('auth.errors.invalid_request') ||
          'La solicitud de recuperación no es válida. Vuelve a intentarlo.'
      );
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
        setInfoMessage(
          t('forgot_password.code_verified') ||
            'Código verificado. Ahora crea una nueva contraseña.'
        );
        resetForm.reset();
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setStep('reset');
      } else {
        codeForm.setError('code', {
          type: 'server',
          message:
            result.message ||
            t('auth.errors.invalid_code') ||
            'Código inválido. Revisa e inténtalo de nuevo.',
        });
      }
    } catch (error) {
      alert(t('auth.errors.connection') || 'Error de conexión. Inténtalo de nuevo.');
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
        setInfoMessage(
          t('forgot_password.new_code_generated') ||
            'Generamos un nuevo código. Revisa tu correo nuevamente.'
        );
        codeForm.reset();
      } else {
        alert(result.message || t('auth.errors.resend_failed') || 'No pudimos reenviar el código.');
      }
    } catch (error) {
      alert(t('auth.errors.connection') || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = resetForm.handleSubmit(async (data) => {
    if (!requestId || !code) {
      alert(
        t('auth.errors.invalid_request') ||
          'La solicitud de recuperación no es válida. Vuelve a intentarlo.'
      );
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
        alert(
          result.message || t('auth.errors.reset_failed') || 'No pudimos actualizar tu contraseña.'
        );
      }
    } catch (error) {
      alert(t('auth.errors.connection') || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsResetting(false);
    }
  });

  if (step === 'success') {
    return (
      <div className={pageContainerClasses}>
        <div className="mx-auto max-w-lg">
          <div className="brand-auth-card text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-100">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-primary-900 dark:text-white">
              {t('forgot_password.success_title') || 'Contraseña actualizada'}
            </h2>
            <p className="text-sm text-primary-800/80 dark:text-primary-100/80">
              {t('forgot_password.success_desc') ||
                'Tu contraseña se restableció correctamente. Ahora puedes iniciar sesión con tus nuevas credenciales.'}
            </p>
            <button
              onClick={() => {
                resetFlow();
                onBack();
              }}
              className="brand-primary-btn"
            >
              {t('forgot_password.back_to_login') || 'Volver al Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageContainerClasses}>
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <div>
          <h2 className="mt-6 text-center text-4xl font-black text-primary-900 dark:text-white">
            {t('forgot_password.title') || 'Recuperar Contraseña'}
          </h2>
          <p className="mt-2 text-center text-sm text-primary-800/80 dark:text-primary-100/80">
            {step === 'request' &&
              (t('forgot_password.request_desc') ||
                'Ingresa tu email para recibir un código de verificación.')}
            {step === 'verify' &&
              (t('forgot_password.verify_desc') ||
                'Ingresa el código que enviamos a tu correo electrónico.')}
            {step === 'reset' &&
              (t('forgot_password.reset_desc') ||
                'Crea una nueva contraseña segura para tu cuenta.')}
          </p>
        </div>

        <div className="brand-auth-card space-y-6">
          {infoMessage && (
            <div className="rounded-2xl border border-primary-100/70 bg-primary-50/80 px-4 py-3 text-sm font-medium text-primary-900 dark:border-primary-900/30 dark:bg-primary-900/10 dark:text-primary-100">
              {infoMessage}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className={labelClasses}>
                  {t('forgot_password.email_label') || 'Email'}
                </label>
                <input
                  {...emailForm.register('email')}
                  type="email"
                  id="reset-email"
                  className={inputClasses}
                  placeholder={t('auth.email_placeholder') || 'tu@email.com'}
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <button type="button" onClick={handleCancel} className="brand-secondary-btn flex-1">
                  {t('orders.cancel') || 'Cancelar'}
                </button>
                <button type="submit" disabled={isRequesting} className="brand-primary-btn flex-1">
                  {isRequesting
                    ? t('forgot_password.sending') || 'Enviando...'
                    : t('forgot_password.send_code_btn') || 'Enviar Código'}
                </button>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <p className="mb-2 text-sm text-primary-800/80 dark:text-primary-100/90">
                  {t('forgot_password.sending_to_email') || 'Enviamos un código a'}{' '}
                  <span className="font-medium">{email}</span>.
                  {formattedExpiry &&
                    ` ${(
                      t('forgot_password.code_expiry') || 'El código expira a las {time}.'
                    ).replace('{time}', formattedExpiry)}`}
                </p>
                <label htmlFor="reset-code" className={labelClasses}>
                  {t('forgot_password.code_label') || 'Código de verificación'}
                </label>
                <input
                  {...codeForm.register('code')}
                  type="text"
                  id="reset-code"
                  inputMode="text"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className={`${inputClasses} text-center text-lg font-black uppercase tracking-[0.35em]`}
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
                  className="brand-secondary-btn flex-1"
                >
                  {t('forgot_password.change_email') || 'Cambiar email'}
                </button>
                <button type="submit" disabled={isVerifying} className="brand-primary-btn flex-1">
                  {isVerifying
                    ? t('forgot_password.verifying') || 'Verificando...'
                    : t('forgot_password.verify_code_btn') || 'Verificar Código'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="brand-tertiary-btn w-full justify-center disabled:opacity-50"
              >
                {isResending
                  ? t('forgot_password.resending') || 'Reenviando código...'
                  : t('forgot_password.resend_btn') || 'Reenviar código'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="rounded-2xl border border-primary-100/70 bg-primary-50/80 px-4 py-3 text-sm font-semibold text-primary-900 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-100">
                {(
                  t('forgot_password.resetting_for') || 'Restableciendo contraseña para {email}'
                ).replace('{email}', email)}
              </div>

              <div>
                <label htmlFor="reset-password" className={labelClasses}>
                  {t('forgot_password.new_password_label') || 'Nueva contraseña'}
                </label>
                <div className="relative">
                  <input
                    {...resetForm.register('newPassword')}
                    id="reset-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className={inputClasses}
                    placeholder={
                      t('auth.password_register_placeholder') ||
                      'Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 hover:text-primary-500 dark:text-primary-200"
                  >
                    {showNewPassword ? t('profile.hide') || 'Ocultar' : t('profile.view') || 'Ver'}
                  </button>
                </div>
                {resetForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className={labelClasses}>
                  {t('forgot_password.confirm_password_label') || 'Confirmar contraseña'}
                </label>
                <div className="relative">
                  <input
                    {...resetForm.register('confirmPassword')}
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={inputClasses}
                    placeholder={
                      t('auth.confirm_password_placeholder') || 'Repite tu nueva contraseña'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 hover:text-primary-500 dark:text-primary-200"
                  >
                    {showConfirmPassword
                      ? t('profile.hide') || 'Ocultar'
                      : t('profile.view') || 'Ver'}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('verify');
                    setInfoMessage(
                      t('forgot_password.email_sent') ||
                        'Ingresa el código de 6 caracteres que enviamos a tu correo.'
                    );
                  }}
                  className="brand-secondary-btn flex-1"
                >
                  {t('forgot_password.change_code') || 'Cambiar código'}
                </button>
                <button type="submit" disabled={isResetting} className="brand-primary-btn flex-1">
                  {isResetting
                    ? t('forgot_password.sending') || 'Guardando...'
                    : t('forgot_password.update_password_btn') || 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
