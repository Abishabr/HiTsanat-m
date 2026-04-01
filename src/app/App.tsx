import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScheduleProvider } from './context/ScheduleStore';
import { DataStoreProvider } from './context/DataStore';
import Login from './pages/Login';

function AppInner() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <ScheduleProvider>
      <DataStoreProvider>
        <RouterProvider router={router} />
        <Toaster />
      </DataStoreProvider>
    </ScheduleProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
