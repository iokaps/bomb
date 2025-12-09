# Bomb Game Specification

## Overview

"Bomb" is a real-time multiplayer trivia game where players pass a ticking time bomb by answering questions correctly. The last player standing wins.

## Roles

- **Host**: Manages the game session, settings, and controls the flow.
- **Presenter**: Displays the main game arena, timer, player status, and leaderboard on a shared screen.
- **Player**: Participates in the game using their personal device to answer questions.

## Game Modes

1. **Accelerating Fuse**: Fuse starts at 30s and gets shorter by 2s every pass (min 5s).
2. **Classic (Hot Potato)**: Global random timer (45-90s). Passing doesn't change the timer.
3. **Shot Clock**: Timer resets to 15s on every pass.
4. **Chaos Mode**: Fuse resets to a random duration (5-25s) on every pass.

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
