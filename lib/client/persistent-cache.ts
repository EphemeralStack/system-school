'use client'

export interface PersistentCacheSnapshot<T> {
  data: T
  savedAt: number
}

interface PersistentCacheEnvelope<T>
  extends PersistentCacheSnapshot<T> {
  version: number
}

const memoryCache =
  new Map<
    string,
    PersistentCacheEnvelope<unknown>
  >()

function storageAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !==
      'undefined'
  )
}

export function readPersistentCache<T>(
  key: string,
  version: number,
  maximumAgeMs: number
): PersistentCacheSnapshot<T> | null {
  const memoryEntry =
    memoryCache.get(key) as
      | PersistentCacheEnvelope<T>
      | undefined

  if (
    memoryEntry &&
    memoryEntry.version === version &&
    Date.now() -
      memoryEntry.savedAt <=
      maximumAgeMs
  ) {
    return {
      data: memoryEntry.data,
      savedAt:
        memoryEntry.savedAt,
    }
  }

  if (!storageAvailable()) {
    return null
  }

  try {
    const raw =
      window.localStorage.getItem(
        key
      )

    if (!raw) {
      return null
    }

    const parsed =
      JSON.parse(
        raw
      ) as PersistentCacheEnvelope<T>

    const valid =
      parsed &&
      parsed.version === version &&
      Number.isFinite(
        parsed.savedAt
      ) &&
      Date.now() -
        parsed.savedAt <=
        maximumAgeMs &&
      parsed.data !== undefined

    if (!valid) {
      window.localStorage.removeItem(
        key
      )
      memoryCache.delete(key)

      return null
    }

    memoryCache.set(
      key,
      parsed as PersistentCacheEnvelope<unknown>
    )

    return {
      data: parsed.data,
      savedAt:
        parsed.savedAt,
    }
  } catch {
    window.localStorage.removeItem(
      key
    )
    memoryCache.delete(key)

    return null
  }
}

export function writePersistentCache<T>(
  key: string,
  version: number,
  data: T,
  savedAt = Date.now()
): PersistentCacheSnapshot<T> {
  const envelope:
    PersistentCacheEnvelope<T> = {
      version,
      data,
      savedAt,
    }

  memoryCache.set(
    key,
    envelope as PersistentCacheEnvelope<unknown>
  )

  if (storageAvailable()) {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(
          envelope
        )
      )
    } catch {
      // The in-memory cache remains usable when
      // storage is full or unavailable.
    }
  }

  return {
    data,
    savedAt,
  }
}

export function removePersistentCache(
  key: string
): void {
  memoryCache.delete(key)

  if (!storageAvailable()) {
    return
  }

  try {
    window.localStorage.removeItem(
      key
    )
  } catch {
    // Nothing else is required.
  }
}
