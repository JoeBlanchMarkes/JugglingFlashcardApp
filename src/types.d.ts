declare module 'dexie-react-hooks' {
  import { UseQueryResult } from 'dexie'
  export function useLiveQuery<T>(fn: () => Promise<T> | T, deps?: any[]): T | undefined
}
