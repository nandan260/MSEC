import { useEffect } from 'react';
import { isNative } from './api';
import { parseAuthReturn } from './auth-api';

// Calls onReturn({code}|{error}) when Google sends the user back: web hash or Android deep link.
export function useAuthReturn(onReturn) {
  useEffect(() => {
    const fromHash = parseAuthReturn(window.location.hash);
    if (fromHash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      onReturn(fromHash);
    }
    if (!isNative()) return undefined;
    let handle;
    let cancelled = false;
    (async () => {
      const { App: CapApp } = await import('@capacitor/app');
      const deliver = async (url) => {
        const parsed = parseAuthReturn(url);
        if (!parsed) return;
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch { /* browser already closed */ }
        onReturn(parsed);
      };
      const launch = await CapApp.getLaunchUrl();
      if (!cancelled && launch?.url) deliver(launch.url);
      handle = await CapApp.addListener('appUrlOpen', ({ url }) => deliver(url));
    })();
    return () => { cancelled = true; handle?.remove?.(); };
    // onReturn is stable for the app's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
