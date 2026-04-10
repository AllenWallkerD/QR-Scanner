import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/SignInPage.css';

function translateAuthError(code, fallback) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Электронды пошта дұрыс емес форматта.';
    case 'auth/user-disabled':
      return 'Бұл есептік жазба уақытша бұғатталған.';
    case 'auth/user-not-found':
      return 'Мұндай есептік жазба тіркелмеген.';
    case 'auth/wrong-password':
      return 'Құпия сөз қате.';
    case 'auth/invalid-credential':
      return 'Енгізілген деректер жарамсыз немесе ескірген.';
    default:
      return fallback || 'Кіру сәтсіз аяқталды.';
  }
}

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/scan');
    } catch (err) {
      console.error(err);
      const message = translateAuthError(err.code, err.message);
      setErrorMsg(message);
    }
  };

  return (
    <div className="signin-container">
      <h2 className="signin-title">Кіру</h2>
      {errorMsg && <p className="signin-error">{errorMsg}</p>}
      <form className="signin-form" onSubmit={handleSignIn}>
        <div className="signin-field">
          <label>Электронды пошта:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@example.com"
          />
        </div>
        <div className="signin-field">
          <label>Құпия сөз:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Құпия сөз"
          />
        </div>
        <button className="signin-button" type="submit">
          Кіру
        </button>
      </form>
      <p className="signin-footer">
        Есептік жазбаңыз жоқ па ? <Link to="/signup">Тіркелу</Link>
      </p>
    </div>
  );
}
