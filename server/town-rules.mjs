export class TownRuleError extends Error {}
export const requireRule = (condition, message) => {
  if (!condition) throw new TownRuleError(message);
};
