/**
 * Zod validation schemas for auth API routes
 * Uses Zod v4 for input validation
 */

import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Register schema
export const registerSchema = z.object({
  email: z.email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      'Password must contain at least one special character'
    ),
  role: z.enum(['admin', 'user', 'agent', 'team', 'corporate'], {
    message: 'Invalid role. Must be one of: admin, user, agent, team, corporate',
  }),
  // Corporate fields (required when role is 'corporate')
  companyName: z.string().optional(),
  workEmail: z.email('Invalid work email format').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  billingAddress: z.string().optional(),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email format').optional(),
  phone: z.string().optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Email or phone number is required',
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().optional(),
  otp: z.string().optional(),
  phone: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      'Password must contain at least one special character'
    ),
}).refine((data) => data.token || (data.otp && data.phone), {
  message: 'Reset token or OTP + phone is required',
});

// OTP login schema
export const otpLoginSchema = z.object({
  phone: z.string().optional(),
  otp: z.string().optional(),
  requestId: z.string().optional(),
}).refine((data) => data.phone || (data.requestId && data.otp), {
  message: 'Phone number or requestId + OTP is required',
});

// 2FA verify schema
export const twoFAVerifySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OtpLoginInput = z.infer<typeof otpLoginSchema>;
export type TwoFAVerifyInput = z.infer<typeof twoFAVerifySchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Validate input against a Zod schema
 * Returns { success, data, errors } for easy use in API routes
 */
export function validateInput<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T; errors: null } | { success: false; data: null; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  const errors = result.error.issues.map(
    (issue) => issue.message || `Validation error at ${issue.path.join('.')}`
  );

  return { success: false, data: null, errors };
}
