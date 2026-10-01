import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import FeaturedEpisodePlayer from "@/components/FeaturedEpisodePlayer";
import { Button } from "@/components/ui/button";
import {
  FEATURED_TITLE,
  FEATURED_DESCRIPTION,
  FEATURED_IMAGE,
  HEADHUNTERS_EPISODE as episode,
} from "@/lib/featured";
import { SITE_ORIGIN, webPageSchema } from "@/lib/seo";
import { track } from "@/lib/analytics";

const takeaways = [
  {
    title: "Verify the recruiter independently.",
    text: "Use contact details you find on the recruiting firm’s or employer’s official website, not just those in the message you received. A real company name does not prove the sender represents it.",
  },
  {
    title: "Check the exact opportunity.",
    text: "Look for the role on the employer’s careers site and compare the details. If it is not publicly listed, ask the company to confirm it: a missing listing alone is not proof of a scam.",
  },
  {
    title: "Pause when consideration comes with a price tag.",
    text: "Pressure to buy a résumé rewrite, screening service, or equipment as a condition of moving forward is a warning sign. Verify the process independently before paying or sharing sensitive information.",
  },
];

export default function Featured() {
  const { hash } = useLocation();
  useEffect(() => {
    track("organic_landing_view", { page: "/featured" });
  }, []);
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const frame = requestAnimationFrame(() =>
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={FEATURED_TITLE}
        description={FEATURED_DESCRIPTION}
        path="/featured"
        image={`${SITE_ORIGIN}${FEATURED_IMAGE}`}
        jsonLd={webPageSchema({
          name: FEATURED_TITLE,
          description: FEATURED_DESCRIPTION,
          path: "/featured",
        })}
      />
      <Navbar />
      <main className="pt-36 pb-20 md:pt-44">
        <div className="container mx-auto px-4 max-w-5xl">
          <header className="max-w-2xl mb-12">
            <p className="text-sm font-semibold text-primary mb-3">
              Podcasts & press
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
              GhostJob in the spotlight
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Conversations and coverage about GhostJob and helping job seekers
              make informed decisions.
            </p>
          </header>
          <article
            id={episode.id}
            aria-labelledby="episode-heading"
            className="scroll-mt-32 rounded-2xl border border-border bg-card p-5 md:p-10 shadow-sm"
          >
            <div className="grid md:grid-cols-[240px_1fr] items-center gap-8 mb-8">
              <figure className="max-w-xs mx-auto md:mx-0">
                <img
                  src={episode.artwork}
                  alt="HeadHunters NW episode 67 artwork featuring Michael Petronella, Aaron Hutsell, and Shaylene Keiner"
                  width={1200}
                  height={1200}
                  decoding="async"
                  className="w-full h-auto rounded-xl"
                />
                <figcaption className="mt-2 text-xs text-muted-foreground">
                  Artwork courtesy of HeadHunters NW.
                </figcaption>
              </figure>
              <div>
                <p className="text-sm font-semibold text-primary mb-3">
                  Featured on HeadHunters NW · Episode 067
                </p>
                <h2
                  id="episode-heading"
                  className="text-2xl md:text-3xl font-bold tracking-tight mb-4"
                >
                  Fake recruiters. Real consequences.
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {episode.summary}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Hosted by Shaylene Keiner, with guests Michael “Mike”
                  Petronella and Aaron Hutsell.
                </p>
              </div>
            </div>
            <FeaturedEpisodePlayer />
            <section aria-labelledby="conversation-heading" className="mt-10">
              <h3 id="conversation-heading" className="text-xl font-bold mb-3">
                A convincing pitch deserves a closer look
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                An executive search can sound credible and still come from an
                impersonator. Mike’s experience shows how a familiar company
                name and a promising senior role can open the door to pressure
                for paid services. This conversation connects that experience
                with Aaron’s work on GhostJob: helping job seekers examine
                public posting evidence before committing more time to an
                application.
              </p>
            </section>
            <section aria-labelledby="takeaways-heading" className="mt-8">
              <h3 id="takeaways-heading" className="text-xl font-bold mb-5">
                Three things to take into your next job search
              </h3>
              <ol className="grid md:grid-cols-3 gap-5">
                {takeaways.map((item, index) => (
                  <li key={item.title} className="rounded-xl bg-primary/5 p-5">
                    <span className="text-sm font-bold text-primary">
                      0{index + 1}
                    </span>
                    <h4 className="font-semibold mt-2 mb-3">{item.title}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.text}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
            <section
              aria-labelledby="founder-heading"
              className="mt-8 border-t border-border pt-8"
            >
              <h3 id="founder-heading" className="text-xl font-bold mb-3">
                It started with helping people close to home
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Aaron first built GhostJob to help friends and colleagues
                affected by a large layoff at the company where he works,
                offering the extension to them for free. As more job seekers
                shared their experiences—wasted applications, convincing scams,
                and money lost while trying to find work—the vision grew beyond
                that initial circle.
              </p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Today, GhostJob checks LinkedIn postings against public employer
                sources to help you assess the available evidence. It does not
                authenticate recruiter messages or guarantee that a role is
                legitimate or actively hiring. Independent verification still
                matters.
              </p>
            </section>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Button asChild>
                <Link
                  to="/#scan"
                  onClick={() =>
                    track("cta_click", {
                      location: "featured",
                      cta: "check_linkedin_job",
                    })
                  }
                >
                  Check a LinkedIn job{" "}
                  <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <a
                href={episode.hostUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("cta_click", {
                    location: "featured",
                    cta: "host_podcast",
                  })
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                HeadHunters NW podcast{" "}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={episode.pressUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("cta_click", {
                    location: "featured",
                    cta: "press_release",
                  })
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Press release{" "}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
