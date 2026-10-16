# Wordy feature plan

Wordy is a small, static daily word puzzle inspired by familiar five-letter guessing games. The first release should feel complete on one device, work without an account, and keep the focus on a quick daily round.

## MVP

1. **Daily puzzle** — one five-letter answer per local calendar day, selected deterministically from a curated answer list.
2. **Six guesses** — accept valid five-letter words, show row feedback, and end the round on a correct answer or the sixth guess.
3. **Keyboard input** — support physical keyboard input and an on-screen keyboard, including submit and delete.
4. **Clear feedback** — use correct-position, present-elsewhere, and absent states with text labels and accessible announcements.
5. **Persistence** — save the current board, keyboard states, and result in local storage so refreshes do not erase progress.
6. **Share result** — copy an emoji grid without revealing the answer; fall back to a selectable text result if clipboard access is unavailable.
7. **Responsive layout** — keep the board and keyboard usable on narrow phones, tablets, and desktop, with touch-sized controls and safe-area spacing.
8. **Accessible preferences** — provide light/dark theme, visible focus, reduced-motion support, and non-color cues for tile states.

## Follow-up

- Statistics: played, win rate, current streak, best streak, and guess distribution.
- Help and settings dialogs with rules, theme, and contrast options.
- Optional hard mode that requires reusing revealed hints.
- Installable offline experience with a service worker after the word list and daily schedule are settled.

## Suggested implementation sequence

1. Lock the word-list policy, daily reset timezone, and whether “valid word” means answer-list-only or a broader accepted-guess list.
2. Build the game model and input validation, including duplicate-letter scoring and completed-round behavior.
3. Add board, keyboard, result, persistence, and share interactions.
4. Refine mobile and desktop layouts, accessibility, and theme behavior.
5. Add statistics and offline install support as separate follow-ups.

## Decisions to make before production

- **Daily reset:** this prototype uses the browser's local date for a preview puzzle. Production should choose and document one reset timezone.
- **Word source:** the prototype ships a 1,000-word JSONL answer pool derived from an MIT-licensed five-letter list, plus a small fallback for local `file://` previews. Production can replace this pool with a more tightly curated answer and accepted-guess list.
- **Static hosting:** static hosting is enough for the MVP. It cannot reliably prevent players from inspecting the client-side answer list.

## Prototype scope

The accompanying `index.html` is an interactive UI example. It demonstrates board entry from physical and on-screen keyboards, duplicate-aware tile feedback, a win or loss state, spoiler-free sharing, theme choice, and responsive presentation. Each fresh round picks a random answer from `assets/words.jsonl`; the active answer, round, and theme are saved locally. Starting a random round mid-game asks before clearing guesses. Guesses accept any five-letter combination, without dictionary validation. The preview does not implement a production daily schedule, long-term statistics, or offline caching.
