import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveSession } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  function validate() {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const { user, token } = await login(form);
      saveSession(user, token);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      // Role-based redirect
      if (user.role === 'portal') {
        navigate('/my-subscriptions', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password.';
      toast.error(msg);
      setErrors({ password: msg });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(ev) {
    const { name, value } = ev.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Sign in to SubTrack</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage all your subscriptions in one place.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border transition-colors duration-150 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.password}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Create one
          </Link>
        </p>

        {/* Demo hint */}
        <div className="mt-6 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700 font-medium mb-1">Demo credentials</p>
          <p className="text-xs text-blue-600">Admin: admin@subtrack.app / any password</p>
          <p className="text-xs text-blue-600">Staff: staff@subtrack.app / any password</p>
          <p className="text-xs text-blue-600">Portal: customer@example.com / any password</p>
        </div>
      </Card>
    </AuthShell>
  );
}

// ── Shared helpers ────────────────────────────────────────────
export function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      {children}
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <Layers size={16} className="text-white" />
      </div>
      <span className="text-lg font-bold text-gray-900">SubTrack</span>
    </div>
  );
}

