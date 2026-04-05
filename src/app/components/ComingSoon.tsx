import { Clock } from 'lucide-react';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({ title = 'Coming Soon', description = 'This feature is under development and will be available soon.' }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4 p-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5f01130d' }}>
        <Clock className="w-10 h-10" style={{ color: '#5f0113' }} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ backgroundColor: '#5f01130d', color: '#5f0113' }}>
        <Clock className="w-4 h-4" />
        Under Development
      </div>
    </div>
  );
}
