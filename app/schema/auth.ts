import { z } from 'zod';

const emailField = z
  .string({ required_error: "L'email est obligatoire" })
  .min(1, "L'email est obligatoire")
  .email('Adresse email invalide');

export const loginSchema = z.object({
  email: emailField,
  // À la connexion, on ne révèle pas les règles du mot de passe : présence uniquement.
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(1, 'Le mot de passe est obligatoire'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: emailField,
  // Aligné sur la règle Firebase (minimum 6 caractères).
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});
export type RegisterForm = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
