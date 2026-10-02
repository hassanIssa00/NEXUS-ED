'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api/client';

export function PushNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setSubscribed(!!subscription);
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('هذا المتصفح لا يدعم الإشعارات');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush();
      }
    } catch (err) {
      setError('فشل طلب الإذن. حاول مرة أخرى.');
      console.error('Permission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const { data } = await apiClient.get('/push/public-key');
      const publicKey = data.publicKey;
      if (!publicKey) throw new Error('Push notifications are not configured');

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Send subscription to server
      await apiClient.post('/push/subscribe', { subscription: subscription.toJSON() });

      setSubscribed(true);
    } catch (err) {
      setError('فشل الاشتراك في الإشعارات');
      console.error('Subscription error:', err);
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await apiClient.post('/push/unsubscribe', { endpoint: subscription.endpoint });

        setSubscribed(false);
      }
    } catch (err) {
      setError('فشل إلغاء الاشتراك');
      console.error('Unsubscribe error:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          إشعارات المتصفح
        </CardTitle>
        <CardDescription>
          استلم الإشعارات حتى عند إغلاق المنصة
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium">حالة الإذن</p>
              <p className="text-sm text-gray-500">
                {permission === 'granted' ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    مفعّل
                  </span>
                ) : permission === 'denied' ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    محظور
                  </span>
                ) : (
                  <span className="text-gray-600">لم يُمنح بعد</span>
                )}
              </p>
            </div>

            {permission === 'granted' && (
              <div>
                <p className="text-sm text-gray-500 text-left">الاشتراك</p>
                {subscribed ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    نشط
                  </span>
                ) : (
                  <span className="text-gray-600">غير نشط</span>
                )}
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {permission === 'default' && (
              <Button
                onClick={requestPermission}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
              </Button>
            )}

            {permission === 'granted' && !subscribed && (
              <Button
                onClick={subscribeToPush}
                disabled={loading}
                className="w-full"
              >
                الاشتراك في الإشعارات
              </Button>
            )}

            {permission === 'granted' && subscribed && (
              <Button
                onClick={unsubscribe}
                variant="outline"
                className="w-full"
              >
                <BellOff className="w-4 h-4 ml-2" />
                إلغاء الاشتراك
              </Button>
            )}

            {permission === 'denied' && (
              <Alert>
                <AlertDescription>
                  تم حظر الإشعارات. يرجى تفعيلها من إعدادات المتصفح.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Info */}
          <div className="text-sm text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              فوائد تفعيل الإشعارات:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>تلقي تنبيهات فورية للواجبات والامتحانات</li>
              <li>إشعارات الدرجات الجديدة</li>
              <li>تحديثات مهمة من المدرسة</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
