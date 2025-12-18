# Bomb Game Specification

## Overview

"Bomb" is a real-time multiplayer trivia game where players pass a ticking time bomb by answering questions correctly. The last player standing wins.

## Roles

- **Host**: Manages the game session, settings, and controls the flow.
- **Presenter**: Displays the main game arena, timer, player status, and leaderboard on a shared screen.
- **Player**: Participates in the game using their personal device to answer questions.

## Timer Settings

The host can configure two simple settings:

1. **Fuse Duration** (10-60 seconds): How long the bomb timer lasts before exploding.
2. **Reset on Pass** (toggle):
   - **Enabled**: Timer resets to the fuse duration when the bomb is passed.
   - **Disabled**: Timer continues counting down (hot potato style).

## Core Gameplay Loop

1. **Lobby**: Players join via QR code or link.
2. **Start**: Host selects theme, language, and game mode, then starts the game.
3. **The Bomb**: A random player is assigned the bomb.
4. **Action**: The bomb holder must answer a trivia question.
   - **Correct**: The bomb is passed to another random player.
   - **Incorrect**: A new question is presented.
5. **Explosion**: If the fuse timer runs out, the bomb explodes, and the holder is eliminated.
6. **Win Condition**: The game continues until only one player remains.

## Technical Architecture

- **State Management**:
  - `globalStore`: Shared game state (players, bomb status, questions).
  - `playerStore`: Local player state (view, input).
- **AI Integration**: Questions are generated in real-time using the Kokimoki AI SDK.
- **Synchronization**: Server-side timestamp used for precise timer synchronization.

## Future Improvements

- Sound effects for bomb ticking and explosion.
- Visual effects for explosion.
- Power-ups (e.g., skip question, freeze timer).
- Team modes.
