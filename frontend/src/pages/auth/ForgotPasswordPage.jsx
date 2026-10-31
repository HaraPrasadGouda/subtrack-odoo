import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/api/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { AuthShell, Logo } from './LoginPage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!email) { setEmailError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md p-8">
        <Logo />

        {sent ? (
          <SuccessState email={email} />
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
              />

              <Button type="submit" size="lg" loading={loading} className="w-full">
                Send reset link
              </Button>
            </form>

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </>
        )}
      </Card>
    </AuthShell>
  );
}

function SuccessState({ email }) {
  return (
    <div className="mt-6 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <Mail size={28} className="text-blue-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Check your inbox</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-xs">
        We sent a password reset link to{' '}
        <span className="font-medium text-gray-700">{email}</span>.
        It expires in 30 minutes.
      </p>
      <p className="mt-4 text-xs text-gray-400">
        Didn&apos;t receive it? Check your spam folder.
      </p>
      <Link
        to="/login"
        className="mt-6 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
      >
        <ArrowLeft size={14} />
        Back to sign in
      </Link>
    </div>
  );
}

