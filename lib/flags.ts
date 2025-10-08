// Language to flag emoji mapping
export const languageFlags: Record<string, string> = {
  'en': '🇺🇸', // English
  'pt-BR': '🇧🇷', // Portuguese (Brazil)
  'pt': '🇧🇷', // Portuguese
  'es': '🇪🇸', // Spanish
  'fr': '🇫🇷', // French
  'de': '🇩🇪', // German
  'zh': '🇨🇳', // Chinese
  'ja': '🇯🇵', // Japanese
  'ar': '🇸🇦', // Arabic
  'it': '🇮🇹', // Italian
  'ru': '🇷🇺', // Russian
  'ko': '🇰🇷', // Korean
  'nl': '🇳🇱', // Dutch
  'sv': '🇸🇪', // Swedish
  'no': '🇳🇴', // Norwegian
  'da': '🇩🇰', // Danish
  'fi': '🇫🇮', // Finnish
  'pl': '🇵🇱', // Polish
  'tr': '🇹🇷', // Turkish
  'hi': '🇮🇳', // Hindi
}

export function getLanguageFlag(language: string): string {
  return languageFlags[language] || '🌍'
}

export function getLanguageName(language: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'pt-BR': 'Português (Brasil)',
    'pt': 'Português',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'zh': '中文',
    'ja': '日本語',
    'ar': 'العربية',
  }
  return names[language] || language
}
