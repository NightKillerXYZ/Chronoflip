import { useState, useEffect, useCallback, useRef } from 'react';

export type WakeLockStatus = 'active' | 'released' | 'unavailable' | 'denied';

export const useWakeLock = () => {
  const [status, setStatus] = useState<WakeLockStatus>('released');
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Safely check for navigator existence
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Wake Lock release failed', err);
      }
      wakeLockRef.current = null;
      setStatus('released');
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
      setStatus('unavailable');
      return;
    }

    // Wake Lock requires the document to be visible.
    if (document.visibilityState !== 'visible') {
      return;
    }
    
    // CRITICAL FIX: Prevent duplicate requests if lock is already active.
    // This prevents re-renders on every touch event which causes "double tap" issues on iOS.
    if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
    }

    try {
      const lock = await navigator.wakeLock.request('screen');
      
      lock.addEventListener('release', () => {
        // Only clear if it matches current (though typically only one exists)
        if (wakeLockRef.current === lock) {
            wakeLockRef.current = null;
            setStatus('released');
        }
        console.log('Wake Lock released');
      });

      wakeLockRef.current = lock;
      setStatus('active');
      console.log('Wake Lock active');
      
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setStatus('denied');
      } else {
        // Don't overwrite if we actually have one (race condition protection)
        if (!wakeLockRef.current) {
            setStatus('released'); 
        }
      }
      console.warn(`Wake Lock request failed: ${err.name}, ${err.message}`);
    }
  }, [isSupported]);

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
      // Clean up lock on unmount
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [requestWakeLock, isSupported]); 

  return { isLocked: status === 'active', status, requestWakeLock, releaseWakeLock, isSupported };
};