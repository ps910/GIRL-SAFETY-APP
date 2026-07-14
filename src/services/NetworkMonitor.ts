import Logger from '../utils/logger';

/**
 * NetworkMonitor — monitors network connectivity status
 * Performs active pings to ensure reliable internet detection
 */
class NetworkMonitor {
  private isOnlineState: boolean = true;
  private listeners: Set<(status: boolean) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startPolling();
  }

  public addListener(callback: (status: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnlineState);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(id);
      const prev = this.isOnlineState;
      this.isOnlineState = response.status >= 200 || response.type === 'opaque';
      
      if (prev !== this.isOnlineState) {
        this.notifyListeners();
      }
    } catch (e) {
      if (this.isOnlineState) {
        this.isOnlineState = false;
        this.notifyListeners();
      }
    }
    return this.isOnlineState;
  }

  private startPolling() {
    this.checkConnection();
    this.intervalId = setInterval(() => {
      this.checkConnection();
    }, 15000);
  }

  private notifyListeners() {
    Logger.log('[NetworkMonitor] Connectivity changed to:', this.isOnlineState ? 'ONLINE' : 'OFFLINE');
    this.listeners.forEach((listener) => {
      try {
        listener(this.isOnlineState);
      } catch (e) {
        Logger.error('[NetworkMonitor] Listener error:', e);
      }
    });
  }

  public cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export default new NetworkMonitor();
