import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== passwordRepeat) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || undefined;
    setLoading(true);
    try {
      await register(phone.trim(), password, fullName);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
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
          <p className="auth-title">Регистрация</p>
          <p className="auth-message">Создайте аккаунт — укажите имя, фамилию, номер телефона и пароль.</p>

          <div className="auth-flex">
            <AuthField
              id="firstName"
              value={firstName}
              onChange={setFirstName}
              label="Имя"
              autoComplete="given-name"
              required
            />
            <AuthField
              id="lastName"
              value={lastName}
              onChange={setLastName}
              label="Фамилия"
              autoComplete="family-name"
              required
            />
          </div>

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
            autoComplete="new-password"
            required
          />

          <AuthField
            id="passwordRepeat"
            type="password"
            value={passwordRepeat}
            onChange={setPasswordRepeat}
            label="Повторите пароль"
            autoComplete="new-password"
            required
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>

          <p className="auth-signin">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
