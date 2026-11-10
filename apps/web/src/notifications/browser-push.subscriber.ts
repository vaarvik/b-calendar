import type { PushEndpoint } from '@b-calendar/contracts';
import type { PushReadiness, PushSubscriber } from './notifications.ports';

/** Notification API, service worker and PushManager of the running browser. */
export class BrowserPushSubscriber implements PushSubscriber {
  public constructor(private readonly serviceWorkerUrl: string) {}

  public readiness(): PushReadiness {
    const standalone =
      globalThis.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !standalone) {
      return 'install';
    }
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in globalThis) ||
      !('Notification' in globalThis)
    ) {
      return 'unsupported';
    }
    switch (Notification.permission) {
      case 'granted':
        return 'on';
      case 'denied':
        return 'blocked';
      default:
        return 'ask';
    }
  }

  public async subscribe(vapidPublicKey: string): Promise<PushEndpoint | null> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }
    const registration = await navigator.serviceWorker.register(this.serviceWorkerUrl);
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.decode(vapidPublicKey),
      }));
    const json = subscription.toJSON();
    return {
      endpoint: json.endpoint ?? subscription.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    };
  }

  /** VAPID keys are base64url; PushManager wants the bytes. */
  private decode(base64url: string): Uint8Array<ArrayBuffer> {
    const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
}
