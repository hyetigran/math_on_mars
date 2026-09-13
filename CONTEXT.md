# Math on Mars

A personal-use math game where a marine fights slime waves and answers math questions between waves to earn upgrades.

## Language

**Between-wave quiz**:
Five required math questions answered between combat waves, regardless of grade, sharing one 30-second countdown. Accuracy and speed determine the reward's power level; questions cannot be skipped, including after the countdown reaches zero.
_Avoid_: Reactor charge calculation, per-question reward timer

**Reward power level**:
The white, green, blue, or purple quality earned from the between-wave quiz's completion time and first-attempt accuracy. Wrong initial answers lower the time-based quality, with white as the floor.
_Avoid_: Charge

**Correction round**:
The untimed retry of incorrectly answered quiz questions after the learner chooses a reward. Corrections must be answered correctly before the next combat wave starts and do not change the selected reward.
_Avoid_: Immediate scored retry

**Ammo type**:
A reusable firing effect applied to the weapon's continuous supply of projectiles. Equipped ammo effects combine on each shot.
_Avoid_: Consumable bullet supply

**Legendary Omni Ammo**:
An ammo type formed from the five distinct purple ammo types, combining all five effects while occupying one active ammo slot.
