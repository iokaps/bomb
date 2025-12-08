---
description: 'ReactJS development standards and best practices'
applyTo: '**/*.jsx,**/*.tsx,**/*.js,**/*.ts,**/*.css,**/*.scss'
---

# React Development Instructions

Instructions for building high-quality ReactJS applications with modern patterns, hooks, and best practices following the official React documentation at <https://react.dev>.

## Architecture

- Use functional components with hooks
- Prefer component composition over inheritance
- Use custom hooks for reusable stateful logic
- Organize code by feature: `src/components/`, `src/hooks/`, `src/state/`, `src/services/`, `src/views/`

## TypeScript

- Use TypeScript interfaces for props, state, and component definitions
- Define proper types for event handlers and refs
- Use React's built-in types (`React.FC`, `React.ComponentProps`)
- Define interfaces and types in `src/types/`

## Component Design

- Follow single responsibility principle
- Use descriptive naming (PascalCase for components, camelCase for functions)
- Keep components small and focused
- Design for testability and reusability
- Add components in `src/components/`. Consider creating components when:
  - Used in multiple places
  - Contains complex logic
  - Improves readability of parent component

## State Management

- **ALWAYS** use [Kokimoki SDK](./kokimoki-sdk.instructions.md) for global (shared) and player (local) states
- Use `useState` for local component state
- Use `useContext` for sharing state across component trees

## Hooks

- Use `useEffect` with proper dependency arrays
- Implement cleanup functions in effects to prevent memory leaks
- Use `useMemo` and `useCallback` for optimization when needed
- Follow rules of hooks (only call at the top level)
- Use `useRef` for DOM elements and mutable values

## Styling

- Use Tailwind CSS utility classes
- Use [`cn()`](../../src/utils/cn.ts) utility for conditional classes and `className` props
- Ensure accessibility with ARIA attributes and semantic HTML

## Performance

- Use `React.memo` for expensive components
- Implement code splitting with `React.lazy` and `Suspense`
- Use `useMemo` and `useCallback` judiciously

## Common Patterns

- Higher-Order Components (HOCs) for cross-cutting concerns
- Custom hooks for reusable logic
- Compound components for related functionality
- Provider pattern for context-based state sharing
- Use utility functions from `src/utils/`
