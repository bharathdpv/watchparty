export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection(RTC_CONFIG)
}

// captureStream is not in standard TS DOM lib
export function captureVideoStream(video: HTMLVideoElement, fps = 30): MediaStream {
  return (video as HTMLVideoElement & { captureStream(fps?: number): MediaStream }).captureStream(fps)
}

export interface PlaybackState {
  playing: boolean
  currentTime: number
  timestamp: number // Date.now() when state was captured
}

export const DRIFT_THRESHOLD = 0.5 // seconds before correcting
export const SYNC_INTERVAL = 3000  // ms between host heartbeats
