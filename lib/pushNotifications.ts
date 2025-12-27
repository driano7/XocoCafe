/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 * --------------------------------------------------------------------
 */

export type DeviceInfo = {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isIPadOS: boolean;
};

export type PushPermissionResult = {
  granted: boolean;
  status: NotificationPermission | 'unsupported';
  message: string;
  tone: 'success' | 'info' | 'warning' | 'error';
};

const openIOSSettings = () => {
  try {
    window.location.assign('App-Prefs:NOTIFICATIONS_ID');
    window.setTimeout(() => {
      window.location.assign('app-settings:');
    }, 200);
  } catch {
    // ignore
  }
};

const openAndroidSettings = () => {
  try {
    window.location.assign('intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;end');
  } catch {
    // ignore
  }
};

export const detectDeviceInfo = (): DeviceInfo => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { isMobile: false, isAndroid: false, isIOS: false, isIPadOS: false };
  }
  type WindowWithOpera = Window & { opera?: string };
  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    ((window as WindowWithOpera).opera ? String((window as WindowWithOpera).opera) : '');
  const isAndroid = /android/i.test(ua);
  const isIPad =
    /ipad/i.test(ua) ||
    (/macintosh/i.test(ua) &&
      typeof navigator.maxTouchPoints === 'number' &&
      navigator.maxTouchPoints > 1);
  const isIPhone = /iphone|ipod/i.test(ua);
  const isMobile = isAndroid || isIPad || isIPhone;
  const isIOS = isIPhone || isIPad;

  return {
    isMobile,
    isAndroid,
    isIOS,
    isIPadOS: isIPad,
  };
};

export const ensurePushPermission = async (
  deviceInfo: DeviceInfo
): Promise<PushPermissionResult> => {
  if (typeof window === 'undefined') {
    return {
      granted: false,
      status: 'unsupported',
      message: 'No pudimos comprobar las notificaciones en este dispositivo.',
      tone: 'error',
    };
  }

  const notificationSupported =
    typeof Notification !== 'undefined' && typeof Notification.requestPermission === 'function';

  if (!notificationSupported) {
    if (deviceInfo.isIOS) {
      openIOSSettings();
      return {
        granted: false,
        status: 'unsupported',
        message:
          'iOS requiere activarlas desde Configuración → Safari → Notificaciones. Abre Ajustes y habilítalas para Xoco Café.',
        tone: 'info',
      };
    }
    if (deviceInfo.isAndroid) {
      openAndroidSettings();
      return {
        granted: false,
        status: 'unsupported',
        message:
          'Activa las notificaciones desde Ajustes → Apps y notificaciones → Xoco Café para recibir alertas.',
        tone: 'warning',
      };
    }
    return {
      granted: false,
      status: 'unsupported',
      message:
        'Este navegador no permite notificaciones push. Usa uno compatible o instala la app.',
      tone: 'warning',
    };
  }

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    return {
      granted: true,
      status: result,
      message: 'Activamos las notificaciones para este dispositivo.',
      tone: 'success',
    };
  }
  if (result === 'denied') {
    return {
      granted: false,
      status: result,
      message:
        'Tu navegador bloqueó las notificaciones. Revisa los ajustes de sitio o habilítalas manualmente.',
      tone: 'warning',
    };
  }

  if (deviceInfo.isIOS) {
    openIOSSettings();
    return {
      granted: false,
      status: result,
      message:
        'Apple no mostró la alerta. Abre Configuración → Safari → Notificaciones y habilítalas para Xoco Café.',
      tone: 'info',
    };
  }
  if (deviceInfo.isAndroid) {
    openAndroidSettings();
    return {
      granted: false,
      status: result,
      message:
        'Android no mostró el aviso. Entra a Ajustes → Notificaciones → Xoco Café y actívalas manualmente.',
      tone: 'info',
    };
  }
  return {
    granted: false,
    status: result,
    message: 'No pudimos abrir el aviso de permisos. Intenta nuevamente más tarde.',
    tone: 'error',
  };
};
