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
      "GhostJob starts neutral at 50 and looks for public, concrete verification: an exact employer or ATS role match, an active application destination, LinkedIn company identity, current source evidence, and a specific role description. A confirmed closed employer role is a strong contrary signal. Reposting is only a caution.",
  },
  {
    question: "What signals does GhostJob use?",
    answer:
      "Exact employer/ATS role verification, a live application destination, company identity, current source evidence, concrete role details, an explicitly closed employer role, and LinkedIn's repost label. Salary, benefits, location flexibility, culture language, and experience requirements are Job Quality details—not Trust Score factors.",
  },
  {
    question: "Does GhostJob work only on LinkedIn?",
    answer:
      "Today GhostJob is LinkedIn-native — the extension injects directly into LinkedIn job pages so you get a Trust Score without leaving the listing. Support for additional boards (Indeed, Glassdoor, ZipRecruiter) is on the roadmap.",
  },
  {
    question: "Is my LinkedIn data sent anywhere?",
    answer:
      "GhostJob sends the job details needed to check public employer and ATS sources. Scan observation history stays in extension local storage until you sign in, then it is stored only in your own account. It does not use your LinkedIn messages or account data.",
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
