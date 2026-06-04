import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useI18n } from '../i18n/i18n';
import '../styles/SignInPage.css';

// Код ошибки Firebase -> ключ перевода
function authErrorKey(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'auth.err.invalidEmail';
    case 'auth/user-disabled':
      return 'auth.err.userDisabled';
    case 'auth/user-not-found':
      return 'auth.err.userNotFound';
    case 'auth/wrong-password':
      return 'auth.err.wrongPassword';
    case 'auth/invalid-credential':
      return 'auth.err.invalidCredential';
    default:
      return 'auth.err.signinDefault';
  }
}

export default function SignInPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // В состоянии храним ключ ошибки, перевод — при рендере
  const [errorKey, setErrorKey] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorKey('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/scan');
    } catch (err) {
      console.error(err);
      setErrorKey(authErrorKey(err.code));
    }
  };

  return (
    <div className="signin-container">
      <h2 className="signin-title">{t('signin.title')}</h2>
      {errorKey && <p className="signin-error">{t(errorKey)}</p>}
      <form className="signin-form" onSubmit={handleSignIn}>
        <div className="signin-field">
          <label>{t('auth.email')}:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@example.com"
          />
        </div>
        <div className="signin-field">
          <label>{t('auth.password')}:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('auth.password')}
          />
        </div>
        <button className="signin-button" type="submit">
          {t('signin.button')}
        </button>
      </form>
      <p className="signin-footer">
        {t('signin.footer')} <Link to="/signup">{t('signin.signupLink')}</Link>
      </p>
    </div>
  );
}
