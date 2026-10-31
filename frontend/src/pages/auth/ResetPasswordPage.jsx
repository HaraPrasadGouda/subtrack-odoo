import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPassword } from '@/api/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { AuthShell, Logo } from './LoginPage';

const RULES = [
  { id: 'length',  label: 'At least 8 characters',   test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter',     test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter',     test: (p) => /[a-z]/.test(p) },
  { id: 'special', label: 'One special character',    test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const allRulesMet = useMemo(() => RULES.every((r) => r.test(form.password)), [form.password]);

  function validate() {
    const e = {};
    if (!form.password) e.password = 'Password is required';
    else if (!allRulesMet) e.password = 'Password does not meet all requirements';
    if (!form.confirm) e.confirm = 'Please confirm your password';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await resetPassword({ token, password: form.password });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Reset link is invalid or expired.';
      toast.error(msg);
      setErrors({ token: msg });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md p-8">
          <Logo />
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <ShieldCheck size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Password updated!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to Sign in
            </Button>
          </div>
        </Card>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md p-8 text-center">
          <Logo />
          <p className="mt-6 text-red-500 font-medium">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Request a new reset link
          </Link>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>

        {errors.token && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.token}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
          {/* New password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }));
                  if (errors.password) setErrors((err) => ({ ...err, password: '' }));
                }}
                className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border transition-colors bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
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
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
            {/* Rule checklist */}
            {form.password.length > 0 && (
              <ul className="mt-1 space-y-1">
                {RULES.map((rule) => {
                  const ok = rule.test(form.password);
                  return (
                    <li key={rule.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                      {ok ? <Check size={12} className="text-green-500" /> : <X size={12} className="text-gray-300" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="confirm">
              Confirm new password
            </label>
            <input
              id="confirm"
              name="confirm"
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              value={form.confirm}
              onChange={(e) => {
                setForm((f) => ({ ...f, confirm: e.target.value }));
                if (errors.confirm) setErrors((err) => ({ ...err, confirm: '' }));
              }}
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.confirm
                  ? 'border-red-400'
                  : form.confirm && form.confirm === form.password
                  ? 'border-green-400'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            />
            {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
          </div>

          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            Reset password
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}

