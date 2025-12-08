---
description: 'Instructions for using useDynamicStore hook for room-based state management'
applyTo: '**/*.tsx,**/*.ts'
---

# Dynamic Stores

The `useDynamicStore` hook enables creation of isolated, room-based state management using Kokimoki stores. This is useful for scenarios where subsets of players need to share state without affecting the global store.

## When to Use Dynamic Stores

**Use for:**

- **Room-based isolation**: Chat rooms, team spaces, breakout rooms
- **Player grouping**: Teams, squads, parties that share private state
- **Multi-instance features**: Multiple parallel games or activities
- **Scoped collaboration**: Players working together on specific tasks

**Do NOT use for:**

- Global game state (use `globalStore` instead)
- Player-specific data (use `playerStore` instead)
- Single shared space for all players

### General Best Practices

- **Unique room names**: Use descriptive prefixes (e.g., `"chat-room-"`, `"team-"`)
- **Key remounting**: Use `key={roomCode}` to force remount when switching rooms
- **Check isConnected**: Wait for connection before showing/updating content
- **Defensive state checks**: Always verify properties exist before accessing (e.g., `!myRoomState.players` before using)
- **UseEffect guards**: Check for undefined/null in useEffect conditions that depend on dynamic store state
- **Cleanup on leave**: Remove player-specific data when leaving a room
- **Use actions**: Never inline `kmClient.transact` calls in components
- **Use Records, not Arrays**: Store collections as `Record<string, T>` with timestamp keys for automatic sorting and better sync performance
- **Atomic transactions**: Combine related state updates in single transaction when possible
- **View state management**: When using dynamic stores for navigation/pairing, ensure parent components don't force view changes that conflict with store-driven navigation

## General guidelines

- **ALWAYS** organize dynamic stores in `src/state/*-store.ts` files
- **ALWAYS** export state interface and initial state creator function
- **ALWAYS** define actions in `src/state/actions/*-actions.ts` files
- **ALWAYS** pass store instance to action functions
- **ALWAYS** use `useSnapshot` to get reactive state updates
- **ALWAYS** use `kmClient.transact` for state updates (within actions)
- Use `isConnected` before displaying or modifying state
- Use `kmClient.serverTimestamp().toString()` as keys for ordered collections
- Consider using `kmClient.id` as keys for player-specific data in rooms

## Basic Usage

```tsx
import { useDynamicStore } from '@/hooks/useDynamicStore';

interface RoomState {
  messages: Record<string, string>; // key: timestamp, value: message
  count: number;
}

const initialState: RoomState = {
  messages: {},
  count: 0
};

const MyComponent = ({ roomCode }: { roomCode: string }) => {
  const { store, isConnected } = useDynamicStore<RoomState>(
    `my-room-${roomCode}`,
    initialState
  );

  const roomState = useSnapshot(store.proxy);

  // Update state
  const addMessage = async (message: string) => {
    await kmClient.transact([store], ([state]) => {
      const timestamp = kmClient.serverTimestamp().toString();
      state.messages[timestamp] = message;
    });
  };

  if (!isConnected) {
    return <div>Connecting...</div>;
  }

  return <div>Messages: {Object.keys(roomState.messages).length}</div>;
};

// Use key to remount component on `roomCode` change
<MyComponent key={roomCode} roomCode={roomCode} />;
```

## Hook API

### Parameters

- **roomName**: `string` - Unique identifier for the store (e.g., `"chat-room-abc123"`)
- **initialState**: `T` - Default state structure with initial values

### Return Values

- **store**: `KokimokiStore<T>` - The Kokimoki store instance
- **isConnected**: `boolean` - Whether successfully joined the store
- **isConnecting**: `boolean` - Whether currently joining the store

## Common Patterns

### Example: Team-based State

Players can be grouped into teams with private team state:

```tsx
interface TeamState {
  teamName: string;
  players: Record<string, { name: string; role: string }>;
  score: number;
  strategy: string;
}

const TeamView = ({ teamId }: { teamId: string }) => {
  const { name } = useSnapshot(playerStore.proxy);
  const { store: teamStore, isConnected } = useDynamicStore<TeamState>(
    `team-${teamId}`,
    {
      teamName: `Team ${teamId}`,
      players: {},
      score: 0,
      strategy: ''
    }
  );

  const teamState = useSnapshot(teamStore.proxy);

  // Join team
  React.useEffect(() => {
    if (isConnected) {
      kmClient.transact([teamStore], ([state]) => {
        state.players[kmClient.id] = { name, role: 'member' };
      });
    }
  }, [isConnected]);

  // Update team strategy
  const updateStrategy = async (strategy: string) => {
    await kmClient.transact([teamStore], ([state]) => {
      state.strategy = strategy;
    });
  };

  return (
    <div>
      <h2>{teamState.teamName}</h2>
      <p>Score: {teamState.score}</p>
      <p>Players: {Object.keys(teamState.players).length}</p>
    </div>
  );
};
```

### Example: Chat Rooms

Multiple independent chat rooms:

```tsx
interface ChatMessage {
  clientId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface ChatState {
  messages: Record<string, ChatMessage>; // key: timestamp as string
}

const ChatRoom = ({ roomCode }: { roomCode: string }) => {
  const { store, isConnected } = useDynamicStore<ChatState>(
    `chat-${roomCode}`,
    { messages: {} }
  );

  const { messages } = useSnapshot(store.proxy);

  const sendMessage = async (playerName: string, text: string) => {
    await kmClient.transact([store], ([state]) => {
      const timestamp = kmClient.serverTimestamp();
      state.messages[timestamp.toString()] = {
        clientId: kmClient.id,
        playerName,
        text,
        timestamp
      };
    });
  };

  // Get sorted messages
  const sortedMessages = Object.entries(messages)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, msg]) => msg);

  return <div>{sortedMessages.length} messages</div>;
};
```

### Example: Breakout Rooms

Small group discussions or activities:

```tsx
interface BreakoutRoomState {
  topic: string;
  participants: Record<string, { joinedAt: number }>; // key: clientId
  responses: Record<string, string>; // key: clientId
  completed: boolean;
}

const BreakoutRoom = ({ roomId }: { roomId: string }) => {
  const { store, isConnected } = useDynamicStore<BreakoutRoomState>(
    `breakout-${roomId}`,
    {
      topic: '',
      participants: {},
      responses: {},
      completed: false
    }
  );

  const roomState = useSnapshot(store.proxy);

  // Join room
  React.useEffect(() => {
    if (isConnected) {
      kmClient.transact([store], ([state]) => {
        if (!state.participants[kmClient.id]) {
          state.participants[kmClient.id] = {
            joinedAt: kmClient.serverTimestamp()
          };
        }
      });
    }
  }, [isConnected]);

  const submitResponse = async (response: string) => {
    await kmClient.transact([store], ([state]) => {
      state.responses[kmClient.id] = response;
    });
  };

  return (
    <div>
      <h3>{roomState.topic}</h3>
      <p>Participants: {Object.keys(roomState.participants).length}</p>
    </div>
  );
};
```

## Key Behaviors

### Store Lifecycle

- Stores are **created on first use** and **cached** globally
- Multiple components using the same `roomName` share the same store instance
- Reference counting ensures cleanup only when all components unmount

### State Synchronization

- State syncs in real-time across all clients joined to the same room
- Use transactions to update state atomically
- **CRITICAL**: Always check if state properties exist before accessing them (e.g., `if (state.players)` before `state.players.length`)
- Initial state may be `undefined` during connection/sync - add defensive checks in useEffect dependencies

### Connection Management

- Component automatically joins the store on mount
- Component automatically leaves the store on unmount
- `isConnected` indicates successful join
- `isConnecting` indicates join in progress
- **Store state may not be fully initialized immediately after `isConnected` becomes true**

## Best Practices

### File Organization

**ALWAYS** organize dynamic store code using the standard store/actions pattern:

**State definition** (`src/state/chat-store.ts`):

```typescript
// Export message interface
export interface ChatMessage {
  clientId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// Export state interface
export interface ChatState {
  messages: Record<string, ChatMessage>; // key: timestamp as string
}

// Export function to generate initial state
export function createChatState(): ChatState {
  return {
    messages: {}
  };
}
```

**Actions** (`src/state/actions/chat-actions.ts`):

```typescript
import type { KokimokiStore } from '@kokimoki/app';
import { kmClient } from '@/services/km-client';
import type { ChatState, ChatMessage } from '../chat-store';

export const chatActions = {
  async sendMessage(
    store: KokimokiStore<ChatState>,
    playerName: string,
    message: string
  ) {
    await kmClient.transact([store], ([state]) => {
      const timestamp = kmClient.serverTimestamp();
      const newMessage: ChatMessage = {
        clientId: kmClient.id,
        playerName,
        message,
        timestamp
      };
      state.messages[timestamp.toString()] = newMessage;
    });
  }
};
```

**Usage in component** (`src/views/chat-view.tsx`):

```tsx
import { useDynamicStore } from '@/hooks/useDynamicStore';
import { createChatState, type ChatState } from '@/state/chat-store';
import { chatActions } from '@/state/actions/chat-actions';

const ChatRoom = ({ roomCode }: { roomCode: string }) => {
  const { store, isConnected } = useDynamicStore<ChatState>(
    `chat-${roomCode}`,
    createChatState()
  );

  const { messages } = useSnapshot(store.proxy);

  // Get sorted messages
  const sortedMessages = Object.entries(messages)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, msg]) => msg);

  const handleSend = async (message: string) => {
    await chatActions.sendMessage(store, playerName, message);
  };

  return <div>{sortedMessages.length} messages</div>;
};
```
