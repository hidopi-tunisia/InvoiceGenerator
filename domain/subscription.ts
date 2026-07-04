import { request } from './http';

// Types alignés sur le contrat API.md §4-5 (routes /subscription).

export type SubPlan = 'trial' | 'starter' | 'pro' | 'enterprise';
export type SubStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export type SubscriptionUsage = {
  plan: SubPlan;
  status: SubStatus;
  invoicesThisMonth: number;
  quotesThisMonth: number;
  invoiceLimit: number | null; // null = illimité
  quoteLimit: number | null;
  pdfEnabled: boolean;
  trialEndDate?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};

export type Plan = {
  name: SubPlan;
  pricing: {
    billedMonthly: { price: number };
    billedYearly: { pricePerMonth: number; total: number; discountPercent: number };
    currency: 'EUR';
  };
  limits: {
    invoicesPerMonth: number | null;
    quotesPerMonth: number | null;
    pdfGeneration: boolean;
  };
};

const getSubscriptionUsage = () => request<SubscriptionUsage>('/subscription/usage');

/** Public — tarifs tirés de Stripe côté serveur (cache 1 h). */
const getPlans = () => request<Plan[]>('/subscription/plans');

export { getSubscriptionUsage, getPlans };
