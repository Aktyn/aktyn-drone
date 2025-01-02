import { type SetStateAction, useCallback, useState } from "react"

class GlobalStorage implements Storage {
  private items: Map<string, string>

  constructor() {
    this.items = new Map()
  }

  get length(): number {
    return this.items.size
  }

  clear(): void {
    this.items.clear()
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  key(index: number): string | null {
    const keys = Array.from(this.items.keys())
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const globalStore = new GlobalStorage()
const keyPrefix = "global-state-"

export function useGlobalState<ValueType extends object>(
  name: string,
  defaultValue: ValueType,
  storage: Storage = globalStore,
): [ValueType | null, (value: SetStateAction<ValueType>) => void] {
  const [state, setStateInternal] = useState<ValueType | null>(
    getItem(name, storage) ?? defaultValue,
  )

  const setState = useCallback(
    (value: SetStateAction<ValueType>) => {
      setStateInternal((prev) => {
        const newValue =
          typeof value === "function" ? value(prev as ValueType) : value
        storage.setItem(keyPrefix + name, JSON.stringify(newValue))
        return newValue
      })
    },
    [name, storage],
  )

  return [state, setState]
}

function getItem<ValueType extends object>(name: string, storage: Storage) {
  try {
    const item = storage.getItem(keyPrefix + name)
    if (item) {
      return JSON.parse(item) as ValueType
    }
  } catch (error) {
    console.error(error)
  }
  return null
}
