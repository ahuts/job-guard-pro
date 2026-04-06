import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, AlertTriangle, XCircle, Link, FileText } from 'lucide-react';
import { analyzeJob, analyzeFromText } from '@/services/jobScraper';
import { GhostScoreDisplay } from './GhostScoreDisplay';
import type { AnalysisResult } from '@/services/jobScraper';

export function JobScanner() {
  const [url, setUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scansRemaining, setScansRemaining] = useState(3);
  const [mode, setMode] = useState<'url' | 'paste'>('paste');

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!url.trim()) {
      setError('Please enter a job URL');
      return;
    }

    if (!url.includes('linkedin.com')) {
      setError('Only LinkedIn job URLs are supported');
      return;
    }

    if (scansRemaining <= 0) {
      setError("You've used all your free scans. Upgrade to Pro for unlimited scans.");
      return;
    }

    setLoading(true);

    try {
      const analysis = await analyzeJob(url);
      setResult(analysis);
      setScansRemaining(prev => prev - 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze job';
      if (msg.includes('Could not fetch') || msg.includes('requires login')) {
        setError(`${msg} Try the "Paste Description" tab instead — copy the job description from LinkedIn and paste it here.`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!jobText.trim()) {
      setError('Please paste the job description');
      return;
    }

    if (jobText.trim().split(/\s+/).length < 10) {
      setError('Please paste the full job description (at least a few sentences)');
      return;
    }

    if (scansRemaining <= 0) {
      setError("You've used all your free scans. Upgrade to Pro for unlimited scans.");
      return;
    }

    setLoading(true);

    try {
      const analysis = analyzeFromText({
        title: jobTitle.trim() || 'Unknown Position',
        company: companyName.trim() || 'Unknown Company',
        description: jobText.trim(),
      });
      setResult(analysis);
      setScansRemaining(prev => prev - 1);
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
            Analyze any job posting to check if it might be a ghost job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'url' | 'paste')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Paste Description
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                URL (Beta)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-3 mt-4">
              <form onSubmit={handlePasteSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Job title (e.g. Software Engineer)"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    placeholder="Company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Textarea
                  placeholder="Paste the full job description here..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  className="min-h-[120px]"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || scansRemaining <= 0} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Job'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="url" className="space-y-3 mt-4">
              <form onSubmit={handleUrlSubmit} className="space-y-3">
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
                      'Scan'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: LinkedIn may block automated access. If scanning fails, use the "Paste Description" tab.
                </p>
              </form>
            </TabsContent>
          </Tabs>

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
    </div>
  );
}
