export interface Job {
  id: string;
  user_id: string;
  job_url?: string;
  job_title: string;
  company_name: string;
  company_location?: string;
  posted_date: string;
  has_salary: boolean | null;
  description?: string;
  ghost_score: number;
  rating: 'low' | 'medium' | 'high' | 'critical';
  signals: string[];
  application_status: 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted';
  notes?: string;
  follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  subscription_status: 'active' | 'canceled' | 'past_due';
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export type GhostScoreRating = 'low' | 'medium' | 'high' | 'critical';

export interface GhostScoreResult {
  score: number;
  rating: GhostScoreRating;
  signals: string[];
  explanation: string;
}
