'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  readPersistentCache,
  writePersistentCache,
  type PersistentCacheSnapshot,
} from '@/lib/client/persistent-cache'

interface UsePersistentSectionDataOptions<T> {
  cacheKey: string
  version: number
  loader: () => Promise<T>
  scope?: string
  staleTimeMs?: number
  maximumAgeMs?: number
  refreshEvents?: string[]
}

interface PersistentSectionState<T> {
  data: T | null
  savedAt: number | null
  loading: boolean
  refreshing: boolean
  error: string
  refresh: (
    force?: boolean
  ) => Promise<void>
}

interface SectionUpdatedDetail<T> {
  key: string
  snapshot:
    PersistentCacheSnapshot<T>
}

const DEFAULT_STALE_TIME_MS =
  5 * 60 * 1000

const DEFAULT_MAXIMUM_AGE_MS =
  7 * 24 * 60 * 60 * 1000

const SECTION_UPDATED_EVENT =
  'school-suite:persistent-section-updated'

const memorySnapshots =
  new Map<
    string,
    PersistentCacheSnapshot<unknown>
  >()

const activeRequests =
  new Map<
    string,
    Promise<
      PersistentCacheSnapshot<unknown>
    >
  >()

function projectNamespace(): string {
  const projectId =
    process.env
      .NEXT_PUBLIC_APPWRITE_PROJECT_ID
      ?.trim() ||
    'project'

  const databaseId =
    process.env
      .NEXT_PUBLIC_APPWRITE_DATABASE_ID
      ?.trim() ||
    'database'

  return [
    'school-suite',
    projectId,
    databaseId,
  ].join(':')
}

function fullCacheKey(
  cacheKey: string,
  scope: string,
  version: number
): string {
  return [
    projectNamespace(),
    scope || 'single-school',
    cacheKey,
    `v${version}`,
  ].join(':')
}

function readSnapshot<T>(
  key: string,
  version: number,
  maximumAgeMs: number
): PersistentCacheSnapshot<T> | null {
  const memory =
    memorySnapshots.get(
      key
    ) as
      | PersistentCacheSnapshot<T>
      | undefined

  if (
    memory &&
    Date.now() -
      memory.savedAt <=
      maximumAgeMs
  ) {
    return memory
  }

  const stored =
    readPersistentCache<T>(
      key,
      version,
      maximumAgeMs
    )

  if (stored) {
    memorySnapshots.set(
      key,
      stored as PersistentCacheSnapshot<unknown>
    )
  }

  return stored
}

function errorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : 'The latest data could not be loaded.'
}

export function usePersistentSectionData<T>({
  cacheKey,
  version,
  loader,
  scope = 'single-school',
  staleTimeMs =
    DEFAULT_STALE_TIME_MS,
  maximumAgeMs =
    DEFAULT_MAXIMUM_AGE_MS,
  refreshEvents = [],
}: UsePersistentSectionDataOptions<T>):
  PersistentSectionState<T> {
  const key =
    useMemo(
      () =>
        fullCacheKey(
          cacheKey,
          scope,
          version
        ),
      [
        cacheKey,
        scope,
        version,
      ]
    )

  const eventsKey =
    refreshEvents.join(
      '\u0000'
    )

  const loaderRef =
    useRef(loader)

  loaderRef.current =
    loader

  const initialSnapshot =
    memorySnapshots.get(
      key
    ) as
      | PersistentCacheSnapshot<T>
      | undefined

  const [
    data,
    setData,
  ] =
    useState<T | null>(
      initialSnapshot?.data ||
        null
    )

  const [
    savedAt,
    setSavedAt,
  ] =
    useState<
      number | null
    >(
      initialSnapshot?.savedAt ||
        null
    )

  const [
    loading,
    setLoading,
  ] =
    useState(
      !initialSnapshot
    )

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const refresh =
    useCallback(
      async (
        force = false
      ): Promise<void> => {
        const cached =
          readSnapshot<T>(
            key,
            version,
            maximumAgeMs
          )

        const cacheIsFresh =
          cached &&
          Date.now() -
            cached.savedAt <=
            staleTimeMs

        if (
          !force &&
          cacheIsFresh
        ) {
          setData(
            cached.data
          )
          setSavedAt(
            cached.savedAt
          )
          setLoading(false)

          return
        }

        if (cached) {
          setData(
            cached.data
          )
          setSavedAt(
            cached.savedAt
          )
          setLoading(false)
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError('')

        try {
          let request =
            activeRequests.get(
              key
            ) as
              | Promise<
                  PersistentCacheSnapshot<T>
                >
              | undefined

          if (!request) {
            request =
              loaderRef
                .current()
                .then(
                  (
                    nextData
                  ) => {
                    if (
                      nextData ===
                        null ||
                      nextData ===
                        undefined
                    ) {
                      throw new Error(
                        'The data loader returned no snapshot.'
                      )
                    }

                    const snapshot =
                      writePersistentCache(
                        key,
                        version,
                        nextData
                      )

                    memorySnapshots.set(
                      key,
                      snapshot as PersistentCacheSnapshot<unknown>
                    )

                    if (
                      typeof window !==
                      'undefined'
                    ) {
                      window.dispatchEvent(
                        new CustomEvent<
                          SectionUpdatedDetail<T>
                        >(
                          SECTION_UPDATED_EVENT,
                          {
                            detail: {
                              key,
                              snapshot,
                            },
                          }
                        )
                      )
                    }

                    return snapshot
                  }
                )
                .finally(
                  () => {
                    activeRequests.delete(
                      key
                    )
                  }
                )

            activeRequests.set(
              key,
              request as Promise<PersistentCacheSnapshot<unknown>>
            )
          }

          const snapshot =
            await request

          setData(
            snapshot.data
          )
          setSavedAt(
            snapshot.savedAt
          )
        } catch (
          caughtError
        ) {
          console.error(
            `Could not refresh ${cacheKey}:`,
            caughtError
          )

          setError(
            errorMessage(
              caughtError
            )
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [
        cacheKey,
        key,
        maximumAgeMs,
        staleTimeMs,
        version,
      ]
    )

  useEffect(() => {
    const cached =
      readSnapshot<T>(
        key,
        version,
        maximumAgeMs
      )

    if (cached) {
      setData(
        cached.data
      )
      setSavedAt(
        cached.savedAt
      )
      setLoading(false)
    }

    void refresh(false)

    const handleUpdated =
      (
        event: Event
      ) => {
        const detail =
          (
            event as CustomEvent<
              SectionUpdatedDetail<T>
            >
          ).detail

        if (
          !detail ||
          detail.key !== key
        ) {
          return
        }

        setData(
          detail.snapshot.data
        )
        setSavedAt(
          detail.snapshot.savedAt
        )
        setLoading(false)
        setRefreshing(false)
        setError('')
      }

    const handleOnline =
      () => {
        void refresh(false)
      }

    const handleFocus =
      () => {
        void refresh(false)
      }

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void refresh(false)
        }
      }

    const requestedEvents =
      eventsKey
        ? eventsKey.split(
            '\u0000'
          )
        : []

    const handleRequested =
      () => {
        void refresh(true)
      }

    window.addEventListener(
      SECTION_UPDATED_EVENT,
      handleUpdated
    )

    window.addEventListener(
      'online',
      handleOnline
    )

    window.addEventListener(
      'focus',
      handleFocus
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    )

    requestedEvents.forEach(
      (eventName) =>
        window.addEventListener(
          eventName,
          handleRequested
        )
    )

    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void refresh(false)
          }
        },
        staleTimeMs
      )

    return () => {
      window.removeEventListener(
        SECTION_UPDATED_EVENT,
        handleUpdated
      )

      window.removeEventListener(
        'online',
        handleOnline
      )

      window.removeEventListener(
        'focus',
        handleFocus
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      )

      requestedEvents.forEach(
        (eventName) =>
          window.removeEventListener(
            eventName,
            handleRequested
          )
      )

      window.clearInterval(
        interval
      )
    }
  }, [
    eventsKey,
    key,
    maximumAgeMs,
    refresh,
    staleTimeMs,
    version,
  ])

  return {
    data,
    savedAt,
    loading,
    refreshing,
    error,
    refresh,
  }
}
