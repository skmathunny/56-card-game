import { createContext, useContext } from 'react';
import { GameTransport } from './GameTransport';

export const TransportContext = createContext<GameTransport | null>(null);

export function useTransport(): GameTransport {
  const transport = useContext(TransportContext);
  if (!transport) throw new Error('useTransport must be used within TransportContext.Provider');
  return transport;
}
