import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";

export const homepageFaqs = [
  {
    question: "What is a ghost job?",
    answer:
      "A ghost job is a posting that appears open without a corresponding active hiring opportunity. Public sources can reveal inconsistencies, but they cannot establish an employer's private hiring intent.",
  },
  {
    question: "How does GhostJob calculate the Trust Score?",
    answer:
      "The current Trust Score starts neutral and changes when public evidence supports a matching employer role, an active application path, current source details, or an explicit closure. Reposting, age, salary, and applicant count are context rather than proof of hiring intent.",
  },
  {
    question: "What signals does GhostJob use?",
    answer:
      "Free checks employer identity, available public postings, and the application path. Pro can investigate additional employer sources and compare responsibilities, qualifications, seniority, location, and requisition details when enough evidence is available.",
  },
  {
    question: "Does GhostJob work only on LinkedIn?",
    answer:
      "GhostJob currently accepts LinkedIn job URLs on this site and scans the active LinkedIn listing through its Chrome extension.",
  },
  {
    question: "Is my LinkedIn data sent anywhere?",
    answer:
      "GhostJob sends job details needed to check public employer and hiring-platform sources. Pro investigation may share posting evidence with the providers named in our Privacy Policy. GhostJob does not use your LinkedIn messages.",
  },
  {
    question: "Can GhostJob tell if a job is a scam or just stale?",
    answer:
      "GhostJob can show evidence-supported posting cautions, including certain payment or credential requests. It cannot determine whether an employer privately intends to hire or verify a recruiter's identity. Use the official company site for sensitive decisions.",
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
