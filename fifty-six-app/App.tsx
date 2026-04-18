import React, { createContext, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { TransportContext } from './src/services/transportContext';
import { OnlineTransport } from './src/services/OnlineTransport';
import { OfflineTransport } from './src/services/OfflineTransport';
import { GameTransport } from './src/services/GameTransport';

export type TransportMode = 'online' | 'offline';

export const TransportModeContext = createContext<{
  mode: TransportMode;
  setMode: (m: TransportMode) => void;
}>({ mode: 'online', setMode: () => {} });

export default function App() {
  const [mode, setMode] = useState<TransportMode>('online');

  const transport = useMemo<GameTransport>(() => {
    return mode === 'online' ? new OnlineTransport() : new OfflineTransport();
  }, [mode]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <TransportModeContext.Provider value={{ mode, setMode }}>
        <TransportContext.Provider value={transport}>
          <RootNavigator />
        </TransportContext.Provider>
      </TransportModeContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
