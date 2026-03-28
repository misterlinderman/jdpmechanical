import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { IUnit } from '../types/unit';

function socketBaseUrl(): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return base.replace(/\/api\/?$/, '') || 'http://localhost:3001';
}

/**
 * Listens for dashboard refresh events (no JWT on socket for alpha; restrict in production).
 */
export function useRealtimeUnits(
  onUnitUpdated: (unit: IUnit) => void,
  onUnitsImported: () => void
): void {
  const unitRef = useRef(onUnitUpdated);
  const importRef = useRef(onUnitsImported);
  unitRef.current = onUnitUpdated;
  importRef.current = onUnitsImported;

  useEffect(() => {
    const socket = io(socketBaseUrl(), { transports: ['websocket', 'polling'] });
    socket.on('unit:updated', (unit: IUnit) => unitRef.current(unit));
    socket.on('units:imported', () => importRef.current());
    return () => {
      socket.disconnect();
    };
  }, []);
}
