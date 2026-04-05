import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Building2, Save } from 'lucide-react';
import type { AnalysisResult } from '@/services/jobScraper';

interface GhostScoreDisplayProps {
  result: AnalysisResult;
  onSave?: () => void;
}

export function GhostScoreDisplay({ result, onSave }: GhostScoreDisplayProps) {
  const { job, ghostScore } = result;

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'low': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'medium': return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'high': return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'critical': return <AlertTriangle className="w-6 h-6 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <Card className="border-l-4" style={{ borderLeftColor: getRatingColor(ghostScore.rating).replace('bg-', '') }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getRatingIcon(ghostScore.rating)}
              <div>
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {job.company} • {job.location}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{ghostScore.score}</div>
              <div className="text-sm text-muted-foreground">Ghost Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={ghostScore.score} className="h-3" />
          
          <div className="flex gap-2 flex-wrap">
            <Badge variant={ghostScore.rating === 'low' ? 'default' : 'secondary'}>
              {ghostScore.rating === 'low' && '✓ Likely Real'}
              {ghostScore.rating === 'medium' && '⚠ Proceed with Caution'}
              {ghostScore.rating === 'high' && '⚠ Likely Ghost Job'}
              {ghostScore.rating === 'critical' && '✗ Almost Certainly Fake'}
            </Badge>
            {job.salary && (
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Salary Listed
              </Badge>
            )}
            {job.postedAt && (
              <Badge variant="outline">
                Posted: {job.postedAt}
              </Badge>
            )}
          </div>

          <p className="text-sm">{ghostScore.summary}</p>

          {onSave && (
            <Button onClick={onSave} variant="outline" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save to Tracker
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Signals Breakdown */}
      {ghostScore.signals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Red Flags Detected ({ghostScore.signals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {ghostScore.signals.map((signal, index) => (
                <AccordionItem key={index} value={`signal-${index}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span>{signal.name}</span>
                      <Badge variant="secondary" className="text-xs">+{signal.weight} pts</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {signal.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {job.employmentType && (
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p>{job.employmentType}</p>
              </div>
            )}
            {job.experienceLevel && (
              <div>
                <span className="text-muted-foreground">Level:</span>
                <p>{job.experienceLevel}</p>
              </div>
            )}
            {job.applicants && (
              <div>
                <span className="text-muted-foreground">Applicants:</span>
                <p>{job.applicants}</p>
              </div>
            )}
            {job.salary && (
              <div>
                <span className="text-muted-foreground">Salary:</span>
                <p>{job.salary}</p>
              </div>
            )}
          </div>
          
          {job.description && (
            <div>
              <h4 className="font-medium mb-2">Description Preview</h4>
              <p className="text-sm text-muted-foreground line-clamp-6">
                {job.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
