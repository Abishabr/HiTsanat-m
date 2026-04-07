import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({
  title = 'Coming Soon',
  description = 'This feature is under development and will be available soon.',
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-6 p-8">
      {/* Icon with gradient ring */}
      <div className="relative">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #5f0113 0%, #8b0000 50%, #b8960a 100%)' }}
        >
          <Construction className="w-12 h-12 text-white" />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute -inset-2 rounded-[28px] opacity-20"
          style={{ border: '2px solid #f3c913' }}
        />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="text-2xl font-black text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>

      <div
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
        style={{
          background: 'linear-gradient(135deg, #5f01130d, #f3c9130d)',
          border: '1px solid #f3c91330',
          color: '#b8960a',
        }}
      >
        <span className="w-2 h-2 rounded-full bg-[#f3c913] animate-pulse" />
        Under Development
      </div>
    </div>
  );
}
