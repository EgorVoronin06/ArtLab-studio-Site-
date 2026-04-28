import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './AuthModal.css';

export type AuthModalTab = 'login' | 'register' | 'recover';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export default function AuthModal({ open, onClose, onAuthSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<AuthModalTab>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverErrors, setRecoverErrors] = useState<Record<string, string>>({});
  const [recoverSent, setRecoverSent] = useState(false);

  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestApi<T>(path: string, payload?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined
      });
    } catch {
      throw new Error('Нет соединения с сервером. Проверьте, что backend запущен');
    }

    const raw = await res.text();
    const parsed = raw ? (JSON.parse(raw) as { message?: string | string[] }) : {};
    if (!res.ok) {
      const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
      throw new Error(message || 'Ошибка сервера');
    }

    return (raw ? JSON.parse(raw) : {}) as T;
  }

  const resetForms = useCallback(() => {
    setTab('login');
    setLoginEmail('');
    setLoginPassword('');
    setLoginErrors({});
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
    setRegErrors({});
    setRecoverEmail('');
    setRecoverErrors({});
    setRecoverSent(false);
    setFormMessage('');
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) resetForms();
  }, [open, resetForms]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!loginEmail.trim()) e.loginEmail = 'Введите email';
    else if (!EMAIL_RE.test(loginEmail.trim())) e.loginEmail = 'Некорректный email';
    if (!loginPassword) e.loginPassword = 'Введите пароль';
    else if (loginPassword.length < MIN_PASSWORD) e.loginPassword = `Минимум ${MIN_PASSWORD} символов`;
    setLoginErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegisterStep1 = () => {
    const e: Record<string, string> = {};
    if (!regName.trim()) e.regName = 'Введите имя';
    if (!regEmail.trim()) e.regEmail = 'Введите email';
    else if (!EMAIL_RE.test(regEmail.trim())) e.regEmail = 'Некорректный email';
    if (!regPassword) e.regPassword = 'Введите пароль';
    else if (regPassword.length < MIN_PASSWORD) e.regPassword = `Минимум ${MIN_PASSWORD} символов`;
    if (regPassword !== regConfirm) e.regConfirm = 'Пароли не совпадают';
    setRegErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRecover = () => {
    const e: Record<string, string> = {};
    if (!recoverEmail.trim()) e.recoverEmail = 'Введите email';
    else if (!EMAIL_RE.test(recoverEmail.trim())) e.recoverEmail = 'Некорректный email';
    setRecoverErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLoginSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateLogin()) return;
    setFormMessage('');
    setIsSubmitting(true);
    try {
      await requestApi('/auth/login', { email: loginEmail.trim(), password: loginPassword });
      onAuthSuccess?.();
      onClose();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Ошибка входа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateRegisterStep1()) return;
    setFormMessage('');
    setIsSubmitting(true);
    try {
      await requestApi('/auth/register', {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword
      });
      onAuthSuccess?.();
      onClose();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Ошибка регистрации');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateRecover()) return;
    setFormMessage('');
    setIsSubmitting(true);
    try {
      await requestApi('/auth/forgot', { email: recoverEmail.trim() });
      setRecoverSent(true);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Ошибка восстановления');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (t: AuthModalTab) => {
    setTab(t);
    setLoginErrors({});
    setRegErrors({});
    setRecoverErrors({});
    setFormMessage('');
    setIsSubmitting(false);
  };

  if (!open) return null;

  const modal = (
    <div
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2 id="auth-modal-title" className="auth-modal-title">
            {tab === 'register' ? 'Регистрация' : tab === 'recover' ? 'Восстановление' : 'Авторизация'}
          </h2>
          <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {tab !== 'register' && (
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Вход
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'recover'}
              className={`auth-tab ${tab === 'recover' ? 'active' : ''}`}
              onClick={() => switchTab('recover')}
            >
              Восстановление
            </button>
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={`auth-input ${loginErrors.loginEmail ? 'error' : ''}`}
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              {loginErrors.loginEmail && <div className="auth-error">{loginErrors.loginEmail}</div>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">
                Пароль
              </label>
              <input
                id="login-password"
                className={`auth-input ${loginErrors.loginPassword ? 'error' : ''}`}
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              {loginErrors.loginPassword && (
                <div className="auth-error">{loginErrors.loginPassword}</div>
              )}
            </div>
            <div className="auth-actions">
              <button type="submit" className="auth-primary">
                {isSubmitting ? 'Вход...' : 'Войти'}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setTab('register');
                  setLoginErrors({});
                  setRegErrors({});
                }}
              >
                Регистрация
              </button>
            </div>
            {formMessage && <div className="auth-error">{formMessage}</div>}
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate>
            <button type="button" className="auth-back-link" onClick={() => switchTab('login')}>
              ← Ко входу
            </button>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-name">
                Имя
              </label>
              <input
                id="reg-name"
                className={`auth-input ${regErrors.regName ? 'error' : ''}`}
                type="text"
                autoComplete="name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              {regErrors.regName && <div className="auth-error">{regErrors.regName}</div>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                className={`auth-input ${regErrors.regEmail ? 'error' : ''}`}
                type="email"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              {regErrors.regEmail && <div className="auth-error">{regErrors.regEmail}</div>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-password">
                Пароль
              </label>
              <input
                id="reg-password"
                className={`auth-input ${regErrors.regPassword ? 'error' : ''}`}
                type="password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              {regErrors.regPassword && <div className="auth-error">{regErrors.regPassword}</div>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-confirm">
                Подтверждение пароля
              </label>
              <input
                id="reg-confirm"
                className={`auth-input ${regErrors.regConfirm ? 'error' : ''}`}
                type="password"
                autoComplete="new-password"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
              />
              {regErrors.regConfirm && <div className="auth-error">{regErrors.regConfirm}</div>}
            </div>
            <div className="auth-actions">
              <button type="submit" className="auth-primary">
                {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </div>
            {formMessage && <div className="auth-error">{formMessage}</div>}
          </form>
        )}

        {tab === 'recover' && (
          <form onSubmit={handleRecoverSubmit} noValidate>
            {recoverSent ? (
              <p className="auth-hint" style={{ marginTop: 0 }}>
                Если аккаунт существует, на указанный email отправлены инструкции.
              </p>
            ) : (
              <>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="recover-email">
                    Email
                  </label>
                  <input
                    id="recover-email"
                    className={`auth-input ${recoverErrors.recoverEmail ? 'error' : ''}`}
                    type="email"
                    autoComplete="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                  />
                  {recoverErrors.recoverEmail && (
                    <div className="auth-error">{recoverErrors.recoverEmail}</div>
                  )}
                </div>
                <div className="auth-actions">
                  <button type="submit" className="auth-primary">
                    {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
                  </button>
                </div>
              </>
            )}
            {formMessage && <div className="auth-error">{formMessage}</div>}
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
