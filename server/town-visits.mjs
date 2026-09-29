import { requireRule } from "./town-rules.mjs";
import { foodSummary } from "./town-food.mjs";
export const ABSENCE_LIMIT = 48 * 3600000;
const VISIT_TIMEOUT = 45000;
function baseline(s, now) {
  return {
    at: now,
    simulatedMs: s.simulatedMs,
    ...s.foodTotals,
    completedJobs: s.jobs.filter((j) => j.status === "completed").length,
  };
}
export function initializeVisits(s) {
  if (s.version < 6) {
    s.version = 6;
    s.simulatedMs = 0;
    s.productionUntil = s.lastSimulatedAt + ABSENCE_LIMIT;
    s.visits = {};
    s.visitBaseline = baseline(s, s.lastSimulatedAt);
  }
}
export function visitTown(s, input, session, now) {
  requireRule(
    typeof input.visitId === "string" &&
      /^[a-zA-Z0-9-]{8,100}$/.test(input.visitId),
    "Invalid visit identity",
  );
  const existing = Object.hasOwn(s.visits, input.visitId)
    ? s.visits[input.visitId]
    : null;
  if (input.event === "open") {
    if (existing) {
      requireRule(
        existing.session === session,
        "Visit belongs to another session",
      );
      return existing.summary;
    }
    const before = s.visitBaseline,
      current = baseline(s, now);
    const summary = {
      elapsedMs: Math.max(0, now - before.at),
      simulatedMs: current.simulatedMs - before.simulatedMs,
      harvested: current.harvested - before.harvested,
      meals: current.meals - before.meals,
      emergencyMeals: current.emergencyMeals - before.emergencyMeals,
      completedJobs: current.completedJobs - before.completedJobs,
      capped: now > s.productionUntil,
      pauses: Object.values(foodSummary(s).farms)
        .filter((f) => !f.operating)
        .map((f) => f.status),
    };
    s.visits[input.visitId] = {
      session,
      lastSeen: now,
      closed: false,
      summary,
    };
    s.productionUntil = now + ABSENCE_LIMIT;
    s.visitBaseline = current;
    return summary;
  }
  requireRule(
    input.event === "heartbeat" || input.event === "leave",
    "Invalid visit event",
  );
  requireRule(
    existing &&
      existing.session === session &&
      !existing.closed &&
      now - existing.lastSeen <= VISIT_TIMEOUT,
    "Town visit expired; open the town again",
  );
  existing.lastSeen = now;
  if (input.event === "leave") existing.closed = true;
  s.productionUntil = now + ABSENCE_LIMIT;
  s.visitBaseline = baseline(s, now);
  return { ok: true };
}
