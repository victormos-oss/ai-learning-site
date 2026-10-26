"use client";

import { useRef, useState } from "react";
import { Play } from "@phosphor-icons/react";
import { embedUrlFor, type VideoProvider } from "./providers";

type Props = {
  provider: VideoProvider;
  id: string;
  title: string;
  playLabel: string;
  poster?: string;
};

/**
 * Click-to-load embed: a poster and a real button until the visitor presses
 * play, then the provider iframe. No third-party script before interaction,
 * no autoplay before consent, focus moves into the player.
 */
export function VideoFacade({ provider, id, title, playLabel, poster }: Props) {
  const [active, setActive] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  if (active) {
    return (
      <div className="aspect-video overflow-hidden rounded-flap border border-paper-line bg-black">
        <iframe
          ref={frame}
          src={`${embedUrlFor(provider, id)}&autoplay=1`}
          title={title}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full"
          onLoad={() => frame.current?.focus()}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-flap border border-paper-line bg-board text-flap"
      style={
        poster
          ? { backgroundImage: `url(${poster})`, backgroundSize: "cover" }
          : undefined
      }
    >
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
        <span className="inline-flex items-center gap-2 rounded-flap bg-amber px-4 py-2 font-semibold text-amber-ink">
          <Play aria-hidden="true" size={20} weight="fill" />
          {playLabel}
        </span>
      </span>
    </button>
  );
}
