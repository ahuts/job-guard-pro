import { ArrowUpRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HEADHUNTERS_EPISODE as episode } from "@/lib/featured";
import { track } from "@/lib/analytics";

export default function FeaturedSpotlight() {
  return (
    <section
      aria-labelledby="featured-spotlight-heading"
      className="py-12 md:py-16 border-y border-border bg-primary/5"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
          <figure className="w-64 max-w-full shrink-0">
            <img
              src={episode.artwork}
              alt="HeadHunters NW episode 67 artwork featuring Michael Petronella, Aaron Hutsell, and Shaylene Keiner"
              width={1200}
              height={1200}
              loading="lazy"
              decoding="async"
              className="w-full h-auto rounded-xl shadow-md"
            />
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Artwork courtesy of HeadHunters NW.
            </figcaption>
          </figure>
          <div>
            <p className="text-sm font-semibold text-primary mb-3">
              Featured on HeadHunters NW
            </p>
            <h2
              id="featured-spotlight-heading"
              className="text-2xl md:text-3xl font-bold tracking-tight mb-4"
            >
              Fake recruiters. Real consequences.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {episode.summary}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild>
                <Link
                  to={`/featured#${episode.id}`}
                  onClick={() =>
                    track("cta_click", {
                      location: "homepage_featured",
                      cta: "watch_episode",
                    })
                  }
                >
                  <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  Watch the episode
                </Link>
              </Button>
              <a
                href={episode.pressUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("cta_click", {
                    location: "homepage_featured",
                    cta: "press_release",
                  })
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Read the press release{" "}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
