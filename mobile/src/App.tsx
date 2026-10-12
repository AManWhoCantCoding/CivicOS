import React from 'react';
import { SessionProvider } from './auth/SessionContext';
import { AppNavigator } from './navigation/AppNavigator';
import type { NativeResult, NativeSceneDescriptor } from './demo/native-runner';

export type AppProps = {
  demoCommand?: unknown;
  demoScene?: NativeSceneDescriptor;
  onDemoResult?: (result: NativeResult) => void;
};

export default function App(props: AppProps) {
  return (
    <SessionProvider>
      <AppNavigator {...props} />
    </SessionProvider>
  );
}
