'use client';

import { useLanguageDetection, SupportedLanguage } from '@/hooks/useLanguageDetection';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
};

const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  fr: '🇫🇷',
  pt: '🇵🇹',
  de: '🇩🇪',
  it: '🇮🇹',
};

interface LanguageSelectorProps {
  className?: string;
  showFlags?: boolean;
  showNames?: boolean;
}

export default function LanguageSelector({
  className = '',
  showFlags = true,
  showNames = true,
}: LanguageSelectorProps) {
  const { detectedLanguage, setPreferredLanguage, supportedLanguages } = useLanguageDetection();

  return (
    <div className={`relative ${className}`}>
      <select
        value={detectedLanguage}
        onChange={(e) => setPreferredLanguage(e.target.value as SupportedLanguage)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {showFlags && LANGUAGE_FLAGS[lang]} {showNames && LANGUAGE_NAMES[lang]}
          </option>
        ))}
      </select>

      {/* Icono de flecha */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
