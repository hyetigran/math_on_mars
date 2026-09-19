import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";
import { acquireAmmo } from "../src/ammo";
import { type AmmoType, uid } from "../src/types";
export function withAmmoPair(
  session: RunSession,
  id: string,
  type: AmmoType,
  repository: ProfileRepository,
): RunSession {
  const profiles = session.profiles;
  acquireAmmo(
    profiles.find((p) => p.id === id)!.activeRun!,
    [0, 1].map(() => ({ id: uid("fixture"), type, tier: 3 })),
  );
  return new RunSession(profiles, repository);
}
