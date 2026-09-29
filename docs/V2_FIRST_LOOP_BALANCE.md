# First playable town loop — provisional rehearsal balance

Issue #40. These are explicit initial test values, not permanently approved economy tuning. The rehearsal will be adjustable, deterministic, in memory, and independent of cadet saves. Its exported baseline is intended for subsequent connected-town tickets.

| Parameter | Initial test value |
|---|---|
| Adults / household | 2 adults in one occupied House |
| House capacity | 2 residents; level 2 supports 4 |
| Construction slots | 2 |
| Starting stocks | 80 blocks, 20 parts, 60 trade credits, 24 edible portions |
| Edible storage capacity | 72 portions |
| Household consumption | 1 portion/adult/hour |
| Household reserve | 24 hours of meals (48 portions for two adults), bounded by available edible stock |
| Essential capacity | 10 power, 10 water, 10 oxygen |
| Resident demand | 1 water and 1 oxygen per adult |
| Greenhouse demand | 1 assigned adult, 2 power, 2 water |
| Greenhouse build | 20 blocks + 5 parts; 10 seconds |
| Starter crop | Lettuce; one-time seed unlock costs 10 trade credits |
| Growing cycle | 4 edible portions every 30 minutes; automatic replanting |
| House level-2 upgrade | 40 blocks + 10 parts; 60 minutes |
| Practice reward | 4 minutes per completed/corrected question; five-question set gives 20 minutes |

Starter habitat emergency meals supply unmet basic consumption directly, never as tradeable/processable inventory. Utility shortage pauses optional crop production; essential residents remain safe. Storage-full harvests are held outside spendable inventory until the complete batch fits. The rehearsal has no trade/processing loop; reserve availability is still visible.

Practice uses a real fixed-bank grade/topic selected from the eligible list, with no timer. Use five distinct questions when available; if a topic has fewer, use its available count and award four minutes per question. Cycle the topic deck across sets before repetition; repeated practice is allowed and labeled. Correct all mistakes before awarding the set once, retain first-attempt results, and show the amount beforehand. This is an explicit rehearsal proposal for question-count normalization, not a claim of curriculum mastery or unlimited unique questions.

A simple worked sequence: build Greenhouse leaves 60 blocks/15 parts; seed unlock leaves 50 trade credits; start House upgrade leaves 20 blocks/5 parts. A completed five-question set provides 20 minutes of credit, reducing a just-started 60-minute upgrade to 40 minutes. With continuously staffed production for one hour, two harvests add 8 portions and household meals consume 2, changing 24 portions to 30 (assuming no storage limit).

Validation scenarios: normal first session; full storage with safely held harvest/resume; worker or utility loss; stock shortage with emergency meals; correction-before-reward; replayed practice completion; rejected overspending and duplicate worker assignment. The production connected-time and 48-hour absence policy will be implemented by the later tickets; advancing this rehearsal clock is a development control.

## Run the rehearsal

Use `pnpm dev:rehearsal`, or open `/town-rehearsal.html` on the Vite server. The isolated town build includes this page. The balance laboratory offers normal/full-store/shortage presets, adjustable validated values, a visible state/action log, and JSON export. The fixed-bank practice panel preserves first attempts and corrections and labels repeated sets. This development page deliberately permits selection among all bank topics; real parent-controlled eligibility belongs to #46.

Validation: public-command tests cover construction, exact food accounting, held harvest, emergency meals, rejection without mutation, correction-before-credit, bounded acceleration and finite topic cycling. A browser check completes the first loop and inspects a narrow viewport. Node 20.19+ / 22.12+ is required by the installed Vite tooling.
