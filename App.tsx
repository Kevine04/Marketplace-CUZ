import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { seedProducts } from './src/data/mock';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import type { UserAccount } from './src/types';

export default function App() {
  const [account, setAccount] = useState<UserAccount | null>(null);

  return (
    <>
      <StatusBar style="dark" />
      {account ? (
        <DashboardScreen account={account} initialProducts={seedProducts} />
      ) : (
        <AuthScreen onLogin={setAccount} />
      )}
    </>
  );
}
