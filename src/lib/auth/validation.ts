import { z } from 'zod';
import type { EmailOtpType } from '@supabase/supabase-js';

const normalizedEmailSchema = z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .max(320, 'Seu e-mail e muito longo.')
    .email('Informe um e-mail valido.')
    .transform((value) => value.toLowerCase());

const signInPasswordSchema = z
    .string()
    .min(1, 'Informe sua senha.')
    .max(72, 'Sua senha excede o limite aceito.');

const signUpPasswordSchema = z
    .string()
    .min(8, 'Sua senha deve ter pelo menos 8 caracteres.')
    .max(72, 'Sua senha excede o limite aceito.')
    .regex(/[A-Za-z]/, 'Sua senha precisa ter pelo menos uma letra.')
    .regex(/\d/, 'Sua senha precisa ter pelo menos um numero.');

export const signInSchema = z.object({
    email: normalizedEmailSchema,
    password: signInPasswordSchema,
});

export const signUpSchema = z.object({
    email: normalizedEmailSchema,
    password: signUpPasswordSchema,
});

export const authConfirmSchema = z.object({
    token_hash: z.string().min(1).optional(),
    type: z.enum(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']).optional(),
    next: z.string().optional(),
});

export const authErrorMessages = {
    auth_confirm: 'Nao foi possivel confirmar seu e-mail. Tente abrir o link mais recente enviado para voce.',
    auth_required: 'Faca login para acessar esta area.',
} as const;

export type AuthErrorCode = keyof typeof authErrorMessages;
export type ValidEmailOtpType = EmailOtpType;
export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;

export function getValidationMessage(error: z.ZodError): string {
    return error.issues[0]?.message ?? 'Dados invalidos.';
}

export function sanitizeNextPath(nextPath: string | null | undefined, fallback = '/dashboard'): string {
    if (!nextPath || !nextPath.startsWith('/')) return fallback;
    if (nextPath.startsWith('//')) return fallback;

    try {
        const url = new URL(nextPath, 'http://localhost');
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}
