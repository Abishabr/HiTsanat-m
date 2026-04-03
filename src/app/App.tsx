import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScheduleProvider } from './context/ScheduleStore';
import { DataStoreProvider } from './context/DataStore';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';

function AppInner() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <DataStoreProvider>
      <ScheduleProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ScheduleProvider>
    </DataStoreProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
