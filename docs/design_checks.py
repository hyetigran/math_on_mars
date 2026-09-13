"""Reproduce the September 13 planning arithmetic. Not a game implementation test.

Run from any directory: python3 /absolute/path/to/docs/design_checks.py
Inputs mirror the explicitly provisional PRD values; update both when tuning.
"""
from fractions import Fraction as F
from pathlib import Path
import json
import re


def question(kind, ratio=F(3)):
    if kind == "first":
        return 20 + 5 * max(F(0), min(F(1), 2 - F(ratio))), 0, True
    if kind == "hint":
        return F(15), 0, False
    if kind == "retry":
        return F(15), 1, False
    if kind == "failed":
        return F(0), 2, False
    if kind == "skip":
        return F(0), 0, False
    raise ValueError(kind)


def reward(items, prior_streak=0, streak_enabled=False):
    n = len(items)
    assert n in (3, 5)
    charge = 5 * sum((item[0] for item in items), F(0)) / n
    wrong = sum(item[1] for item in items)
    streak = prior_streak + 1 if all(item[2] for item in items) else 0
    candidate = 3 if charge >= 110 else 2 if charge >= 60 else 1
    if streak_enabled and streak >= 2:
        candidate = 3
    final = max(1, candidate - wrong)
    return charge, F(1) + charge / 250, candidate, final, streak


def suggest(accuracy, presented_support, selected=True):
    """Windows only; application still owns cooldowns and evidence eligibility."""
    if not selected:
        return None
    if len(presented_support) >= 10 and sum(presented_support[-10:]) >= 6:
        return "support"
    if len(accuracy) < 10:
        return None
    correct = sum(accuracy[-10:])
    return "advance" if correct >= 9 else "support" if correct <= 5 else "retain"


def fund_burn(remaining, rate, budget, hit_damage, fiery):
    """Planning reservoir example; callers first account for elapsed burn damage."""
    next_rate = max(rate, fiery * hit_damage / 3)
    added = min(budget, max(F(0), 3 * next_rate - remaining))
    if not added:
        return remaining, rate, budget
    return remaining + added, next_rate, budget - added


def main():
    first_fast, first_slow = question("first", 1), question("first", 3)
    hint, retry = question("hint"), question("retry")
    cases = {
        "five_slow": [first_slow] * 5,
        "five_fast": [first_fast] * 5,
        "five_hint_first": [hint] * 5,
        "four_fast_one_hint": [first_fast] * 4 + [hint],
        "four_fast_one_wrong_then_correct": [first_fast] * 4 + [retry],
        "three_fast_two_wrong_then_correct": [first_fast] * 3 + [retry] * 2,
        "three_hint_first": [hint] * 3,
        "two_fast_one_hint": [first_fast] * 2 + [hint],
        "one_fast_two_unseen_zero": [first_fast] + [question("skip")] * 2,
    }
    out = {}
    for name, items in cases.items():
        charge, factor, candidate, final, _ = reward(items)
        out[name] = dict(charge=str(charge), first_modifier=str(factor),
                         candidate=candidate, final=final)
    assert reward(cases["five_hint_first"])[:4] == (F(75), F(13, 10), 2, 2)
    assert reward(cases["five_slow"])[:4] == (F(100), F(7, 5), 2, 2)
    assert reward(cases["four_fast_one_wrong_then_correct"])[3] == 2
    assert reward(cases["three_fast_two_wrong_then_correct"])[3] == 1
    assert reward(cases["three_hint_first"])[0] == 75
    assert reward(cases["two_fast_one_hint"])[0] == F(325, 3)
    assert reward(cases["one_fast_two_unseen_zero"])[0] == F(125, 3)
    assert reward([question("failed")] * 5)[3] == 1
    assert reward([first_slow] * 5, 1, True)[3] == 3
    assert reward([first_slow] * 3, 1, True)[3] == 3
    assert reward([hint] * 5, 1, True)[4] == 0
    assert reward([first_slow] * 5, 1, False)[3] == 2  # no implicit streak adoption
    for ratio, tier in [(F(151, 100), 1), (F(3, 2), 2), (F(149, 100), 2)]:
        # Two unassisted + one assisted + two skipped straddle charge 60.
        items = [question("first", ratio)] * 2 + [hint] + [question("skip")] * 2
        assert reward(items)[2] == tier
    for ratio, tier in [(F(16001, 10000), 2), (F(8, 5), 3), (F(15999, 10000), 3)]:
        assert reward([question("first", ratio)] * 5)[2] == tier
    assert sum(question("first", F(8, 5))[0] for _ in range(5)) == 110
    assert sum(question("first", t)[0] for t in [1, 1, 1, 2]) + 15 == 110
    assert suggest([], [True] * 10) == "support"
    assert suggest([True] * 8 + [False] * 2, [False] * 10) == "retain"
    assert suggest([True] * 9 + [False], [False] * 10) == "advance"
    assert suggest([], [True]) is None  # unseen auto-skips are not extra entries
    assert suggest([True] * 10, [True] * 6 + [False] * 4) == "support"
    assert suggest([True] * 10, [False] * 10, selected=False) is None

    # Counterexample to the former "nonzero first-stat gain" condition.
    base, headroom = F(8, 100), F(1, 100)
    assert min(headroom, base * F(13, 10)) == min(headroom, base * F(7, 5))
    assert headroom < base * F(3, 2)  # revised offer eligibility rejects this case
    full_room = base * F(3, 2)
    assert min(full_room, base * F(13, 10)) < min(full_room, base * F(7, 5))

    # Fresh, weak-refresh and partially funded stronger-hit examples.
    fiery = F(9, 10)
    fresh = fund_burn(F(0), F(0), fiery, F(1), fiery)
    assert fresh == (fiery, F(3, 10), F(0))
    assert fund_burn(fiery, F(3, 10), fiery, F(1, 5), fiery) == (
        fiery, F(3, 10), fiery)  # no free refresh at the same timestamp
    assert fund_burn(F(3, 5), F(3, 10), fiery, F(1, 5), fiery) == (
        fiery, F(3, 10), F(3, 5))  # restoring 0.3 damage costs 0.3
    before, rate, budget = F(1, 10), F(1, 10), F(1, 20)
    after, next_rate, leftover = fund_burn(before, rate, budget, F(2), fiery)
    assert (after, next_rate, leftover) == (F(3, 20), F(3, 5), F(0))
    assert after - before == budget - leftover and after / next_rate <= 3
    tick_damage = min(after, next_rate * F(1, 60))
    assert tick_damage + (after - tick_damage) == after

    budgets = [F(115,100), F(130,100), F(145,100), F(160,100)]
    ammo = []
    for i, volley in enumerate(budgets, start=1):
        piercing = sum((F(1,2)**h for h in range(i+1)), F(0))
        ammo.append(dict(tier=i, pellet_count=i+1, volley_D=str(volley),
                         per_pellet_D=str(volley/(i+1)),
                         solo_piercing_crowd_D=str(piercing),
                         combined_direct_D=str(volley*piercing),
                         chain_max_D=str(F(i,5))))
    direct = F(8,5) * sum((F(1,2)**h for h in range(5)), F(0))
    chain, burn = F(4,5), F(9,10)
    total = direct + chain + burn
    omni_rate = F(28,25)
    passive_damage_rate = F(8,5) * F(8,5)
    assert direct == F(31,10) and total == F(24,5)
    assert total*omni_rate == F(672,125)
    old_direct_chain = 5 * 5 * F(3,5) + 4*F(35,100)
    old_one_volley_burn = 29 * F(3,10) * 3
    assert old_direct_chain == F(82,5)

    # Enumerate the proposed finite K boundaries; layouts are separately reviewed.
    count_items = 11 * 6
    comparison_items = len([(a,b) for a in range(11) for b in range(a+1,11)]) * 2
    compose_items = len([(a,b) for a in range(6) for b in range(6) if a+b <= 5]) * 4
    instances = count_items + comparison_items + compose_items + 3*80
    roles_plus_onboarding = instances*3 + 20
    regen_allowance = roles_plus_onboarding // 5
    assert instances == 500 and roles_plus_onboarding == 1520
    assert roles_plus_onboarding + regen_allowance == 1824
    assert 5 * 2 * 4 == 40  # five pair-of-blue choices, four white-equivalents each

    prd = Path(__file__).with_name("GAME_PLAN.md").read_text()
    families = ["Overclock", "Shield", "Thruster", "Med-service", "Targeting", "Salvage"]
    for family in families:
        assert len(re.findall(r"^\| " + re.escape(family) + r" /", prd, re.M)) == 3
    for marker in ["1 + 0.5 × charge / 125", "3.1D direct + 0.8D chain",
                   "9–10 correct", "six or more support-needed", "8, 16, and 24 salvage"]:
        assert marker in prd, marker

    print(json.dumps({
        "reward_examples": out,
        "ammo_tiers": ammo,
        "damage_bounds": {
            "old_crowd_direct_chain_D": str(old_direct_chain),
            "old_one_volley_lifetime_burn_D": str(old_one_volley_burn),
            "new_crowd_lifetime_D": str(total),
            "new_omni_funding_per_Dr": str(total*omni_rate),
            "new_omni_at_passive_caps_per_D0r0": str(total*omni_rate*passive_damage_rate),
            "new_omni_to_white_piercing_same_passives": str(total*omni_rate/F(3,2))},
        "math_onboarding_narration_subtotal": {"items": instances, "short_clips": roles_plus_onboarding,
             "credits_per_short_clip": 1, "base_credits": roles_plus_onboarding,
             "successful_regeneration_allowance": regen_allowance,
             "credits_with_allowance": roles_plus_onboarding+regen_allowance,
             "excludes": "Additional reward/cache/shop/loadout speech and any required bank expansion"},
        "session_minutes": {"standard_example": (45*40+9*90)/60+6+2,
                            "short_example": (15*40+5*60)/60+3.5+1.5},
        "checks": "Planning arithmetic and listed contract examples passed; no game/device validation performed."
    }, indent=2))


if __name__ == "__main__":
    main()
