import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Job } from "@/types";
import type { Json } from "@/integrations/supabase/types";

function rowToJob(row: any): Job {
  return {
    id: row.id,
    user_id: row.user_id,
    job_url: row.job_url ?? undefined,
    job_title: row.job_title,
    company_name: row.company_name,
    company_location: row.company_location ?? undefined,
    posted_date: row.posted_date ?? "",
    has_salary: row.has_salary,
    description: row.description ?? undefined,
    ghost_score: row.ghost_score ?? 0,
    rating: row.rating as Job["rating"] ?? "low",
    signals: Array.isArray(row.signals) ? (row.signals as string[]) : [],
    application_status: row.application_status as Job["application_status"],
    notes: row.notes ?? undefined,
    follow_up_date: row.follow_up_date ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useScannedJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scanned_jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("scanned_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToJob);
    },
    enabled: !!user,
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("scanned_jobs").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanned_jobs"] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (job: Partial<Job> & { id: string }) => {
      const { id, ...updates } = job;
      const dbUpdates: Record<string, any> = {};
      if (updates.application_status !== undefined) dbUpdates.application_status = updates.application_status;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.follow_up_date !== undefined) dbUpdates.follow_up_date = updates.follow_up_date;
      
      const { error } = await supabase.from("scanned_jobs").update(dbUpdates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanned_jobs"] });
    },
  });
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
