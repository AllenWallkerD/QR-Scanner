import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import '../styles/SignUpPage.css';

function translateSignUpError(code, fallback) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Бұл электронды пошта бұрын тіркелген.';
    case 'auth/invalid-email':
      return 'Электронды пошта дұрыс емес форматта.';
    case 'auth/weak-password':
      return 'Құпия сөз өте қысқа немесе қарапайым.';
    case 'auth/invalid-credential':
      return 'Енгізілген деректер жарамсыз немесе ескірген.';
    default:
      return fallback || 'Тіркелу сәтсіз аяқталды.';
  }
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
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
      const message = translateSignUpError(err.code, err.message);
      setErrorMsg(message);
    }
  };

  return (
    <div className="signup-container">
      <h2 className="signup-title">Тіркелу</h2>
      {errorMsg && <p className="signup-error">{errorMsg}</p>}
      <form className="signup-form" onSubmit={handleSignUp}>
        <div className="signup-field">
          <label>Студент ID:</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            placeholder="12345"
          />
        </div>
        <div className="signup-field">
          <label>Толық аты:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Аты-жөніңіз"
          />
        </div>
        <div className="signup-field">
          <label>Электронды почта:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@example.com"
          />
        </div>
        <div className="signup-field">
          <label>Құпия сөз:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Құпия сөз"
          />
        </div>
        <button className="signup-button" type="submit">
          Тіркелу
        </button>
      </form>
      <p className="signup-footer">
        Есептік жазбаңыз бар ма? <Link to="/signin">Кіру</Link>
      </p>
    </div>
  );
}
