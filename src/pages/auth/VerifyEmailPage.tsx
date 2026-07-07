import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '@/services';
import { Icons } from '@/components/Icons';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000);
      } catch (err: unknown) {
        setStatus('error');
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setMessage(axiosErr.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };
    void verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 tech-grid relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-2xl p-8 w-full max-w-md space-y-6 glow-blue relative z-10">
        <div className="text-center space-y-2">
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${
            status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-brand-600'
          } text-white`}>
            {status === 'loading' && <Icons.Spinner className="w-9 h-9 animate-spin" />}
            {status === 'success' && <Icons.Check className="w-9 h-9" />}
            {status === 'error' && <Icons.AlertWarning className="w-9 h-9" />}
          </div>
          <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight">SmartWarehouse</h1>
          <p className="text-slate-500 text-sm font-medium">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </p>
        </div>

        <div className={`p-4 rounded-xl text-xs font-semibold leading-relaxed ${
          status === 'success' ? 'bg-green-50 border border-green-200/60 text-green-750' :
          status === 'error' ? 'bg-red-50 border border-red-200/60 text-red-750' : 'bg-slate-50 border border-slate-200 text-slate-600'
        }`}>
          {message}
        </div>

        <div className="text-center">
          <Link to="/login" className="text-brand-600 font-bold hover:text-brand-700 transition-colors text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
