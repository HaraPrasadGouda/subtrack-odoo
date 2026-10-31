import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { signup } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { AuthShell, Logo } from './LoginPage';

// Password rule checker
const RULES = [
  { id: 'length',    label: 'At least 8 characters',   test: (p) => p.length >= 8 },
  { id: 'upper',     label: 'One uppercase letter',     test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'One lowercase letter',     test: (p) => /[a-z]/.test(p) },
  { id: 'special',   label: 'One special character',    test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordChecklist({ password, show }) {
  if (!show) return null;
  return (
    <ul className="mt-2 space-y-1">
      {RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-green-600' : 'text-gray-400'}`}>
            {ok ? (
              <Check size={12} className="shrink-0 text-green-500" />
            ) : (
              <X size={12} className="shrink-0 text-gray-300" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [passInputFocused, setPassInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const allRulesMet = useMemo(() => RULES.every((r) => r.test(form.password)), [form.password]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
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
      const { user, token } = await signup({ name: form.name, email: form.email, password: form.password });
      saveSession(user, token);
      toast.success('Account created! Welcome to SubTrack 🎉');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.detail || 'Signup failed. Please try again.';
      if (status === 409) {
        setErrors({ email: msg });
        toast.error(msg);
      } else {
        toast.error(msg);
      }
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
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Start managing subscriptions today.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <Input
            label="Full name"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Arjun Sharma"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />

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

          {/* Password with eye toggle + live checklist */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                onFocus={() => setPassInputFocused(true)}
                onBlur={() => setPassInputFocused(false)}
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
            {/* Live checklist — shows when field has content */}
            <PasswordChecklist
              password={form.password}
              show={form.password.length > 0 || passInputFocused}
            />
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="confirm">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm"
                name="confirm"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors duration-150 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirm
                    ? 'border-red-400 focus:ring-red-400'
                    : form.confirm && form.confirm === form.password
                    ? 'border-green-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              />
              {form.confirm && form.confirm === form.password && (
                <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {errors.confirm && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.confirm}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}

