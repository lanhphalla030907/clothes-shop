import { apiDelete, apiGetList, apiPost } from '../api/client';
import { API } from '../api/config';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

interface RegisterPushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

interface PushSubscriptionRecord {
  id: string;
  isActive?: boolean;
}

export const toRegisterPushSubscriptionRequest = (
  payload: PushSubscriptionPayload,
): RegisterPushSubscriptionRequest => {
  const body: RegisterPushSubscriptionRequest = {
    endpoint: payload.endpoint,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth,
  };
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  if (typeof userAgent === 'string' && userAgent.length > 0) {
    body.userAgent = userAgent;
  }
  return body;
};

export async function registerPushSubscription(payload: PushSubscriptionPayload): Promise<void> {
  await apiPost(API.pushSubscriptions, toRegisterPushSubscriptionRequest(payload));
}

export async function revokePushSubscription(endpoint: string): Promise<void> {
  // Backend exposes subscription ids, not endpoints. Revoke the active server
  // subscription record(s) using the authenticated client.
  const subs = await apiGetList<PushSubscriptionRecord>(API.pushSubscriptions);
  const targets = subs.filter((sub) => sub.id && sub.isActive !== false);
  await Promise.all(targets.map((sub) => apiDelete(`${API.pushSubscriptions}/${sub.id}`)));
  void endpoint;
}
