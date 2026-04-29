import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";

export const homepageFaqs = [
  {
    question: "What is a ghost job?",
    answer:
      "A ghost job is a public job posting that isn't tied to active hiring. Companies leave them up to build talent pipelines, signal growth to investors, hit recruiter activity targets, or keep evergreen pipelines warm — even when no one is being interviewed for the role.",
  },
  {
    question: "How does GhostJob calculate the Trust Score?",
    answer:
      "GhostJob analyzes 10+ signals on each LinkedIn job page — including how long the post has been live, how often it's been reposted, applicant-count behavior, salary transparency, urgency language, and description quality — then combines them into a 0–100 Trust Score. Higher scores mean the listing looks more like a real, active opening.",
  },
  {
    question: "What signals does GhostJob use?",
    answer:
      "Posting age, repost frequency, applicant-count anomalies, vague or missing salary ranges, urgency and pressure phrases, generic boilerplate descriptions, recruiter activity, company hiring patterns, and several LinkedIn-specific structural signals.",
  },
  {
    question: "Does GhostJob work only on LinkedIn?",
    answer:
      "Today GhostJob is LinkedIn-native — the extension injects directly into LinkedIn job pages so you get a Trust Score without leaving the listing. Support for additional boards (Indeed, Glassdoor, ZipRecruiter) is on the roadmap.",
  },
  {
    question: "Is my LinkedIn data sent anywhere?",
    answer:
      "No. GhostJob runs locally in your browser. We do not collect personal information, browsing history, LinkedIn account data, or messages, and we don't transmit your activity to third-party analytics or advertising networks. See our privacy policy for the full breakdown.",
  },
  {
    question: "Can GhostJob tell if a job is a scam or just stale?",
    answer:
      "GhostJob is optimized to detect ghost jobs — listings that are real companies but not actively hiring. It can flag scam-adjacent red flags (urgency, vague compensation, suspicious senders), but it is not a dedicated scam detector. When in doubt, verify the recruiter directly on the company's career site.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-20 md:py-28 border-t border-border">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Quick answers about ghost jobs, the Trust Score, and how GhostJob works.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {homepageFaqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base md:text-lg font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          Want a deeper dive? Read{" "}
          <Link to="/what-is-a-ghost-job" className="text-primary hover:underline">
            What is a ghost job?
          </Link>
          ,{" "}
          <Link to="/ghost-jobs-on-linkedin" className="text-primary hover:underline">
            Ghost jobs on LinkedIn
          </Link>
          , or{" "}
          <Link to="/how-trust-score-works" className="text-primary hover:underline">
            How the Trust Score works
          </Link>
          .
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
