import { useEffect, useRef, useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import { HEADHUNTERS_EPISODE as episode } from "@/lib/featured";
import { track } from "@/lib/analytics";

export default function FeaturedEpisodePlayer() {
  const [loaded, setLoaded] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (loaded) playerRef.current?.focus();
  }, [loaded]);

  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-xl bg-foreground relative">
        {loaded ? (
          <iframe
            ref={playerRef}
            src={`https://www.youtube-nocookie.com/embed/${episode.videoId}`}
            title="HeadHunters NW episode 067 — Michael Petronella and GhostJob creator Aaron Hutsell"
            width={1280}
            height={720}
            tabIndex={0}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
          />
        ) : (
          <button
            type="button"
            aria-label="Load episode player"
            onClick={() => {
              track("cta_click", {
                location: "featured",
                cta: "load_episode_player",
              });
              setLoaded(true);
            }}
            className="group w-full h-full relative focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <img
              src={episode.thumbnail}
              alt=""
              width={1280}
              height={720}
              decoding="async"
              className="w-full h-full object-contain"
            />
            <span className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <span className="rounded-full bg-primary p-4 shadow-lg">
                <Play className="w-7 h-7" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-black/80 px-4 py-2 text-sm font-semibold">
                Load episode player
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Loading the player connects to YouTube. Playback starts only when you
          press play.
        </p>
        <a
          href={episode.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track("cta_click", { location: "featured", cta: "watch_youtube" })
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Watch on YouTube{" "}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
