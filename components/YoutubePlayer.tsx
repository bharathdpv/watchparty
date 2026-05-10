'use client'

import { useEffect, useId, useRef } from 'react'
import { loadYouTubeAPI } from '@/lib/youtube'

interface Props {
  videoId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef: React.MutableRefObject<any>
  onStateChange?: (state: number) => void
  onReady?: () => void
}

export default function YoutubePlayer({ videoId, playerRef, onStateChange, onReady }: Props) {
  const uid    = useId().replace(/:/g, 'p')
  const divRef = useRef<HTMLDivElement>(null)

  // Stable refs for callbacks — callbacks change every render but must not
  // retrigger the effect (which would destroy + recreate the player).
  const onReadyCbRef      = useRef(onReady)
  const onStateChangeCbRef = useRef(onStateChange)
  useEffect(() => { onReadyCbRef.current = onReady }, [onReady])
  useEffect(() => { onStateChangeCbRef.current = onStateChange }, [onStateChange])

  // Only reinitialise when videoId changes — NOT when callbacks change.
  useEffect(() => {
    let cancelled = false

    loadYouTubeAPI(() => {
      if (cancelled || !divRef.current) return

      // Destroy previous instance if video changed
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      playerRef.current = new (window as any).YT.Player(divRef.current, {
        videoId,
        width:  '100%',
        height: '100%',
        playerVars: {
          autoplay:       0,
          controls:       0,   // we render our own controls
          disablekb:      1,
          rel:            0,
          iv_load_policy: 3,
        },
        events: {
          onReady:       ()                       => onReadyCbRef.current?.(),
          onStateChange: (e: { data: number })   => onStateChangeCbRef.current?.(e.data),
        },
      })
    })

    return () => {
      cancelled = true
      // Don't destroy here — let the next effect run handle it (avoids double-destroy)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])   // ← only videoId, callbacks handled via refs above

  // Cleanup on component unmount
  useEffect(() => () => { playerRef.current?.destroy(); playerRef.current = null }, [playerRef])

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <div ref={divRef} id={uid} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
