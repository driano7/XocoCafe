import { z } from 'zod';

// Esquemas de validación para registro
export const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
      .regex(/[!@#$%^&*]/, 'La contraseña debe contener al menos un caracter especial (!@#$%^&*)'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'El nombre es obligatorio'),
    lastName: z.string().min(1, 'El apellido es obligatorio'),
    walletAddress: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    termsAndPrivacyAccepted: z.boolean().refine((val) => val === true, {
      message: 'Debes aceptar los términos y condiciones y la política de privacidad',
    }),
    marketingEmail: z.boolean().optional(),
    marketingPush: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// Esquema de validación para login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const passwordResetCodeSchema = z
  .string()
  .min(6, 'El código debe tener 6 caracteres')
  .max(6, 'El código debe tener 6 caracteres')
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => /^[A-Z0-9]{6}$/.test(value), {
    message: 'Código de verificación inválido',
  });

// Esquema para actualizar perfil
export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  walletAddress: z.string().optional(),
  avatarUrl: z.string().url('URL de avatar inválida').optional(),
});

// Esquema para actualizar consentimientos
export const updateConsentSchema = z.object({
  marketingEmail: z.boolean(),
  marketingSms: z.boolean(),
  marketingPush: z.boolean(),
});

// Esquema para completar perfil después de Google OAuth
export const completeProfileSchema = z.object({
  phone: z.string().optional(),
  walletAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  termsAndPrivacyAccepted: z.boolean().refine((val) => val === true, {
    message: 'Debes aceptar los términos y condiciones y la política de privacidad',
  }),
  marketingEmail: z.boolean().optional(),
  marketingPush: z.boolean().optional(),
});

// Esquema para recuperar contraseña
export const requestPasswordResetSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().email('Email inválido'),
  requestId: z.string().min(1, 'Solicitud inválida'),
  code: passwordResetCodeSchema,
});

export const resetPasswordWithCodeSchema = z
  .object({
    email: z.string().email('Email inválido'),
    requestId: z.string().min(1, 'Solicitud inválida'),
    code: passwordResetCodeSchema,
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// Esquema para cambiar contraseña
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// Esquema para dirección
export const addressSchema = z.object({
  type: z.enum(['shipping', 'billing']),
  street: z.string().min(1, 'La dirección es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'El código postal es requerido'),
  country: z.string().min(1, 'El país es requerido'),
  isDefault: z.boolean().optional(),
});

// Tipos TypeScript derivados de los esquemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export const forgotPasswordSchema = requestPasswordResetSchema;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordWithCodeInput = z.infer<typeof resetPasswordWithCodeSchema>;
export type ForgotPasswordInput = RequestPasswordResetInput;

export const userFeedbackSchema = z.object({
  rating: z
    .number({
      required_error: 'Selecciona una calificación',
      invalid_type_error: 'Selecciona una calificación válida',
    })
    .min(1, 'La calificación mínima es 1')
    .max(5, 'La calificación máxima es 5'),
  title: z
    .string()
    .max(120, 'El título debe tener máximo 120 caracteres')
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  content: z
    .string()
    .min(10, 'Cuéntanos con al menos 10 caracteres')
    .max(2000, 'El comentario es demasiado largo')
    .transform((value) => value.trim()),
});

export type UserFeedbackInput = z.infer<typeof userFeedbackSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

// Tipos para la respuesta de autenticación
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    clientId: string;
    firstName?: string;
    lastName?: string;
  };
  token?: string;
}

// Tipos para el usuario en el contexto de autenticación
export interface AuthUser {
  id: string;
  email: string;
  clientId: string;
  firstName?: string | null;
  lastName?: string | null;
  authProvider?: string | null;
  walletAddress?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  avatarStoragePath?: string | null;
  favoriteColdDrink?: string | null;
  favoriteHotDrink?: string | null;
  favoriteFood?: string | null;
  weeklyCoffeeCount?: number;
  monthlyMetrics?: any;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingPush: boolean;
}
