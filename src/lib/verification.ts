import type { DescriptionCoverage } from './jobInsights';
export interface CoverageDetails {
  status: DescriptionCoverage;
  truncated: boolean;
  analyzedCharacters: number;
  reason?: string;
}
export interface SourceCheck {
  url: string;
  status: 'checked' | 'unavailable' | 'possible_match' | 'matched';
  reason: string;
  checkedAt: string;
  cached?: boolean;
}
export interface VerificationDetails {
  outcome: 'matched' | 'board_no_match' | 'identity_unresolved' | 'source_unavailable' | 'closed';
  reason: string;
  sourceUrl?: string;
  checkedAt: string;
  sources: SourceCheck[];
  deepSearch?: 'available' | 'sign_in_required' | 'disabled' | 'limited' | 'completed';
}
export const verificationLabels: Record<VerificationDetails['outcome'], string> = {
  matched: 'Matching employer posting found',
  board_no_match: 'Employer careers page found; exact role not confirmed',
  identity_unresolved: 'Employer identity unresolved',
  source_unavailable: 'Employer source unavailable',
  closed: 'Employer source reports this role closed',
};
