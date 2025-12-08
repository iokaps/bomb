---
description: 'Instruction for host starter template structure and development using Kokimoki SDK'
applyTo: '**'
---

# Instructions for @kokimoki/host-starter

## Project overview

This project is based on a host starter template using [Kokimoki SDK](./kokimoki-sdk.instructions.md). The template provides:

- Real-time communication via [globalStore](../../src/state/stores/global-store.ts)
- Presence tracking via `globalStore.connections`
- Local player state via [playerStore](../../src/state/stores/player-store.ts)

## Spec-driven development

- The specification should be defined in `spec.md` file in the root directory
- Create `spec.md` if missing before starting development
- **ALWAYS** check spec before implementation, make sure that the implementation follows the spec
- Update spec when implementation deviates or new features added
- Ask for clarifications if spec unclear

## General guidelines

- Follow React and TypeScript [best practices](./react.instructions.md)
- **ALWAYS** check [@kokimoki/shared](./kokimoki-shared.instructions.md) components before building new UI
- **CRITICAL** Do not modify `src/kit/` directory
- Keep config files (`src/config/`, `vite.config.ts`, `tsconfig*.json`) up to date
- Prefer `lucide-react` icons over custom SVGs
- Use `Media Uploads` and `AI Integration` methods from Kokimoki SDK
- Use [`useDynamicStore`](../../src/hooks/useDynamicStore.tsx) hook for isolated room-based state management following [instructions](./dynamic-stores.instructions.md)

## Imports and Exports

- **ALWAYS** use named exports: `export const Component` or `export function hook`
- **ALWAYS** use `@/` path aliases: `import { ViewComponent } from '@/views/component'`

## Modes

The template has three modes: `host`, `player`, `presenter`, provided by server and access via `kmClient.clientContext.mode`.
Based on the mode, one of the following files is used as the root component:

- Host mode: [app.host.tsx](../../src/modes/app.host.tsx)
- Player mode: [app.player.tsx](../../src/modes/app.player.tsx)
- Presenter mode: [app.presenter.tsx](../../src/modes/app.presenter.tsx)

## State management

### Player store (Local)

- [playerStore](../../src/state/stores/player-store.ts) contains device-local data
- Player state actions defined in [player-actions.ts](../../src/state/actions/player-actions.ts)

**Example: View Routing**

```tsx
// Define state
interface PlayerState {
  currentView: 'lobby' | 'game' | 'results';
}

// Navigate
await playerActions.setCurrentView('game');

// Render
const { currentView } = useSnapshot(playerStore.proxy);
return (
  <>
    {currentView === 'lobby' && <LobbyView />}
    {currentView === 'game' && <GameView />}
  </>
);
```

### Global Store (Shared)

- [globalStore](../../src/state/stores/global-store.ts) contains shared data across all players
- Global state actions defined in [global-actions.ts](../../src/state/actions/global-actions.ts)

**Example: Game Actions**

```typescript
export const globalActions = {
  async startGame() {
    await kmClient.transact([globalStore], ([state]) => {
      state.started = true;
      state.startTimestamp = kmClient.serverTimestamp();
    });
  }
};
```

**Example: Player-specific Data**

```typescript
interface GlobalStore {
  players: Record<string, { score: number }>; // key is clientId
}

await kmClient.transact([globalStore], ([globalState]) => {
  if (!globalState.players[kmClient.id]) {
    globalState.players[kmClient.id] = { score: 0 };
  }
  globalState.players[kmClient.id].score += 1;
});
```

### Combining Stores

- Update both `playerStore` and `globalStore` in a single transaction when needed
- Create combined actions in [global-actions.ts](../../src/state/actions/global-actions.ts)

## Timers

- Use [useServerTimer.ts](../../src/hooks/useServerTime.ts) for synced across all players timers

**Example: Elapsed Time Display**

```tsx
import { useServerTimer } from '@/hooks/useServerTime';
import { KmTimeCountdown } from '@kokimoki/shared';

const serverTime = useServerTimer();
const { startTimestamp } = useSnapshot(globalStore.proxy);
const elapsedMs = serverTime - startTimestamp;

return <KmTimeCountdown ms={elapsedMs} />;
```

## Generate Links (Host/Presenter)

- Use [generateLink](../../src/kit/generate-link.ts) to create join links

**Example: Generating Links**

```tsx
import { generateLink } from '@/kit/generate-link';

const playerLink = generateLink(kmClient.clientContext.playerCode, {
  mode: 'player'
});

const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
  mode: 'presenter',
  playerCode: kmClient.clientContext.playerCode
});
```

## Layouts

### Design Principles

- **Player**: Mobile-first (phones, tablets) - interactive gameplay
- **Host**: Desktop (laptops, tablets) - game control and management
- **Presenter**: Large screen (TV/projector) - read-only visualization

### Player Layout

- Use [PlayerLayout](../../src/layouts/player.tsx) compound components
- All layout components accept `className` prop for custom styling

**Example: Player Layout structure**

```tsx
import { PlayerLayout } from '@/layouts/player';

<PlayerLayout.Root>
  <PlayerLayout.Header>{/* Menu, title */}</PlayerLayout.Header>
  <PlayerLayout.Main>{/* Game content */}</PlayerLayout.Main>
  <PlayerLayout.Footer>{/* Status, controls */}</PlayerLayout.Footer>
</PlayerLayout.Root>;
```

### Host/Presenter Layout

- Use [HostPresenterLayout](../../src/layouts/host-presenter.tsx) compound components
- All layout components accept `className` prop for custom styling

**Example: Host/Presenter Layout structure**

```tsx
import { HostPresenterLayout } from '@/layouts/host-presenter';

<HostPresenterLayout.Root>
  <HostPresenterLayout.Header>
    {/* Header content */}
  </HostPresenterLayout.Header>
  <HostPresenterLayout.Main>
    {/* Game controls, links */}
  </HostPresenterLayout.Main>
</HostPresenterLayout.Root>;
```

## Styling

### Tailwind Theme Customization

- Modify `@theme` directive in [global.css](../../src/global.css) to customize Tailwind theme
- `@theme` variables automatically generate corresponding utility classes
- Use namespace prefixes to determine which utilities are created:
  - `--color-*` for colors (generates `bg-*`, `text-*`, `border-*`, etc.)
  - `--font-*` for font families
  - `--text-*` for font sizes
  - `--spacing-*` for padding, margin, and sizing
  - `--radius-*` for border radius
  - `--shadow-*` for box shadows

**Example: Adding Custom Colors**

```css
/* Inside global.css */
@theme {
  --color-mint-500: oklch(0.72 0.11 178);
  --color-brand-primary: #3b82f6;
}
```

```tsx
// Automatically available in components
<div className="bg-mint-500 text-brand-primary">{/* Content */}</div>
```

**Example: Overriding Default Values**

```css
@theme {
  --breakpoint-sm: 30rem; /* Override default sm breakpoint */
}
```

## Configuration

### Structure

- [schema.ts](../../src/config/schema.ts) - schema with defaults (`zod/v4`)
- [default.config.yaml](../../default.config.yaml) - actual values

### Guidelines

- **CRITICAL:** Add all user-facing text (buttons, labels, titles, messages) and configurable game parameters to [schema.ts](../../src/config/schema.ts) and [default.config.yaml](../../default.config.yaml)
- **NEVER** hardcode text strings in components
- **ALWAYS** update both files when making changes in config
- **ALWAYS** Run `npm run build` after modifying the `schema.ts` to generate the `YAML` schema specification
- Check existing configuration before adding new values
- Keep `schema.ts` defaults minimal - only short, valid fallback values
- **ALWAYS** use quotes for strings in `YAML` files
- Use `Md` suffix (e.g. `welcomeMessageMd`) for fields containing Markdown
- Values naming should be descriptive and consistent (e.g. `startButton`, `stopButton`, `waitingMessageMd`)
- Render markdown with `react-markdown` and `prose` tailwind class

**Example:**

```tsx
import { config } from '@/config';

// ✅ CORRECT
export const Button = () => <button>{config.startButton}</button>;

// ❌ WRONG
export const Button = () => <button>Start Game</button>;
```

## Global controller

[useGlobalController.ts](../../src/hooks/useGlobalController.ts) maintains a single controller connection for logic that should only run on one device at a time (e.g. handling global timers, assigning player roles, running physics simulations).

### Example: Time-based logic\*\*

```tsx
// Inside useGlobalController.ts
useEffect(() => {
  if (!isGlobalController) {
    return;
  }

  // Check if round time expired and start a new round
  const handleNewRound = async () => {
    await kmClient.transact([globalStore], ([state]) => {
      if (serverTime - state.roundStartTime > 30000) {
        state.currentRound += 1;
        state.roundStartTime = kmClient.serverTimestamp();
      }
    });
  };

  handleNewRound();
}, [isGlobalController, serverTime]);
```

### Example: Distributing player roles

```tsx
// Inside useGlobalController.ts
// role: "wizard", "warrior", "archer", "healer", etc.
const { assignedRoles } = useSnapshot(globalStore.proxy); // { [role]: clientId | null }
const onlinePlayerIds = useSnapshot(globalStore.connections).clientIds; // Set<string>

useEffect(() => {
  if (!isGlobalController) {
    return;
  }

  // Check current connections to ensure each role has one assigned player
  const handleRoleAssignment = async () => {
    await kmClient.transact([globalStore], ([globalState]) => {
      const unassignedPlayers = Array.from(onlinePlayerIds).filter(
        (id) => !Object.values(assignedRoles).includes(id)
      );

      const roles = Object.keys(assignedRoles);
      roles.forEach((role) => {
        const assignedPlayerId = assignedRoles[role];

        if (
          (assignedPlayerId && !onlinePlayerIds.has(assignedPlayerId)) ||
          !assignedPlayerId
        ) {
          const newPlayerId = unassignedPlayers.shift() || null;
          globalState.assignedRoles[role] = newPlayerId;
        }
      });
    });
  };

  handleRoleAssignment();
}, [isGlobalController, onlinePlayerIds]);
```

## Common Patterns

### Example: Waiting for Game Start

```tsx
const { started } = useSnapshot(globalStore.proxy);

if (!started) return <WaitingView />;

return <GameView />;
```

### Example: Player View on Start

```tsx
const { started } = useSnapshot(globalStore.proxy);

React.useEffect(() => {
  if (started) {
    playerActions.setCurrentView('game');
  }
}, [started]);
```

### Example: Player Name Entry Flow

```tsx
const { name } = useSnapshot(playerStore.proxy);

if (!name) return <CreateProfileView />;

return <GameView />;
```

### Example: Host-Specific UI

```tsx
const isHost = kmClient.clientContext.mode === 'host';

return (
  <>{isHost && <button onClick={globalActions.startGame}>Start Game</button>}</>
);
```
