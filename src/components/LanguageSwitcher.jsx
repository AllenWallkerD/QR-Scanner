import React from 'react';
import { useI18n, LANGUAGES } from '../i18n/i18n';
import '../styles/LanguageSwitcher.css';

// Переключатель языка, закреплён в правом верхнем углу (у сканера нет сайдбара)
export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="lang-switcher">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-option ${lang === l.code ? 'active' : ''}`}
          onClick={() => setLang(l.code)}
          title={l.label}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
