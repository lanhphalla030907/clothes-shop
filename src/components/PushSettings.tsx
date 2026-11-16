import { useEffect, useState } from 'react';
import {
  isPushSupported,
  getPermissionStatus,
  registerServiceWorker,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
  subscriptionToPayload,
} from '../lib/push/pushService';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushSettingsProps {
  onSubscribe: (payload: ReturnType<typeof subscriptionToPayload>) => Promise<void>;
  onUnsubscribe: (endpoint: string) => Promise<void>;
  isSubscribed: boolean;
  setIsSubscribed: (v: boolean) => void;
}

export function PushSettings({ onSubscribe, onUnsubscribe, isSubscribed, setIsSubscribed }: PushSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>(getPermissionStatus());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      const reg = await registerServiceWorker();
      if (reg && !cancelled) {
        const sub = await getExistingSubscription(reg);
        if (!cancelled) setIsSubscribed(!!sub);
      }
    })();
    return () => { cancelled = true; };
  }, [supported, setIsSubscribed]);

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      const perm = await requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission was not granted.');
        return;
      }
      const reg = await registerServiceWorker();
      if (!reg) throw new Error('Service worker registration failed.');
      const sub = await subscribeToPush(reg, VAPID_PUBLIC_KEY);
      if (!sub) throw new Error('Push subscription failed. Check browser console for details.');
      await onSubscribe(subscriptionToPayload(sub));
      setIsSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await registerServiceWorker();
      if (reg) {
        const sub = await getExistingSubscription(reg);
        if (sub) {
          await onUnsubscribe(sub.endpoint);
          await unsubscribeFromPush(reg);
        }
      }
      setIsSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">
          Push notifications are not supported in this browser. Try Chrome, Edge, Firefox, or Safari 16.4+.
          On iOS, the site must be installed as a Home Screen web app.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
      <p className="text-sm text-gray-600 mb-1">
        Permission: <span className="font-medium">{permission}</span>
      </p>
      <p className="text-sm text-gray-600 mb-3">
        Status: <span className="font-medium">{isSubscribed ? 'Subscribed' : 'Not subscribed'}</span>
      </p>
      {permission === 'denied' && (
        <p className="text-sm text-red-600 mb-3">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="flex gap-2">
        {!isSubscribed ? (
          <button
            onClick={handleEnable}
            disabled={loading || permission === 'denied'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable Push Notifications'}
          </button>
        ) : (
          <button
            onClick={handleDisable}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Disabling...' : 'Disable Push Notifications'}
          </button>
        )}
      </div>
    </div>
  );
}
