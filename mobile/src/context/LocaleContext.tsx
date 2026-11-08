// ============================================================================
// Mizan (ميزان) - Locale Context & Dynamic RTL Direction Engine
// ============================================================================

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Locale, translations, TranslationSchema } from '../i18n/translations';

interface LocaleContextType {
  locale: Locale;
  isRTL: boolean;
  setLocale: (newLocale: Locale) => void;
  toggleLocale: () => void;
  t: TranslationSchema;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shouldBeRTL = newLocale === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  const isRTL = locale === 'ar';
  const t = translations[locale];

  return (
    <LocaleContext.Provider value={{ locale, isRTL, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
