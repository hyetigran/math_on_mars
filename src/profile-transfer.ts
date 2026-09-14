import { decodeProfiles, ProfileStorageError } from "./persistence";
import type { Profile } from "./types";

export function exportProfile(profile: Profile): string {
  const validated = decodeProfiles(JSON.stringify([profile]))[0];
  return JSON.stringify(
    { format: "math-on-mars-profile", version: 1, profile: validated },
    null,
    2,
  );
}

export function readProfileTransfer(raw: string): {
  profile: Profile;
  historyOnly: boolean;
} {
  const value = JSON.parse(raw);
  if (!value || value.format !== "math-on-mars-profile" || value.version !== 1)
    throw new ProfileStorageError(
      "Choose a supported Math on Mars profile export.",
    );
  try {
    return {
      profile: decodeProfiles(JSON.stringify([value.profile]))[0],
      historyOnly: false,
    };
  } catch (error) {
    if (
      !value.profile ||
      typeof value.profile !== "object" ||
      !value.profile.activeRun
    )
      throw error;
    const { activeRun: _run, ...history } = value.profile;
    return {
      profile: decodeProfiles(JSON.stringify([history]))[0],
      historyOnly: true,
    };
  }
}
