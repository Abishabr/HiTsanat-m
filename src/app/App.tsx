import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScheduleProvider } from './context/ScheduleStore';
import Login from './pages/Login';

function AppInner() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <ScheduleProvider>
      <RouterProvider router={router} />
      <Toaster />
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
