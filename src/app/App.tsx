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
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    // ScheduleProvider is outside the auth gate so schedule data
    // persists across login/logout within the same session.
    <AuthProvider>
      <ScheduleProvider>
        <AppInner />
      </ScheduleProvider>
    </AuthProvider>
  );
}
