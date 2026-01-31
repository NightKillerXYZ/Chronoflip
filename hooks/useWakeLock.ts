import { useState, useEffect, useCallback, useRef } from 'react';

export type WakeLockStatus = 'active' | 'released' | 'unavailable' | 'denied';

export const useWakeLock = () => {
  const [status, setStatus] = useState<WakeLockStatus>('released');
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  
  // Safely check for navigator existence
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
      setStatus('unavailable');
      return;
    }

    // Wake Lock requires the document to be visible.
    if (document.visibilityState !== 'visible') {
      return;
    }

    try {
      const lock = await navigator.wakeLock.request('screen');
      
      lock.addEventListener('release', () => {
        setStatus('released');
        setWakeLock(null);
        console.log('Wake Lock released');
      });

      setWakeLock(lock);
      setStatus('active');
      console.log('Wake Lock active');
      
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setStatus('denied');
      } else {
        setStatus('released'); 
      }
      console.warn(`Wake Lock request failed: ${err.name}, ${err.message}`);
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch (err) {
        console.warn('Wake Lock release failed', err);
      }
      setWakeLock(null);
      setStatus('released');
    }
  }, [wakeLock]);

  // Initial Lock & Visibility Handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    if (isSupported) {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        // Attempt initial lock
        requestWakeLock();
    } else {
        setStatus('unavailable');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // We do not call releaseWakeLock() here to avoid dependency cycles. 
      // The browser releases locks automatically on unload/visibility change mostly.
    };
    // CRITICAL FIX: Removed releaseWakeLock from dependencies to prevent infinite loop
  }, [requestWakeLock, isSupported]); 

  return { isLocked: status === 'active', status, requestWakeLock, releaseWakeLock, isSupported };
};