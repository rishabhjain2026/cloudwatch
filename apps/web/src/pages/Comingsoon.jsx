
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3 } from 'lucide-react';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center overflow-hidden bg-background px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
          <Clock3 size={30} className="text-primary" />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Coming Soon
        </p>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Something is in the works.
        </h1>

        <p className="mx-auto mb-8 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
          We're working on bringing this feature to InfraPulse.
          Stay tuned — this module will be available in an upcoming phase.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="mt-10 border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">
            InfraPulse · Infrastructure Monitoring
          </p>
        </div>
      </div>
    </main>
  );
}
