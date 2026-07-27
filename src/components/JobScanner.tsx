import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertTriangle, XCircle } from 'lucide-react';
import { analyzeJob } from '@/services/jobScraper';
import { GhostScoreDisplay } from './GhostScoreDisplay';
import { useAuth } from '@/contexts/AuthContext';
import AuthDialog from './AuthDialog';
import { track, scoreBand } from '@/lib/analytics';
import type { AnalysisResult } from '@/services/jobScraper';

export function JobScanner() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scansRemaining, setScansRemaining] = useState(3);
  const [authOpen, setAuthOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!user) {
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

    if (scansRemaining <= 0) {
      track('free_scan_limit_reached', { location: 'scanner' });
      setError("You've used all 3 free scans. Go Pro for unlimited scans and saved history.");
      return;
    }

    setLoading(true);
    track('scan_started', { location: 'scanner', scans_remaining: scansRemaining });

    try {
      const analysis = await analyzeJob(url);
      setResult(analysis);
      setScansRemaining(prev => prev - 1);
      track('scan_completed', {
        location: 'scanner',
        band: scoreBand(analysis.ghostScore.score),
        signal_count: analysis.ghostScore.signals.length,
      });
      track('result_viewed', { location: 'scanner', band: scoreBand(analysis.ghostScore.score) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job');
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
            Scan a Job Posting
          </CardTitle>
          <CardDescription>
            Paste a LinkedIn job URL to check if it's a ghost job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://www.linkedin.com/jobs/view/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || scansRemaining <= 0}>
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
          </form>

          {scansRemaining > 0 ? (
            <div className="text-sm text-muted-foreground">
              {scansRemaining} free scan{scansRemaining !== 1 ? 's' : ''} remaining
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                You've used all your free scans.{' '}
                <a href="#pricing" className="underline">Upgrade to Pro</a>{' '}
                for unlimited scans.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <GhostScoreDisplay
          result={result}
          onSave={() => console.log('Save job', result)}
        />
      )}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
