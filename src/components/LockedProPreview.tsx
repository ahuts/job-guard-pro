import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LockedProPreview({ onUnlock, busy = false }: { onUnlock: () => void; busy?: boolean }) {
  return <section aria-label="Pro posting comparison preview" className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-5">
    <div className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" /> Deeper posting investigation with Pro</div>
    <p className="mt-2 text-sm text-muted-foreground">See how the LinkedIn role compares with a verified employer posting when public sources are available.</p>
    <div className="relative mt-4">
      <div aria-hidden="true" className="pointer-events-none select-none space-y-2 blur-sm">
        <div className="rounded border p-3 text-sm">Responsibilities and role scope</div>
        <div className="rounded border p-3 text-sm">Qualifications and seniority</div>
        <div className="rounded border p-3 text-sm">Location and application path</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/35">
        <Button type="button" disabled={busy} onClick={onUnlock}>{busy ? 'Opening upgrade…' : 'Unlock Pro comparison'}</Button>
      </div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">This is a preview, not a finding for this job. Public evidence may be incomplete.</p>
  </section>;
}
