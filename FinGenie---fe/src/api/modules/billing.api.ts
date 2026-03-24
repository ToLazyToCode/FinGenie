import { apiClient } from '../client';

export type PaymentGateway = 'PAYOS' | 'VNPAY';
export type PaymentOrderStatus =
  | 'PENDING'
  | 'REDIRECTED'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface BillingPlanResponse {
  planCode: string;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  durationDays: number;
}

export interface BillingCheckoutRequest {
  planCode: string;
  gateway: PaymentGateway;
}

export interface BillingCheckoutResponse {
  orderCode: string;
  planCode: string;
  gateway: PaymentGateway;
  amount: number;
  status: PaymentOrderStatus;
  checkoutUrl: string;
  expiresAt?: string | null;
}

export interface BillingOrderResponse {
  orderCode: string;
  planCode: string;
  planTitle: string;
  gateway: PaymentGateway;
  amount: number;
  status: PaymentOrderStatus;
  checkoutUrl?: string | null;
  gatewayOrderRef?: string | null;
  gatewayTransactionRef?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
}

export const billingApi = {
  getPlans: () => apiClient.get<BillingPlanResponse[]>('/billing/plans'),

  checkout: (payload: BillingCheckoutRequest) =>
    apiClient.post<BillingCheckoutResponse>('/billing/checkout', payload),

  getOrder: (orderCode: string) =>
    apiClient.get<BillingOrderResponse>(`/billing/orders/${encodeURIComponent(orderCode)}`),
};
