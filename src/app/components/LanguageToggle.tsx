import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isEnglish ? 'Toggle language' : 'ቋንቋ ቀይር'}
      onClick={toggleLanguage}
    >
      <span className="text-sm font-medium">{isEnglish ? 'EN' : 'አማ'}</span>
    </Button>
  );
}
