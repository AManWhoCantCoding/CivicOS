import React from 'react';
import { SessionProvider } from './auth/SessionContext';
import { AppNavigator } from './navigation/AppNavigator';
export default function App() {
  return (
    <SessionProvider>
      <AppNavigator />
    </SessionProvider>
  );
}
