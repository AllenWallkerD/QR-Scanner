import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import ScanPage from './pages/ScanPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/scan"
        element={
          <ProtectedRoute>
            <ScanPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}

export default App;
