import { dimensionNames, emptyInvestigation, findingLabels, investigationLimitations, type Investigation, type InvestigationExcerpt } from '../lib/investigation.js';
import { resolveEmployer, locationsMatch, type ResolverInput, type Resolution, type EmployerCandidate } from './employerResolver.js';
import { publicUrl } from './publicFetch.js';
import { cacheGet, cachePut, hash, storeConfigured } from './searchStore.js';
import { INVESTIGATION_VERSION, investigationKeys, reserveInvestigation, settleInvestigation } from './investigationBudget.js';
import { comparePostings, discoverOfficialSources, evaluateJev, newMeter, providerFailure, type ModelComparison, type ProviderFetch } from './investigationProviders.js';

export interface InvestigationInput extends ResolverInput {
  description?: string; employmentType?: string | null; descriptionCoverage?: string;
  coverageDetails?: { truncated?: boolean }; scanAttemptId?: string; scanMode?: string; linkedinClosed?: boolean;
}
export function investigationFingerprint(input: InvestigationInput) {
  // Only corrected comparison evidence invalidates the paid investigation.
  // Attempt IDs, scan mode, local observation dates and presentation metadata do not.
  return hash([{ title: input.title, company: input.company, location: input.location ?? '', url: input.url ?? '',
    companyLinkedInUrl: input.companyLinkedInUrl ?? '', employerUrl: input.employerUrl ?? '', applicationUrl: input.applicationUrl ?? '',
    requisitionId: input.requisitionId ?? '', description: input.description ?? '', employmentType: input.employmentType ?? '',
    descriptionCoverage: input.descriptionCoverage ?? '', truncated: Boolean(input.coverageDetails?.truncated), linkedinClosed: Boolean(input.linkedinClosed) }, INVESTIGATION_VERSION]);
}
export function investigationAccess(userId: string | null): Investigation['status'] | 'available' {
  if (process.env.GHOSTJOB_OPENAI_INVESTIGATION_ENABLED !== 'true' || process.env.GHOSTJOB_INVESTIGATION_SCHEMA_READY !== 'true' || !process.env.OPENAI_API_KEY || !storeConfigured()) return 'disabled';
  if (!userId) return 'sign_in_required';
  const pilot = (process.env.GHOSTJOB_V3_PILOT_USERS ?? '').split(',').map(v => v.trim()).filter(Boolean);
  return pilot.includes(userId) ? 'available' : 'not_eligible';
}
const normalizeQuote = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const cautionLabels = {
  payment_demand: 'The posting requests payment to obtain employment',
  credential_request: 'The posting requests passwords or verification codes',
  sensitive_data_request: 'The posting requests sensitive information before employment',
};
const cautionPatterns = {
  payment_demand: /\b(pay|payment|fee|purchase|deposit|buy)\b/i,
  credential_request: /password|verification code|one.time code|login credential/i,
  sensitive_data_request: /social security|\bssn\b|bank account|routing number|passport|credit card/i,
};
export function evidenceState(input: InvestigationInput, candidates: EmployerCandidate[]) {
  return { linkedin: { id: 'linkedin', title: input.title, company: input.company, location: input.location ?? '',
    requisitionId: input.requisitionId ?? '', employmentType: input.employmentType ?? '', text: (input.description ?? '').slice(0, 12_000) },
    candidates: candidates.slice(0, 3).map(candidate => ({ id: candidate.id, title: candidate.title, company: candidate.company ?? '', locations: candidate.locations,
      requisitionId: candidate.requisitionId ?? '', employmentType: candidate.employmentType ?? '', text: candidate.text.slice(0, 10_000) })) };
}
export function validateComparison(model: ModelComparison, input: InvestigationInput, resolution: Resolution): Investigation {
  const candidates = resolution.candidates ?? [], selected = candidates.find(c => c.id === model.selectedCandidateId);
  const state = evidenceState(input, candidates);
  const sources = new Map<string, { url: string; text: string }>();
  // Metadata is included exactly as supplied to the model, so it can be cited too.
  let linkedinUrl = '';
  try { if (input.url) linkedinUrl = publicUrl(input.url).href; } catch { /* no citation URL */ }
  if (linkedinUrl) sources.set('linkedin', { url: linkedinUrl, text: normalizeQuote([state.linkedin.title, state.linkedin.company, state.linkedin.location, state.linkedin.requisitionId, state.linkedin.employmentType, state.linkedin.text].join('\n')) });
  for (const candidate of state.candidates) sources.set(candidate.id, { url: candidates.find(c => c.id === candidate.id)!.url, text: normalizeQuote([candidate.title, candidate.company, ...candidate.locations, candidate.requisitionId, candidate.employmentType, candidate.text].join('\n')) });
  function verifiedExcerpts(refs: Array<{ sourceId: string; quote: string }>): InvestigationExcerpt[] {
    return refs.flatMap(ref => {
      const source = sources.get(ref.sourceId), quote = normalizeQuote(ref.quote);
      if (!source || quote.length < 12 || !source.text.includes(quote)) return [];
      return [{ sourceId: ref.sourceId, sourceUrl: source.url, quote }];
    });
  }
  const dimensions: Investigation['dimensions'] = dimensionNames.map(dimension => {
    const rows = model.dimensions.filter(d => d.dimension === dimension);
    const row = rows.length === 1 ? rows[0] : undefined;
    const excerpts = verifiedExcerpts(row?.excerpts ?? []).filter(e => e.sourceId === 'linkedin' || e.sourceId === selected?.id);
    const supported = selected && excerpts.some(e => e.sourceId === 'linkedin') && excerpts.some(e => e.sourceId === selected.id);
    return { dimension, finding: supported ? row!.finding : 'insufficient_evidence', excerpts: supported ? excerpts : [] };
  });
  const knownIdConflict = Boolean(selected && input.requisitionId && selected.requisitionId && input.requisitionId !== selected.requisitionId);
  if (knownIdConflict) {
    const dimension = dimensions.find(d => d.dimension === 'requisition_id')!;
    dimension.finding = 'conflicting'; dimension.excerpts = [];
  }
  let finding = selected ? model.finding : 'insufficient_evidence';
  const semanticSupport = dimensions.filter(d => ['responsibilities', 'required_qualifications'].includes(d.dimension) && d.finding === 'aligned').length === 2;
  // A new requisition can be a repost of the same work. It rules out an
  // exact posting match, but is not by itself proof of a different role.
  const materialConflict = dimensions.some(d => d.dimension !== 'requisition_id' && d.finding === 'conflicting');
  const nativeExact = selected && resolution.verification.outcome === 'matched' && resolution.score.exactRoleMatch && resolution.score.sourceUrl === selected.url;
  const locationConfirmed = selected && locationsMatch(input.location ?? '', selected.locations);
  if (finding === 'exact_match' && (!nativeExact || !semanticSupport || !locationConfirmed || materialConflict || knownIdConflict)) finding = materialConflict ? 'different_role' : semanticSupport ? 'probable_match' : 'insufficient_evidence';
  if (finding === 'probable_match' && (!semanticSupport || materialConflict)) finding = materialConflict ? 'different_role' : 'insufficient_evidence';
  if (finding === 'different_role' && !materialConflict) finding = knownIdConflict && semanticSupport ? 'probable_match' : 'insufficient_evidence';
  const cautionFlags: Investigation['cautionFlags'] = [];
  for (const flag of model.cautionFlags) {
    if (cautionFlags.some(existing => existing.kind === flag.kind)) continue;
    const excerpts = verifiedExcerpts(flag.excerpts).filter(e => e.sourceId === 'linkedin' && cautionPatterns[flag.kind].test(e.quote) &&
      !/(?:never|do not|don't|will not|won't)\s+(?:\w+\s+){0,5}(?:pay|ask|request|require|provide|share|send|charge)|no (?:application|recruitment|interview|hiring) fee/i.test(e.quote));
    if (excerpts.length) cautionFlags.push({ kind: flag.kind, label: cautionLabels[flag.kind], excerpts });
  }
  const limitations = [...investigationLimitations];
  if (input.descriptionCoverage !== 'complete' && input.descriptionCoverage !== 'expanded') limitations.push('The LinkedIn description may be incomplete.');
  if (input.coverageDetails?.truncated) limitations.push('The LinkedIn description was truncated before analysis.');
  if (resolution.verification.outcome === 'closed') limitations.push('The native source check reports this role closed; semantic similarity does not imply availability.');
  if (input.linkedinClosed) limitations.push('LinkedIn says this posting is no longer accepting applications; an employer role may be a separate open requisition.');
  if (selected && !locationConfirmed) limitations.push('Location eligibility was not independently confirmed.');
  if (knownIdConflict) limitations.push('Requisition IDs differ; this may be a related or reopened role, not the same posting.');
  if (!candidates.length) limitations.push('No accessible employer-related candidate posting was available.');
  return { version: 1, status: 'completed', finding, reason: findingLabels[finding], checkedAt: new Date().toISOString(),
    ...(selected ? { sourceUrl: selected.url } : {}), dimensions, cautionFlags, limitations };
}
export interface InvestigationRun { resolution: Resolution; investigation: Investigation }
export interface InvestigationDependencies {
  resolver?: typeof resolveEmployer; fetcher?: ProviderFetch;
  get?: typeof cacheGet; put?: typeof cachePut; reserve?: typeof reserveInvestigation; settle?: typeof settleInvestigation;
  onMetrics?: (metrics: { costMicroUsd: number; usageUncertain: boolean; cached: boolean; latencyMs: number }) => void;
}
export async function investigateJob(input: InvestigationInput, userId: string | null, deadline: number, deps: InvestigationDependencies = {}): Promise<InvestigationRun> {
  const resolver = deps.resolver ?? resolveEmployer, get = deps.get ?? cacheGet, put = deps.put ?? cachePut;
  const access = investigationAccess(userId);
  const fingerprint = investigationFingerprint(input);
  const keys = investigationKeys(userId ?? '', fingerprint);
  if (access === 'available') {
    const cached = await get<InvestigationRun>(keys.resultKey, deadline);
    if (cached) { deps.onMetrics?.({ costMicroUsd: 0, usageUncertain: false, cached: true, latencyMs: 0 }); return cached; }
  }
  let resolution = await resolver(input, { deadline: Math.min(deadline, Date.now() + (access === 'available' ? 5000 : 8500)), collectCandidates: access === 'available' });
  if (access !== 'available') return { resolution, investigation: emptyInvestigation(access, access === 'disabled' ? 'Automatic investigation is not configured.' : access === 'sign_in_required' ? 'Sign in to use automatic investigation.' : 'Automatic investigation is restricted to pilot accounts.') };
  let reservation;
  try { reservation = await (deps.reserve ?? reserveInvestigation)(userId!, fingerprint, deadline); }
  catch { return { resolution, investigation: emptyInvestigation('disabled', 'Paid investigation is unavailable because budget storage could not be verified.') }; }
  if (reservation.status <= 0) return { resolution, investigation: emptyInvestigation(reservation.status === 0 ? 'in_progress' : 'budget_exhausted', reservation.status === 0 ? 'This investigation already started. Retry to retrieve its result; no new paid request will be made.' : 'Investigation capacity reached. Existing verification is still available.') };
  const meter = newMeter(), started = Date.now();
  let investigation: Investigation;
  try {
    if (resolution.verification.outcome !== 'matched' && resolution.verification.outcome !== 'closed') {
      const urls = await discoverOfficialSources(JSON.stringify({ company: input.company, companyLinkedInUrl: input.companyLinkedInUrl, title: input.title, location: input.location, requisitionId: input.requisitionId }), Math.min(deadline - 8500, Date.now() + 17_000), meter, deps.fetcher);
      const discovered = await resolver(input, { deadline: Math.min(deadline - 7000, Date.now() + 10_000), discoveryUrls: urls, collectCandidates: true });
      // Discovery failure or weaker evidence must not erase the native result.
      const rank = (r: Resolution) => r.verification.outcome === 'matched' || r.verification.outcome === 'closed' ? 3 : r.verification.outcome === 'board_no_match' ? 2 : r.score.companyIdentityVerified ? 1 : 0;
      const candidates = [...(discovered.candidates ?? []), ...(resolution.candidates ?? [])].filter((candidate, index, all) => all.findIndex(c => c.url === candidate.url) === index).slice(0, 3);
      if (rank(discovered) >= rank(resolution)) resolution = discovered;
      resolution = { ...resolution, candidates };
    }
    if (Date.now() >= deadline - 1500) throw new Error('Investigation deadline reached');
    const state = evidenceState(input, resolution.candidates ?? []);
    const comparison = await comparePostings(state, deadline - 1500, meter, deps.fetcher);
    investigation = validateComparison(comparison, input, resolution);
    if (process.env.GHOSTJOB_JEV_EVALUATION_ENABLED === 'true' && process.env.TYPESAFE_API_KEY && Date.now() < deadline) {
      const candidate = state.candidates.find(c => c.id === comparison.selectedCandidateId) ?? null;
      try {
        const evaluation = await evaluateJev({ linkedin: state.linkedin, candidate }, deadline - 1500, meter, deps.fetcher);
        await put(`gj:jev-evaluation:${hash([userId, fingerprint])}`, { version: 1, nativeOutcome: resolution.verification.outcome, openaiFinding: investigation.finding, candidateId: candidate?.id ?? null, evaluation, checkedAt: investigation.checkedAt }, 30 * 86400, deadline - 1000);
        console.info('ghostjob_jev_evaluation', { version: 1, status: 'completed', model: evaluation.model, latencyMs: evaluation.latencyMs,
          inputTokens: evaluation.usage.input_tokens, outputTokens: evaluation.usage.output_tokens, stored: true });
      } catch (error) {
        const failure = providerFailure(error);
        console.info('ghostjob_jev_evaluation', { version: 1, status: 'unavailable', ...failure });
        await put(`gj:jev-evaluation:${hash([userId, fingerprint])}`, { version: 1, status: 'unavailable', ...failure, openaiFinding: investigation.finding, checkedAt: investigation.checkedAt }, 30 * 86400, deadline - 1000).catch(() => {});
      }
    }
  } catch (error) {
    console.info('ghostjob_openai_failure', { version: 1, ...providerFailure(error) });
    const timedOut = providerFailure(error).failure === 'timed_out' || Date.now() >= deadline - 1500;
    investigation = emptyInvestigation(timedOut ? 'timed_out' : 'provider_error', timedOut
      ? 'Automatic investigation timed out. The existing source verification has been preserved.'
      : 'Automatic investigation could not complete. The existing source verification has been preserved.');
  }
  const safeResolution: Resolution = { score: resolution.score, verification: resolution.verification };
  const result = { resolution: safeResolution, investigation };
  // Store a retry result before settling. Any unknown provider usage retains the
  // full reservation. Cache/storage failure also remains conservatively charged.
  try {
    await put(reservation.resultKey, result, 86400, deadline - 500);
    if (!meter.uncertain) await (deps.settle ?? settleInvestigation)(reservation, meter.costMicroUsd, deadline);
  } catch { /* Reservation prevents duplicate spend even without a result cache. */ }
  console.info('ghostjob_investigation', { version: 1, status: investigation.status, finding: investigation.finding,
    latencyMs: Date.now() - started, costMicroUsd: meter.costMicroUsd, usageUncertain: meter.uncertain, inputTokens: meter.inputTokens, outputTokens: meter.outputTokens, searches: meter.searches });
  deps.onMetrics?.({ costMicroUsd: meter.costMicroUsd, usageUncertain: meter.uncertain, cached: false, latencyMs: Date.now() - started });
  return result;
}
