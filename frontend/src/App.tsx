import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { useEffect } from 'react';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AuthGuard from './components/AuthGuard';
import OperatorGuard from './components/OperatorGuard';
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
import Contact from './pages/Contact';
import Tokushoho from './pages/Tokushoho';
import IndustryLanding from './pages/IndustryLanding';
import AdminHome from './pages/admin/AdminHome';
import AdminContacts from './pages/admin/AdminContacts';
import AdminContactDetail from './pages/admin/AdminContactDetail';
import AdminLogin from './pages/admin/AdminLogin';

/** SPA 内のルート遷移を gtag に送信する */
function usePageView() {
  const location = useLocation();
  useEffect(() => {
    if (
      typeof window.gtag === 'function' &&
      import.meta.env.VITE_GA_TRACKING_ID
    ) {
      window.gtag('config', import.meta.env.VITE_GA_TRACKING_ID, {
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
      <Route path="/contact" element={<Contact />} />
      <Route
        path="/specified-commercial-transactions"
        element={<Tokushoho />}
      />
      <Route path="/for/:slug" element={<IndustryLanding />} />
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
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <OperatorGuard>
            <AdminLayout />
          </OperatorGuard>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="contacts" element={<AdminContacts />} />
        <Route path="contacts/:id" element={<AdminContactDetail />} />
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
