import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Step { label: string; icon?: ReactNode; }

interface Props {
  steps: Step[];
  current: number;
  title: string;
}

export function StepWizard({ steps, current, title }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-primary mb-4">{title}</h1>
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    done ? 'bg-primary border-primary text-white' :
                    active ? 'bg-card border-primary text-primary' :
                    'bg-card border-border text-muted-foreground'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active || done ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < current ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface NavProps {
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export function StepNav({ step, total, onBack, onNext, onSubmit, submitting }: NavProps) {
  const { t } = useLanguage();
  const isLast = step === total - 1;
  return (
    <div className="flex justify-between items-center pt-6 mt-6 border-t border-border">
      <button
        onClick={onBack}
        disabled={step === 0}
        className="px-6 py-2.5 rounded-lg border-2 border-border text-muted-foreground font-medium hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← {t('common.back')}
      </button>
      {isLast ? (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-8 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all bg-primary hover:bg-primary/90"
        >
          {submitting ? t('common.submitting') : `✓ ${t('common.submit')}`}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-lg font-medium text-white transition-all bg-primary hover:bg-primary/90"
        >
          {t('common.next')} →
        </button>
      )}
    </div>
  );
}
