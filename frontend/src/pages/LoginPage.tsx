import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthField({
  id,
  type = 'text',
  value,
  onChange,
  label,
  autoComplete,
  required,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const hasValue = value.length > 0;
  return (
    <label className={hasValue ? 'has-value' : ''}>
      <input
        id={id}
        type={type}
        className="auth-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
      <span className="auth-label-span">{label}</span>
    </label>
  );
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6">
          <span className="material-symbols-outlined">arrow_back</span>
          На главную
        </Link>
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="auth-title">Вход</p>
          <p className="auth-message">Введите номер телефона и пароль.</p>

          <AuthField
            id="phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            label="Номер телефона"
            autoComplete="tel"
            required
          />

          <AuthField
            id="password"
            type="password"
            value={password}
            onChange={setPassword}
            label="Пароль"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>

          <p className="auth-signin">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
