import { describe, expect, it } from "vitest";
import { extractAppleTrackId, humanizeSoundSlug, parseLegacyMusicShare, slugifySoundName } from "./musicShare";

describe("musicShare parsing", () => {
  it("parses rich music share with preview url", () => {
    const message = [
      "🎵 Midnight City — M83",
      "Synthwave · 3:58",
      "Listen: https://hizovo.com/sound/midnight-city",
      "Preview: https://cdn.example.com/audio/midnight-city.mp3",
    ].join("\n");

    const parsed = parseLegacyMusicShare(message);

    expect(parsed).toEqual({
      title: "Midnight City",
      artist: "M83",
      genre: "Synthwave",
      duration: "3:58",
      soundPath: "/sound/midnight-city",
      previewUrl: "https://cdn.example.com/audio/midnight-city.mp3",
    });
  });

  it("parses title/artist even without metadata", () => {
    const parsed = parseLegacyMusicShare("🎵 Blinding Lights — The Weeknd");

    expect(parsed?.title).toBe("Blinding Lights");
    expect(parsed?.artist).toBe("The Weeknd");
    expect(parsed?.soundPath).toBe("/sound/blinding-lights");
    expect(parsed?.previewUrl).toBeUndefined();
  });

  it("returns null for malformed content", () => {
    expect(parseLegacyMusicShare("Just a normal message")).toBeNull();
  });

  it("slugifies and humanizes sound names", () => {
    expect(slugifySoundName("  Don't Stop!  ")) .toBe("dont-stop");
    expect(humanizeSoundSlug("midnight-city_live")).toBe("Midnight City Live");
  });

  it("extracts Apple track id from Apple Music URL", () => {
    const url = "https://music.apple.com/us/album/wonderwall/1517447030?i=1517447036";
    expect(extractAppleTrackId(url)).toBe("1517447036");
  });
});
