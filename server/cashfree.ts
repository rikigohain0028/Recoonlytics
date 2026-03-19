import { log } from "./index";

const isProd = process.env.CASHFREE_ENV === "prod";
const CASHFREE_BASE = isProd
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const APP_ID = process.env.CASHFREE_APP_ID || "";
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "";
const API_VERSION = "2023-08-01";

function cfHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": APP_ID,
    "x-client-secret": SECRET_KEY,
  };
}

export interface CreateOrderParams {
  orderId: string;
  amount: number;
  currency: string;
  userId: string;
  userEmail: string;
  userPhone?: string;
  returnUrl: string;
  orderNote?: string;
}

export interface CashfreeOrderResponse {
  order_id: string;
  order_status: string;
  payment_session_id: string;
  order_amount: number;
  order_currency: string;
  order_token?: string;
  message?: string;
}

export interface CashfreeOrderStatus {
  order_id: string;
  order_status: string;   // ACTIVE | PAID | EXPIRED | TERMINATED
  order_amount: number;
  order_currency: string;
  cf_order_id?: number;
  message?: string;
}

export async function createCashfreeOrder(params: CreateOrderParams): Promise<CashfreeOrderResponse> {
  const body = {
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: params.currency,
    customer_details: {
      customer_id: params.userId,
      customer_email: params.userEmail,
      customer_phone: params.userPhone || "9999999999",
    },
    order_meta: {
      return_url: params.returnUrl,
    },
    order_note: params.orderNote || "Recoonlytics Pro Plan",
  };

  log(`Cashfree createOrder → ${CASHFREE_BASE}/orders, env=${isProd ? "prod" : "sandbox"}`);

  const res = await fetch(`${CASHFREE_BASE}/orders`, {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json() as CashfreeOrderResponse;
  if (!res.ok) {
    log(`Cashfree createOrder error: ${JSON.stringify(data)}`);
    throw new Error(data.message || "Failed to create Cashfree order");
  }
  return data;
}

export async function getCashfreeOrderStatus(orderId: string): Promise<CashfreeOrderStatus> {
  log(`Cashfree getOrderStatus → ${CASHFREE_BASE}/orders/${orderId}`);

  const res = await fetch(`${CASHFREE_BASE}/orders/${orderId}`, {
    method: "GET",
    headers: cfHeaders(),
  });

  const data = await res.json() as CashfreeOrderStatus;
  if (!res.ok) {
    log(`Cashfree getOrderStatus error: ${JSON.stringify(data)}`);
    throw new Error(data.message || "Failed to get Cashfree order status");
  }
  return data;
}
