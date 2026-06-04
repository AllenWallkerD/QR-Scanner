import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useI18n } from '../i18n/i18n';
import '../styles/SignUpPage.css';

// Код ошибки Firebase -> ключ перевода
function signUpErrorKey(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'auth.err.emailInUse';
    case 'auth/invalid-email':
      return 'auth.err.invalidEmail';
    case 'auth/weak-password':
      return 'auth.err.weakPassword';
    case 'auth/invalid-credential':
      return 'auth.err.invalidCredential';
    default:
      return 'auth.err.signupDefault';
  }
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // В состоянии храним ключ ошибки, перевод — при рендере
  const [errorKey, setErrorKey] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorKey('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name
      });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        studentId,
        name,
        email
      });
      navigate('/scan');
    } catch (err) {
      console.error(err);
      setErrorKey(signUpErrorKey(err.code));
    }
  };

  return (
    <div className="signup-container">
      <h2 className="signup-title">{t('signup.title')}</h2>
      {errorKey && <p className="signup-error">{t(errorKey)}</p>}
      <form className="signup-form" onSubmit={handleSignUp}>
        <div className="signup-field">
          <label>{t('signup.studentId')}:</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            placeholder={t('signup.studentIdPlaceholder')}
          />
        </div>
        <div className="signup-field">
          <label>{t('signup.fullName')}:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t('signup.fullNamePlaceholder')}
          />
        </div>
        <div className="signup-field">
          <label>{t('auth.email')}:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@example.com"
          />
        </div>
        <div className="signup-field">
          <label>{t('auth.password')}:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('auth.password')}
          />
        </div>
        <button className="signup-button" type="submit">
          {t('signup.button')}
        </button>
      </form>
      <p className="signup-footer">
        {t('signup.footer')} <Link to="/signin">{t('signup.signinLink')}</Link>
      </p>
    </div>
  );
}
