import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import GuestRoute from '@/components/GuestRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';

// ── Auth pages (untouched from Page 1) ─────────────────────────
import LoginPage          from '@/pages/auth/LoginPage';
import SignupPage         from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from '@/pages/auth/ResetPasswordPage';

// ── Admin + Internal pages ──────────────────────────────────────
import DashboardPage      from '@/pages/DashboardPage';
import ProductsPage       from '@/pages/ProductsPage';
import PlansPage          from '@/pages/PlansPage';
import TaxesPage          from '@/pages/TaxesPage';
import DiscountsPage      from '@/pages/DiscountsPage';
import TemplatesPage      from '@/pages/TemplatesPage';
import SubscriptionsPage  from '@/pages/SubscriptionsPage';
import InvoicesPage       from '@/pages/InvoicesPage';
import PaymentsPage       from '@/pages/PaymentsPage';
import CustomersPage      from '@/pages/CustomersPage';
import DunningPage        from '@/pages/DunningPage';
import UsersPage          from '@/pages/UsersPage';

// ── Portal pages ────────────────────────────────────────────────
import MySubscriptionsPage from '@/pages/portal/MySubscriptionsPage';
import MyInvoicesPage      from '@/pages/portal/MyInvoicesPage';

// ── Utility pages ───────────────────────────────────────────────
import NotFoundPage from '@/pages/NotFoundPage';

/**
 * A layout route element that guards by role AND renders DashboardLayout.
 * Children are rendered by <Outlet /> inside DashboardLayout.
 */
function ProtectedLayout({ roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <DashboardLayout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public / guest routes ───────────────────────────── */}
          <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/signup"          element={<GuestRoute><SignupPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />

          {/* ── Admin-only layout ───────────────────────────────── */}
          <Route element={<ProtectedLayout roles={['admin']} />}>
            <Route path="/taxes"     element={<TaxesPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
            <Route path="/users"     element={<UsersPage />} />
          </Route>

          {/* ── Admin + Internal layout ─────────────────────────── */}
          <Route element={<ProtectedLayout roles={['admin', 'internal']} />}>
            <Route path="/dashboard"     element={<DashboardPage />} />
            <Route path="/products"      element={<ProductsPage />} />
            <Route path="/plans"         element={<PlansPage />} />
            <Route path="/templates"     element={<TemplatesPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/invoices"      element={<InvoicesPage />} />
            <Route path="/payments"      element={<PaymentsPage />} />
            <Route path="/customers"     element={<CustomersPage />} />
            <Route path="/dunning"       element={<DunningPage />} />
          </Route>

          {/* ── Portal layout ───────────────────────────────────── */}
          <Route element={<ProtectedLayout roles={['portal']} />}>
            <Route path="/my-subscriptions" element={<MySubscriptionsPage />} />
            <Route path="/my-invoices"      element={<MyInvoicesPage />} />
          </Route>

          {/* ── 404 (authenticated, inside layout) ──────────────── */}
          <Route element={<ProtectedLayout />}>
            <Route path="/not-found" element={<NotFoundPage />} />
          </Route>

          {/* ── Root + catch-all redirects ───────────────────────── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />

        </Routes>
      </BrowserRouter>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #f3f4f6',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
            borderRadius: '10px',
            fontSize: '14px',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}
