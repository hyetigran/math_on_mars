export function availableWorker(state: {
  adults: number;
  foodSummary: { farms: Record<string, { workerId: string | null }> };
}): string | undefined {
  const assigned = new Set(
    Object.values(state.foodSummary.farms).map((farm) => farm.workerId),
  );
  return Array.from(
    { length: state.adults },
    (_, index) => `adult-${index + 1}`,
  ).find((worker) => !assigned.has(worker));
}
