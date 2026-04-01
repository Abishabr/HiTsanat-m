import { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface Step { label: string; icon?: ReactNode; }

interface Props {
  steps: Step[];
  current: number;
  title: string;
}

export function StepWizard({ steps, current, title }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-[#5f0113] mb-4">{title}</h1>
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    done ? 'bg-[#5f0113] border-[#5f0113] text-white' :
                    active ? 'bg-white border-[#5f0113] text-[#5f0113]' :
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active ? 'text-[#5f0113]' : done ? 'text-[#5f0113]' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < current ? 'bg-[#5f0113]' : 'bg-gray-200'}`} />
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
  const isLast = step === total - 1;
  return (
    <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
      <button
        onClick={onBack}
        disabled={step === 0}
        className="px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-600 font-medium hover:border-[#5f0113] hover:text-[#5f0113] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Back
      </button>
      {isLast ? (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-8 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #5f0113, #8b0000)' }}
        >
          {submitting ? 'Submitting…' : '✓ Submit Registration'}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-lg font-medium text-white transition-all"
          style={{ backgroundColor: '#5f0113' }}
        >
          Next →
        </button>
      )}
    </div>
  );
}
