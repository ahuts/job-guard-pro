import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";

/** Answer-first summary block shown near the top of each learning page. */
export const AnswerBox = ({
  question,
  answer,
  points,
}: {
  question: string;
  answer: string;
  points: string[];
}) => (
  <div className="rounded-lg border border-border bg-secondary/40 p-5 mb-10">
    <p className="text-sm font-semibold text-foreground mb-2">{question}</p>
    <p className="text-muted-foreground leading-relaxed mb-3">{answer}</p>
    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
      {points.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  </div>
);

/** Contextual CTA pointing readers at the free scanner. */
export const ScanCTA = ({
  location,
  label = "Check a LinkedIn listing",
}: {
  location: string;
  label?: string;
}) => (
  <div className="rounded-lg border border-border p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
    <p className="text-sm text-muted-foreground">
      Got a listing in mind? Paste the URL and get a Trust Score — 3 free scans, no card.
    </p>
    <Link
      to="/#scan"
      onClick={() => track("cta_click", { cta: "check_a_linkedin_listing", location })}
      className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-5 rounded-lg transition-colors"
    >
      {label}
    </Link>
  </div>
);
