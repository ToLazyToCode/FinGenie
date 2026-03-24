import type { PaymentGateway, PaymentOrderStatus } from '../api/modules';

export interface BillingReturnRouteParams {
  orderCode: string;
  gateway?: PaymentGateway | string;
  status?: PaymentOrderStatus | string;
}

export const BILLING_RETURN_URL = 'fingenie://redirect/payment';

export function parseBillingReturnUrl(url: string | null | undefined): BillingReturnRouteParams | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', '').toLowerCase();
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    const isFinGenieReturn =
      scheme === 'fingenie' &&
      host === 'redirect' &&
      path === '/payment';

    if (!isFinGenieReturn) {
      return null;
    }

    const orderCode = parsed.searchParams.get('orderCode')?.trim();
    if (!orderCode) {
      return null;
    }

    return {
      orderCode,
      gateway: parsed.searchParams.get('gateway')?.trim() || undefined,
      status: parsed.searchParams.get('status')?.trim() || undefined,
    };
  } catch {
    return null;
  }
}
