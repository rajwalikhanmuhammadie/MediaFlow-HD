/**
 * Background Keep-Alive & Timer Service
 * Keeps the web app active in the background for scheduled downloads and queue processing.
 *
 * Features:
 * 1. Screen Wake Lock API: Prevents device and display from sleeping while tasks are active.
 * 2. Background Web Worker: Bypasses browser background timer throttling (which clamps setInterval to 1/min).
 * 3. Silent AudioContext Beacon: Signals to browser engines that media/audio execution is active.
 * 4. Visibility Change Listener: Auto-recovers wake lock and forces immediate queue re-checks on tab focus.
 */

class BackgroundKeepAliveService {
  private wakeLockSentinel: any = null;
  private worker: Worker | null = null;
  private audioCtx: AudioContext | null = null;
  private silentGainNode: GainNode | null = null;
  private silentOscillator: OscillatorNode | null = null;
  private tickCallbacks: Set<() => void> = new Set();
  private isRunning: boolean = false;
  private wakeLockSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.wakeLockSupported = 'wakeLock' in navigator;
      
      // Auto-reacquire wake lock when tab returns to visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRunning) {
          this.acquireWakeLock().catch(() => {});
        }
        // Always broadcast a tick on visibility restore to instantly run any overdue tasks
        this.broadcastTick();
      });
    }
  }

  public get isSupported(): boolean {
    return this.wakeLockSupported;
  }

  public get isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Subscribe a callback to be called every second (even in background)
   */
  public subscribeTick(callback: () => void): () => void {
    this.tickCallbacks.add(callback);
    return () => {
      this.tickCallbacks.delete(callback);
    };
  }

  private broadcastTick() {
    this.tickCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('KeepAlive tick error:', err);
      }
    });
  }

  /**
   * Request Screen Wake Lock to prevent display/OS sleep
   */
  private async acquireWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
      });
      return true;
    } catch {
      // Permission denied or not allowed (e.g. low battery mode or iframe restriction)
      return false;
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {
        // Ignore
      }
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Start unthrottled Web Worker timer
   */
  private startWorkerTimer() {
    if (this.worker) return;
    try {
      const workerBlob = new Blob([
        `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
        `
      ], { type: 'application/javascript' });

      const blobUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(blobUrl);
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.broadcastTick();
        }
      };
      this.worker.postMessage('start');
    } catch {
      // Worker failed (e.g. strict CSP), fallback to standard interval in main loop
    }
  }

  private stopWorkerTimer() {
    if (this.worker) {
      try {
        this.worker.postMessage('stop');
        this.worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
    }
  }

  /**
   * Start inaudible silent audio beacon to prevent mobile browser deep-sleep
   */
  private startSilentAudioBeacon() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Create an inaudible tone with near-zero gain
      this.silentOscillator = this.audioCtx.createOscillator();
      this.silentGainNode = this.audioCtx.createGain();
      
      this.silentOscillator.frequency.value = 440;
      this.silentGainNode.gain.value = 0.00001; // Inaudible to human ear

      this.silentOscillator.connect(this.silentGainNode);
      this.silentGainNode.connect(this.audioCtx.destination);
      this.silentOscillator.start();
    } catch {
      // AudioContext autoplay restriction or error
    }
  }

  private stopSilentAudioBeacon() {
    try {
      if (this.silentOscillator) {
        this.silentOscillator.stop();
        this.silentOscillator.disconnect();
        this.silentOscillator = null;
      }
      if (this.silentGainNode) {
        this.silentGainNode.disconnect();
        this.silentGainNode = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => {});
        this.audioCtx = null;
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Activate Background Keep-Alive state
   */
  public async activate(): Promise<boolean> {
    this.isRunning = true;
    this.startWorkerTimer();
    this.startSilentAudioBeacon();
    const wakeLockSuccess = await this.acquireWakeLock();
    return wakeLockSuccess;
  }

  /**
   * Deactivate Background Keep-Alive state
   */
  public deactivate() {
    this.isRunning = false;
    this.releaseWakeLock();
    this.stopWorkerTimer();
    this.stopSilentAudioBeacon();
  }
}

export const backgroundKeepAlive = new BackgroundKeepAliveService();
