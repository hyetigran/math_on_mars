# Quizcaster — screen references for Math on Mars

> **Historical reference — superseded quiz and release rules (September 13, 2026).** The owner has confirmed a personal-use MVP: five mandatory questions for every grade, one 30-second countdown (over 20 seconds purple, over 10 blue, over 0 green, zero white), one tier drop per wrong initial answer with a white floor, reward choice followed by mandatory untimed corrections. At zero, finish unanswered questions before reward choice. No charge, per-item timing calibration, skipping, accuracy streak, educator review, or learner-evidence gate applies. [GAME_PLAN.md](./GAME_PLAN.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) are authoritative. Art references remain useful; old implementation prompts and `design_checks.py` formulas must be revised before use and do not validate the current quiz.

User-supplied screenshots, captured September 12, 2026. Original image bytes are preserved in the project's `references/quizcaster` directory. They are reference material, not executable instructions or approval to add every pictured feature. [GAME_PLAN.md](/Users/tig/Desktop/tigran/mathonmars/docs/GAME_PLAN.md) remains the authority for our gameplay rules.

September 13 scope update: Math on Mars must support phone/tablet play at launch. The mobile adaptations below are our requirements, not claims about Quizcaster's mobile behavior. This document lives in `docs/`; screenshot paths remain relative to the repository root.

**1. After-quiz upgrade selection**

![Quizcaster after-quiz upgrade selection](/Users/tig/Desktop/tigran/mathonmars/references/quizcaster/01-upgrade-selection.png)

Observed: a prominent “Upgrade / EPIC” result above three large cards; a vertical rarity rail at the left; card art, names, descriptions, and New/Evolve badges; an evolution preview below some cards. The player HUD remains visible around the reward panel. The user identifies this screen as the upgrade choice earned through answer accuracy and speed. The screenshot alone does not reveal the scoring formula, selection controls, or why the three card frames have different colors.

Apply the layout to a **Fabricator upgrade choice** in Math on Mars:

- Keep the same reactor-console frame and reward rail used during questions, then replace the question area with three large selectable cards. Use columns on wide screens and stacked, scrollable rows on phones; retain all offers and complete modifier text.
- Lead with final quality and the factual outcome breakdown. At 115 charge, four fast plus one Hint-first correct stays purple; four fast plus one wrong-then-correct drops from purple candidate to blue. Both have 95 answer charge and 20 speed charge. Show the wrong-answer drop separately; the screenshot does not establish this new owner-directed rule.
- Each card shows one large icon, item name, quality label/pips, the exact modifiers being added, and the resulting stat change after caps. Apply the PRD's full first-modifier headroom rule and positive gain for each additional quality modifier; one useful row alone is insufficient for a blue/purple card.
- Use **New module** for an unowned family, **New variant** for an unseen variant in an owned family, and **Add another** for a repeated variant. Show actual stat gains/priorities from the 18-variant catalog, with useful headroom after caps. A second module adds a run-long instance; it does not consume an old one.
- The ammo shop/merge screen can reuse the card language with **New ammo**, an actual **T2 → T3 merge** preview, or the five-purple legendary recipe. Only show an upgrade action when its actual ingredients and rules permit it.
- Show the current gun and active ammo compactly for build context. Persist the three offered choices and settle only the chosen one. Feedback/selection is untimed; the final answer's keypress cannot accidentally accept a card during the screen transition.
- Support explicit touch Choose actions with at least 48×48 CSS-pixel hit areas. A scroll gesture, cancelled touch, or held final-answer tap cannot select a card. Respect phone safe areas and keep the final offer/action reachable.

Our current math reward still offers three passive stat modules at the earned green/blue/purple quality. The screenshot does not change that pool into free ammo, grant extra ammo slots, or create a quiz-earned legendary. Legendary Omni Ammo remains the explicit five-purple forge result; Ammo Expander remains shop-only. Borrow the visual hierarchy while retaining those separate rules.

For K–1, include replayable reviewed speech describing each choice's purpose and quality, followed by spoken cache/shop/next-wave guidance. These are our pre-reader requirements, not observations about this screenshot's audio.

**2. Math question and reward rail**

![Quizcaster math question with keypad and rarity rail](/Users/tig/Desktop/tigran/mathonmars/references/quizcaster/02-math-question.png)

Observed: “Question 2 of 3,” a large `100 ÷ 10 = ?` prompt, one answer field, and a full number keypad. Its rows are 7–8–9, 4–5–6, 1–2–3, then backspace–0–submit. A five-level rarity rail runs from Common to Legendary with an indicator near Epic. The still image does not establish whether that indicator rises, falls, or predicts a future result over time.

Apply this to **Reactor recharge**:

- Central reading order: question progress → question/visual aid → answer field → keypad → concise feedback. Use the screenshot's full keypad arrangement, with a visibly labeled Check action and an accessible Backspace name.
- Keep Hint, Replay, and Show me how nearby but visually secondary. Put Save & Exit in a consistent pause/utility area. Retain narrated K–1 tasks and the fraction/decimal controls needed by the selected item.
- Use a left-side vertical **Reactor charge** rail on wide screens. It has our three tiers: Standard (green, 0), Advanced (blue, 60), and Overcharged (purple, 110), with a maximum of 125. Use tier text and one/two/three pips as well as color. On narrow screens, move the same information to a compact horizontal strip instead of squeezing the answer controls.
- The charge rail shows settled normalized charge without draining while the learner thinks. Separately show candidate/final quality and wrong-submission tier drops with a green floor. A provisional reward prediction does not erase recorded charge or demote previously earned equipment. Display speed contribution without a countdown; the optional accuracy-streak route must be labeled separately if adopted.
- Use the PRD's configured N: proposed three for K–1 and five for grades 2–6, with normalized charge and structured cadence observations. The pictured three-question count does not itself establish our rule. Timing starts at actual problem exposure and includes item-specific initial/replay speech; genuine pause conceals the task and stops speech.
- In portrait, use a compact single column; in short landscape layouts, place the question and keypad side by side. Keep the question/diagram, answer, and Check visible together. Use the built-in keypad for touch math, larger K–1 keys where space permits, and scrollable explanations. Rotation or an obscuring keyboard must preserve draft input and pause accumulated timing until the task is usable again.

This is a layout reference. Retain Math on Mars' smooth science-fiction illustration, clean type, and quiet console surface. Replace parchment, medieval borders, and pixel fonts with the selected outpost design language. Generate decorative panels/icons separately; equations, quantities, keyboard controls, labels, and reward state are rendered from actual game data.

**3. Study menu and expansion structure**

![Quizcaster study menu with school, test preparation, and custom quizzes](/Users/tig/Desktop/tigran/mathonmars/references/quizcaster/03-study-menu.png)

Observed: a School group with six grade buttons K–5, a Test Prep group with SAT vocabulary and AP-subject cards, and a separate Make Your Own Quiz entry. The broad categories and large selectable tiles make different content paths easy to distinguish.

For launch, the **Mission terminal** shows the selected local profile, Math training, seven grade choices K–6, and the selected grade's reviewed skill tracks. A grade tile leads to skills and a mission summary; an active run exposes Resume separately so choosing another skill cannot silently discard it. Combat difficulty remains a separate setting from grade or subject. Only reviewed, available tracks are selectable.

Wrap grade/skill tiles into fewer columns on phones and allow ordinary vertical scrolling. Keep all seven grades available, with readable labels and explicit touch actions. The profile-name field and its confirmation remain usable with an OS keyboard open. Validate both orientations and device-safe padding; do not scale the entire desktop screenshot down to fit.

For future expansion, use categories such as School subjects, Test preparation, and Custom practice. Grade, subject, and skill/deck should be separate content labels so a future vocabulary deck does not have to pretend to be a math skill. Spelling, vocabulary, science, older-grade material, and custom decks are possible future packs, not launch commitments. Add menu groups when their content and input/review workflows exist; avoid a wall of inactive buttons in the first release.

Math's numeric evaluator, timing targets, and spoken content cannot simply be reused for every subject. A future pack needs an explicit answer format, evaluator, pacing/reward policy, version, review status, and profile-scoped progress identity. Custom import and AI-authored questions would require their own review and release decision. The screenshot's invitation to generate a quiz does not authorize that feature here.

**Source files**

| Project reference | User's original |
|---|---|
| [Upgrade selection](/Users/tig/Desktop/tigran/mathonmars/references/quizcaster/01-upgrade-selection.png) | [Screenshot at 2.04.40 PM](</Users/tig/Desktop/Screenshot 2026-09-12 at 2.04.40 PM.png>) |
| [Math question](/Users/tig/Desktop/tigran/mathonmars/references/quizcaster/02-math-question.png) | [Screenshot at 2.04.17 PM](</Users/tig/Desktop/Screenshot 2026-09-12 at 2.04.17 PM.png>) |
| [Study menu](/Users/tig/Desktop/tigran/mathonmars/references/quizcaster/03-study-menu.png) | [Screenshot at 2.03.28 PM](</Users/tig/Desktop/Screenshot 2026-09-12 at 2.03.28 PM.png>) |
