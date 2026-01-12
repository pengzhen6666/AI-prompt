import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="group p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 flex items-center gap-2"
      title="Switch Language"
    >
      <Globe className="w-5 h-5 transition-transform duration-500 group-hover:rotate-180" />
      <span className="text-xs font-medium uppercase w-4 text-center inline-block">{i18n.language === 'zh' ? 'EN' : '中'}</span>
    </button>
  );
}
