import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Доступные языки (порядок = порядок в переключателе)
export const LANGUAGES = [
  { code: 'kz', short: 'ҚАЗ', label: 'Қазақша' },
  { code: 'ru', short: 'РУС', label: 'Русский' },
  { code: 'en', short: 'ENG', label: 'English' }
];

const STORAGE_KEY = 'app_lang';
const DEFAULT_LANG = 'kz';

// Словари переводов. Источник — казахский.
const translations = {
  kz: {
    'common.loading': 'Жүктелуде...',

    'auth.email': 'Электронды пошта',
    'auth.password': 'Құпия сөз',
    'auth.err.invalidEmail': 'Электронды пошта дұрыс емес форматта.',
    'auth.err.userDisabled': 'Бұл есептік жазба уақытша бұғатталған.',
    'auth.err.userNotFound': 'Мұндай есептік жазба тіркелмеген.',
    'auth.err.wrongPassword': 'Құпия сөз қате.',
    'auth.err.invalidCredential': 'Енгізілген деректер жарамсыз немесе ескірген.',
    'auth.err.signinDefault': 'Кіру сәтсіз аяқталды.',
    'auth.err.emailInUse': 'Бұл электронды пошта бұрын тіркелген.',
    'auth.err.weakPassword': 'Құпия сөз өте қысқа немесе қарапайым.',
    'auth.err.signupDefault': 'Тіркелу сәтсіз аяқталды.',

    'signin.title': 'Кіру',
    'signin.button': 'Кіру',
    'signin.footer': 'Есептік жазбаңыз жоқ па?',
    'signin.signupLink': 'Тіркелу',

    'signup.title': 'Тіркелу',
    'signup.studentId': 'Студент ID',
    'signup.studentIdPlaceholder': '12345',
    'signup.fullName': 'Толық аты',
    'signup.fullNamePlaceholder': 'Аты-жөніңіз',
    'signup.button': 'Тіркелу',
    'signup.footer': 'Есептік жазбаңыз бар ма?',
    'signup.signinLink': 'Кіру',

    'scan.welcome': 'Қош келдіңіз, {name}',
    'scan.openCamera': 'Камераны ашу',
    'scan.checking': 'Тексерілуде...',
    'scan.logout': 'Шығу',
    'scan.cameraError': 'Камераны іске қосу кезінде қате.',
    'scan.alreadyThisQR': 'Бұл сессия бұрын тіркелген!',
    'scan.notAuth': 'Пайдаланушы авторизован емес.',
    'scan.qrUnreadable': 'QR-код деректерін оқу мүмкін емес.',
    'scan.qrIncomplete': 'QR-код деректері толық емес.',
    'scan.sessionNotFound': 'Сессия табылмады.',
    'scan.sessionEnded': 'Сессия аяқталған.',
    'scan.sessionExpired': 'Сессияның мерзімі аяқталды.',
    'scan.tokenInvalid': 'QR-код жарамсыз немесе ескірген.',
    'scan.tokenRefreshed': 'QR-код жаңартылды. Жаңа кодты сканерлеңіз.',
    'scan.geoUnknown': 'Сессия геолокациясы белгісіз.',
    'scan.alreadyMarked': 'Сіз бұл сабаққа бұрын тіркелгенсіз!',
    'scan.fingerprintLoading': 'Құрылғы анықтау жүктелуде. Қайта сканерлеңіз.',
    'scan.deviceUsed': 'Бұл құрылғы осы сессияда басқа студент ({student}) үшін қолданылған. Бір құрылғыдан тек бір студент тіркеле алады.',
    'scan.geoError': 'Геолокацияны алу кезінде қате болды.',
    'scan.success': 'Қатысу сәтті тіркелді!',
    'scan.successFlagged': 'Қатысу тіркелді, бірақ қашықтық шегінен тыс — белгіленді.',
    'scan.recordError': 'Қатысуды тіркеу кезінде қате болды.'
  },

  ru: {
    'common.loading': 'Загрузка...',

    'auth.email': 'Электронная почта',
    'auth.password': 'Пароль',
    'auth.err.invalidEmail': 'Неверный формат электронной почты.',
    'auth.err.userDisabled': 'Эта учётная запись временно заблокирована.',
    'auth.err.userNotFound': 'Такая учётная запись не зарегистрирована.',
    'auth.err.wrongPassword': 'Неверный пароль.',
    'auth.err.invalidCredential': 'Введённые данные недействительны или устарели.',
    'auth.err.signinDefault': 'Не удалось войти.',
    'auth.err.emailInUse': 'Эта электронная почта уже зарегистрирована.',
    'auth.err.weakPassword': 'Пароль слишком короткий или простой.',
    'auth.err.signupDefault': 'Регистрация не удалась.',

    'signin.title': 'Вход',
    'signin.button': 'Войти',
    'signin.footer': 'Нет учётной записи?',
    'signin.signupLink': 'Регистрация',

    'signup.title': 'Регистрация',
    'signup.studentId': 'ID студента',
    'signup.studentIdPlaceholder': '12345',
    'signup.fullName': 'Полное имя',
    'signup.fullNamePlaceholder': 'Ваше имя',
    'signup.button': 'Зарегистрироваться',
    'signup.footer': 'Уже есть учётная запись?',
    'signup.signinLink': 'Войти',

    'scan.welcome': 'Добро пожаловать, {name}',
    'scan.openCamera': 'Открыть камеру',
    'scan.checking': 'Проверка...',
    'scan.logout': 'Выйти',
    'scan.cameraError': 'Ошибка при запуске камеры.',
    'scan.alreadyThisQR': 'Эта сессия уже зарегистрирована!',
    'scan.notAuth': 'Пользователь не авторизован.',
    'scan.qrUnreadable': 'Не удалось прочитать данные QR-кода.',
    'scan.qrIncomplete': 'Данные QR-кода неполные.',
    'scan.sessionNotFound': 'Сессия не найдена.',
    'scan.sessionEnded': 'Сессия завершена.',
    'scan.sessionExpired': 'Срок действия сессии истёк.',
    'scan.tokenInvalid': 'QR-код недействителен или устарел.',
    'scan.tokenRefreshed': 'QR-код обновлён. Отсканируйте новый код.',
    'scan.geoUnknown': 'Геолокация сессии неизвестна.',
    'scan.alreadyMarked': 'Вы уже зарегистрированы на этом уроке!',
    'scan.fingerprintLoading': 'Определение устройства загружается. Отсканируйте снова.',
    'scan.deviceUsed': 'Это устройство уже использовано в этой сессии другим студентом ({student}). С одного устройства может зарегистрироваться только один студент.',
    'scan.geoError': 'Ошибка при получении геолокации.',
    'scan.success': 'Посещение успешно зарегистрировано!',
    'scan.successFlagged': 'Посещение записано, но расстояние превышено — отмечено.',
    'scan.recordError': 'Ошибка при регистрации посещения.'
  },

  en: {
    'common.loading': 'Loading...',

    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.err.invalidEmail': 'Invalid email format.',
    'auth.err.userDisabled': 'This account is temporarily disabled.',
    'auth.err.userNotFound': 'No such account is registered.',
    'auth.err.wrongPassword': 'Wrong password.',
    'auth.err.invalidCredential': 'The provided credentials are invalid or expired.',
    'auth.err.signinDefault': 'Sign-in failed.',
    'auth.err.emailInUse': 'This email is already registered.',
    'auth.err.weakPassword': 'Password is too short or weak.',
    'auth.err.signupDefault': 'Sign-up failed.',

    'signin.title': 'Sign in',
    'signin.button': 'Sign in',
    'signin.footer': "Don't have an account?",
    'signin.signupLink': 'Sign up',

    'signup.title': 'Sign up',
    'signup.studentId': 'Student ID',
    'signup.studentIdPlaceholder': '12345',
    'signup.fullName': 'Full name',
    'signup.fullNamePlaceholder': 'Your name',
    'signup.button': 'Sign up',
    'signup.footer': 'Already have an account?',
    'signup.signinLink': 'Sign in',

    'scan.welcome': 'Welcome, {name}',
    'scan.openCamera': 'Open camera',
    'scan.checking': 'Checking...',
    'scan.logout': 'Log out',
    'scan.cameraError': 'Error starting the camera.',
    'scan.alreadyThisQR': 'This session is already registered!',
    'scan.notAuth': 'User is not authorized.',
    'scan.qrUnreadable': 'Could not read the QR code data.',
    'scan.qrIncomplete': 'QR code data is incomplete.',
    'scan.sessionNotFound': 'Session not found.',
    'scan.sessionEnded': 'Session has ended.',
    'scan.sessionExpired': 'Session has expired.',
    'scan.tokenInvalid': 'QR code is invalid or outdated.',
    'scan.tokenRefreshed': 'QR code was refreshed. Scan the new code.',
    'scan.geoUnknown': 'Session location is unknown.',
    'scan.alreadyMarked': 'You are already registered for this class!',
    'scan.fingerprintLoading': 'Device detection is loading. Scan again.',
    'scan.deviceUsed': 'This device was already used in this session by another student ({student}). Only one student can register per device.',
    'scan.geoError': 'Error getting geolocation.',
    'scan.success': 'Attendance recorded successfully!',
    'scan.successFlagged': 'Attendance recorded, but distance exceeded — flagged.',
    'scan.recordError': 'Error recording attendance.'
  }
};

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && translations[saved] ? saved : DEFAULT_LANG;
  });

  const setLang = useCallback((code) => {
    if (!translations[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
  }, []);

  // Перевод по ключу с подстановкой {переменных}
  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations[DEFAULT_LANG];
      let str = dict[key];
      if (str == null) str = translations[DEFAULT_LANG][key];
      if (str == null) str = key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          str = str.split(`{${k}}`).join(vars[k]);
        });
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n LanguageProvider ішінде қолданылуы керек');
  return ctx;
}
