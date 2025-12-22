# Bomb Game Specification

## Overview

"Bomb" is a real-time multiplayer trivia game where players pass a ticking time bomb by answering questions correctly. The last player standing wins.

## Roles

- **Host**: Manages the game session, settings, and controls the flow.
- **Presenter**: Displays the main game arena, timer, player status, and leaderboard on a shared screen.
- **Player**: Participates in the game using their personal device to answer questions.

## Timer Settings

The host can configure these settings before starting a game. Settings are locked during preparation and after questions are ready (use Cancel/Change Settings to modify).

1. **Fuse Duration** (10-60 seconds): How long the bomb timer lasts before exploding.
2. **Reset on Pass** (toggle):
   - **Enabled**: Timer resets to the fuse duration when the bomb is passed.
   - **Disabled**: Timer continues counting down (hot potato style).

## Question Settings

The host can also configure question generation:

1. **Difficulty** (1-5): Controls how hard the generated questions are.
2. **Tricky Questions** (toggle): When enabled, distractor options become more plausible (independent of difficulty).

### Fallback Questions

- If AI generation fails (or the prepared pool is exhausted), the game uses `fallbackQuestions` from the app config.

## Core Gameplay Loop

1. **Lobby**: Players join via QR code or link.
2. **Prepare**: Host selects theme, timer settings, and question settings, then prepares the game (questions are generated with progress shown).
   - Question language is configured via `hostDefaultLanguage` in the config (no in-UI language selector).
3. **Start**: Host starts the game, a short countdown plays, and the game begins.
4. **The Bomb**: A random player is assigned the bomb.
5. **Action**: The bomb holder must answer a trivia question.
   - **Correct**: The bomb is passed to another player using a fair-random rule: the next holder is chosen randomly among the alive players who have received the bomb the fewest times so far.
   - **Incorrect**: A new question is presented.
6. **Explosion**: If the fuse timer runs out, the bomb explodes, and the holder is eliminated.
7. **Win Condition**: The game continues until only one player remains.

## Late Joiners

- Players who join after a round has started do not participate until the next round.
- The presenter view only shows the round roster once the countdown/game is in progress.

## Technical Architecture

- **State Management**:
  - `globalStore`: Shared game state (players, bomb status, questions).
  - `playerStore`: Local player state (view, input).
- **AI Integration**: Questions are generated in real-time using the Kokimoki AI SDK.
- **Synchronization**: Server-side timestamp used for precise timer synchronization.

### Question Pool Storage

- The full prepared question pool is cached on the elected host controller (not synced to shared state) to avoid CRDT document size limits.
- Shared state only syncs lightweight preparation metadata (status, progress, prepared question count).

### Question Generation Tuning

- Question generation sizing/tuning is configurable via config values (e.g. average answer time, rounds per player, buffer multiplier, min/max prepared questions, and how many recent questions to avoid).

## Future Improvements

- Sound effects for bomb ticking and explosion.
- Visual effects for explosion.
- Power-ups (e.g., skip question, freeze timer).
- Team modes.
