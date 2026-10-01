import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeaturedEpisodePlayer from "./FeaturedEpisodePlayer";
import { track } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

describe("FeaturedEpisodePlayer", () => {
  it("uses a local thumbnail and does not contact YouTube before activation", () => {
    const { container } = render(<FeaturedEpisodePlayer />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/media/headhunters-nw-episode-067-thumbnail.webp",
    );
    expect(
      screen.getByRole("button", { name: "Load episode player" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Watch on YouTube" }),
    ).toHaveAttribute("target", "_blank");
  });

  it("loads a non-autoplay iframe, moves focus, and retains the fallback", () => {
    const { container } = render(<FeaturedEpisodePlayer />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load episode player" }),
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/ArPZd4Pzaxk",
    );
    expect(iframe).toHaveAccessibleName(/HeadHunters NW episode 067/);
    expect(iframe).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Watch on YouTube" }),
    ).toHaveAttribute("href", "https://youtu.be/ArPZd4Pzaxk");
    expect(track).toHaveBeenCalledWith("cta_click", {
      location: "featured",
      cta: "load_episode_player",
    });
  });
});
