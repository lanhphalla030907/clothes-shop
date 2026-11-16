import { describe, expect, it, vi } from 'vitest';

import { API } from '../api/config';
import { apiPost } from '../api/client';
import { registerPushSubscription, toRegisterPushSubscriptionRequest } from './pushApi';

vi.mock('../api/client', () => ({
  apiPost: vi.fn(),
  apiGetList: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('pushApi', () => {
  it('maps browser PushSubscription payload to backend DTO shape', () => {
    const userAgentSpy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-agent');

    const body = toRegisterPushSubscriptionRequest({
      endpoint: 'https://push.example.test/subscription/1',
      keys: {
        p256dh: 'p256dh-key',
        auth: 'auth-secret',
      },
    });

    expect(body).toEqual({
      endpoint: 'https://push.example.test/subscription/1',
      p256dh: 'p256dh-key',
      auth: 'auth-secret',
      userAgent: 'test-agent',
    });
    expect(body).not.toHaveProperty('keys');

    userAgentSpy.mockRestore();
  });

  it('posts normalized subscription payload via authenticated API client', async () => {
    const userAgentSpy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-agent');
    vi.mocked(apiPost).mockResolvedValue(undefined);

    await registerPushSubscription({
      endpoint: 'https://push.example.test/subscription/2',
      keys: {
        p256dh: 'p256dh-key-2',
        auth: 'auth-secret-2',
      },
    });

    expect(apiPost).toHaveBeenCalledWith(API.pushSubscriptions, {
      endpoint: 'https://push.example.test/subscription/2',
      p256dh: 'p256dh-key-2',
      auth: 'auth-secret-2',
      userAgent: 'test-agent',
    });

    userAgentSpy.mockRestore();
  });
});
