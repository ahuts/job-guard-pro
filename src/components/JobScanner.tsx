import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertTriangle, XCircle } from 'lucide-react';
import { analyzeJob, refineAnalysis, recordScanObservation, saveAnalysis } from '@/services/jobScraper';
import { GhostScoreDisplay } from './GhostScoreDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import AuthDialog from './AuthDialog';
import { track, scoreBand } from '@/lib/analytics';
import type { AnalysisResult } from '@/services/jobScraper';
import type { FreeUsage } from '@/lib/trustScore';
import { getScanCapabilities } from '@/services/scanCapabilities';
import { redirectToCheckout } from '@/lib/stripe';
import { LockedProPreview } from './LockedProPreview';

export function JobScanner() {
  const { user } = useAuth();
  const { isPro, loading: profileLoading } = useProfile();
  // Preview-only validation aid. This is disabled unless a Vercel Preview
  // build explicitly supplies the flag, and anonymous scans are never saved.
  const allowPreviewAnonymousScan = import.meta.env.VITE_GHOSTJOB_PREVIEW_ALLOW_ANONYMOUS_SCAN === 'true';
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [freeUsage, setFreeUsage] = useState<FreeUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const usageVersion = useRef(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeIntent, setUpgradeIntent] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualEmployerUrl, setManualEmployerUrl] = useState('');
  const [attemptId, setAttemptId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!user || isPro || profileLoading) { setFreeUsage(null); return; }
    let active = true;
    const version = usageVersion.current;
    setUsageLoading(true);
    void getScanCapabilities().then(value => { if (active && version === usageVersion.current) setFreeUsage(value.freeUsage ?? null); })
      .catch(() => { if (active && version === usageVersion.current) setFreeUsage(null); })
      .finally(() => { if (active) setUsageLoading(false); });
    return () => { active = false; };
  }, [user?.id, isPro, profileLoading]);

  const unlockPro = async () => {
    if (!user) { setUpgradeIntent(true); setAuthOpen(true); return; }
    if (upgradeBusy) return;
    setUpgradeBusy(true);
    try { await redirectToCheckout(); }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open checkout. Please try again.');
      setUpgradeBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!user && !allowPreviewAnonymousScan) {
      track('cta_click', { cta: 'scan_job', location: 'scanner', variant: 'signed_out' });
      setAuthOpen(true);
      return;
    }

    if (!url.trim()) {
      setError('Please enter a job URL');
      return;
    }

    if (!url.includes('linkedin.com')) {
      setError('Only LinkedIn job URLs are supported');
      return;
    }

    setLoading(true);
    track('scan_started', { location: 'scanner', scans_remaining: freeUsage?.remaining });

    try {
      const analysis = manual ? await refineAnalysis({ scanAttemptId: attemptId, firstObservedAt: new Date().toISOString(), job: {
        url, title: manualTitle, company: manualCompany, location: manualLocation, description: manualDescription,
        employerUrl: manualEmployerUrl || undefined, descriptionCoverage: manualDescription ? 'partial' : 'unavailable',
        postedAt: null, salary: null, applicants: null, employmentType: null, experienceLevel: null,
        applicationUrl: null, companyLinkedInUrl: null, reposted: false, promoted: false, activelyReviewing: false, applicationMethod: 'unknown',
      } }) : await analyzeJob(url);
      setResult(analysis);
      if (!isPro) { usageVersion.current += 1; setFreeUsage(analysis.trustScore.freeUsage ?? null); }
      if (user) {
        void recordScanObservation(user.id, analysis).catch(() => {
          // A history write must never hide a completed public-evidence scan.
        });
      }
      track('scan_completed', {
        location: 'scanner',
        band: scoreBand(analysis.trustScore.trustScore),
        signal_count: analysis.trustScore.evidence.length,
        careers_verification: analysis.trustScore.careersVerification,
        scoring_version: analysis.trustScore.scoringVersion,
      });
      track('result_viewed', { location: 'scanner', band: scoreBand(analysis.trustScore.trustScore) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze job';
      setError(message);
      if (/three free job checks/i.test(message)) track('free_scan_limit_reached', { location: 'scanner' });
      if (!isPro) {
        usageVersion.current += 1;
        void getScanCapabilities().then(value => setFreeUsage(value.freeUsage ?? null)).catch(() => setFreeUsage(null));
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Check a LinkedIn job
          </CardTitle>
          <CardDescription>
            {isPro ? 'Check a LinkedIn role against public employer sources and see the deeper comparison when available.' : 'Get a Trust Score and basic employer-source checks. Sign in for three new jobs each month.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://www.linkedin.com/jobs/view/..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setAttemptId(crypto.randomUUID()); }}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Scan Job'
                )}
              </Button>
            </div>
            <Button type="button" variant="link" onClick={() => setManual(!manual)}>Enter job details manually</Button>
            {manual && <div className="space-y-2">
              <label className="block text-sm">Job title<Input required value={manualTitle} maxLength={300} onChange={e => setManualTitle(e.target.value)} /></label>
              <label className="block text-sm">Company<Input required value={manualCompany} maxLength={300} onChange={e => setManualCompany(e.target.value)} /></label>
              <label className="block text-sm">Location / eligibility<Input value={manualLocation} maxLength={300} onChange={e => setManualLocation(e.target.value)} /></label>
              <label className="block text-sm">Employer or job URL<Input type="url" value={manualEmployerUrl} maxLength={2048} onChange={e => setManualEmployerUrl(e.target.value)} /></label>
              <label className="block text-sm">Description<textarea className="block min-h-40 w-full rounded border p-2" value={manualDescription} maxLength={12000} onChange={e => setManualDescription(e.target.value)} /></label>
            </div>}
          </form>

          {isPro ? (
            <div className="text-sm text-muted-foreground">Pro scans available</div>
          ) : (profileLoading || usageLoading) && user ? (
            <div className="text-sm text-muted-foreground">Checking your plan...</div>
          ) : freeUsage ? (
            <div className="text-sm text-muted-foreground">
              {freeUsage.remaining} of {freeUsage.limit} new job checks left this month. Checking the same job again does not use another.
            </div>
          ) : user ? (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>Free scan availability is temporarily unavailable. Please try again shortly.</AlertDescription>
            </Alert>
          ) : null}


          {error && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {error && /three free job checks/i.test(error) && <Button type="button" variant="outline" onClick={() => void unlockPro()} disabled={upgradeBusy}>Unlock Pro</Button>}
        </CardContent>
      </Card>

      {result && (
        <>
          <GhostScoreDisplay
            onResultChange={setResult}
            result={result}
            proAccess={isPro}
            onSave={async () => { if (!user) throw new Error('Sign in to save this job.'); await saveAnalysis(user.id, result); }}
          />
          {!isPro && <LockedProPreview onUnlock={() => void unlockPro()} busy={upgradeBusy} />}
        </>
      )}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} upgradeIntent={upgradeIntent} />
    </div>
  );
}
