import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { useEffect } from 'react';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import RedirectIfAuthed from './components/RedirectIfAuthed';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Messages from './pages/Messages';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Forms from './pages/Forms';
import FormEdit from './pages/FormEdit';
import Submissions from './pages/Submissions';
import Help from './pages/Help';
import Pricing from './pages/Pricing';

/** SPA 内のルート遷移を gtag に送信する */
function usePageView() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-ZTGBDFT2KX', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
}

function AppRoutes() {
  usePageView();
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="/help" element={<Help />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <Signup />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/onboarding"
        element={
          <AuthGuard requireTenant={false} redirectIfTenantExists>
            <Onboarding />
          </AuthGuard>
        }
      />
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/forms/:id" element={<FormEdit />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/messages" element={<Messages />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
