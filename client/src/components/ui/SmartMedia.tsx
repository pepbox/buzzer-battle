import React, { useEffect, useMemo, useState } from "react";
import { Box, SxProps, Theme, Typography } from "@mui/material";

type MediaKind = "text" | "image" | "video" | "audio" | "gif" | "file";
type RenderKind = "image" | "video" | "audio" | "iframe" | "link";

export interface SmartMediaItem {
  type: MediaKind;
  url?: string;
  text?: string;
  name?: string;
  mimeType?: string;
}

export interface SmartMediaProps {
  media: SmartMediaItem;
  alt?: string;
  sx?: SxProps<Theme>;
  audioSx?: SxProps<Theme>;
  iframeSx?: SxProps<Theme>;
}

const inferKindFromUrl = (url: string): RenderKind | null => {
  const normalizedUrl = url.split("?")[0].split("#")[0].toLowerCase();

  if (/\.(gif|png|jpe?g|webp|svg|bmp|avif)$/.test(normalizedUrl)) {
    return "image";
  }
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(normalizedUrl)) {
    return "video";
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(normalizedUrl)) {
    return "audio";
  }
  if (/\.(pdf)$/.test(normalizedUrl)) {
    return "iframe";
  }

  return null;
};

const inferKindFromMimeType = (mimeType?: string): RenderKind | null => {
  if (!mimeType) return null;

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "iframe";

  return null;
};

const normalizeMediaType = (type: MediaKind): RenderKind | null => {
  if (type === "image" || type === "gif") return "image";
  if (type === "video") return "video";
  if (type === "audio") return "audio";
  return null;
};

const uniqueKinds = (kinds: Array<RenderKind | null | undefined>) =>
  kinds.filter(Boolean).filter((kind, index, array) => array.indexOf(kind) === index) as RenderKind[];

const getEmbeddableUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (
      hostname.includes("youtube.com") ||
      hostname.includes("youtube-nocookie.com")
    ) {
      if (parsedUrl.pathname === "/watch") {
        const videoId = parsedUrl.searchParams.get("v");
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathSegments[0] === "embed" && pathSegments[1]) {
        return url;
      }
      if (pathSegments[0] === "shorts" && pathSegments[1]) {
        return `https://www.youtube.com/embed/${pathSegments[1]}`;
      }
    }

    if (hostname.includes("drive.google.com")) {
      const fileMatch = parsedUrl.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileMatch?.[1]) {
        return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
      }

      const openFileId = parsedUrl.searchParams.get("id");
      if (openFileId) {
        return `https://drive.google.com/file/d/${openFileId}/preview`;
      }
    }
  } catch {
    return url;
  }

  return url;
};

// Question/answer assets are view-only: no download, playback speed,
// picture-in-picture, casting, or "save as" via right-click / long-press.
const RESTRICTED_CONTROLS = "nodownload noplaybackrate noremoteplayback";
const blockContextMenu = (event: React.SyntheticEvent) => event.preventDefault();
const noSaveSx = {
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
} as const;

const isPdfUrl = (url: string) => /\.pdf($|[?#])/i.test(url);

/** Hide the built-in PDF viewer toolbar (download / print) where supported. */
const withoutPdfToolbar = (url: string) =>
  isPdfUrl(url) && !url.includes("#")
    ? `${url}#toolbar=0&navpanes=0`
    : url;

const SmartMedia: React.FC<SmartMediaProps> = ({
  media,
  alt,
  sx,
  audioSx,
  iframeSx,
}) => {
  const [candidateIndex, setCandidateIndex] = useState(0);

  const candidates = useMemo(() => {
    if (!media.url) return ["link"] as RenderKind[];

    const explicitKind = normalizeMediaType(media.type);
    const mimeKind = inferKindFromMimeType(media.mimeType);
    const inferredKind = inferKindFromUrl(media.url);

    return uniqueKinds([
      explicitKind,
      mimeKind,
      inferredKind,
      "image",
      "video",
      "audio",
      "iframe",
      "link",
    ]);
  }, [media.mimeType, media.type, media.url]);

  const currentCandidate = candidates[Math.min(candidateIndex, candidates.length - 1)];
  const embeddedUrl = media.url ? getEmbeddableUrl(media.url) : undefined;

  const advanceCandidate = () => {
    setCandidateIndex((current) =>
      current < candidates.length - 1 ? current + 1 : current,
    );
  };

  useEffect(() => {
    setCandidateIndex(0);
  }, [media.mimeType, media.type, media.url]);

  if (media.type === "text") {
    return (
      <Typography variant="body2" sx={{ textAlign: "center", color: "#475569" }}>
        {media.text}
      </Typography>
    );
  }

  if (!media.url) {
    return (
      <Typography variant="body2" sx={{ textAlign: "center", color: "#475569" }}>
        {media.name || "Asset unavailable"}
      </Typography>
    );
  }

  if (currentCandidate === "image") {
    return (
      <Box
        component="img"
        src={media.url}
        alt={alt || media.name || "Media"}
        onError={advanceCandidate}
        onContextMenu={blockContextMenu}
        draggable={false}
        sx={[noSaveSx, ...(Array.isArray(sx) ? sx : [sx])]}
      />
    );
  }

  if (currentCandidate === "video") {
    return (
      <Box
        component="video"
        src={media.url}
        controls
        controlsList={RESTRICTED_CONTROLS}
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="metadata"
        onError={advanceCandidate}
        onContextMenu={blockContextMenu}
        sx={sx}
      />
    );
  }

  if (currentCandidate === "audio") {
    return (
      <Box
        component="audio"
        src={media.url}
        controls
        controlsList={RESTRICTED_CONTROLS}
        preload="metadata"
        onError={advanceCandidate}
        onContextMenu={blockContextMenu}
        sx={audioSx || { width: "100%" }}
      />
    );
  }

  if (currentCandidate === "iframe") {
    return (
      <Box sx={{ width: "100%" }}>
        <Box
          component="iframe"
          src={withoutPdfToolbar(embeddedUrl || media.url)}
          title={media.name || "Embedded asset"}
          sx={{
            width: "100%",
            minHeight: 320,
            border: 0,
            borderRadius: 2,
            backgroundColor: "#fff",
            ...iframeSx,
          }}
        />
        {/* Non-PDF embeds (some sites refuse to be framed and render blank) keep a
            way to open the content. PDFs get none, since that is just a download. */}
        {!isPdfUrl(media.url) && (
          <Typography
            component="a"
            href={embeddedUrl || media.url}
            target="_blank"
            rel="noreferrer"
            sx={{
              display: "inline-block",
              mt: 1,
              color: "#1565C0",
              textDecoration: "underline",
              wordBreak: "break-all",
              fontWeight: 600,
            }}
          >
            {media.name || "Open content"}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Typography
      component="a"
      href={media.url}
      target="_blank"
      rel="noreferrer"
      variant="body2"
      sx={{
        color: "#1565C0",
        textDecoration: "underline",
        wordBreak: "break-all",
        fontWeight: 600,
      }}
    >
      {media.name || media.url || "Open linked asset"}
    </Typography>
  );
};

export default SmartMedia;
