/**
 * IPC Request Batching and Deduplication
 * 
 * Batches multiple IPC calls together to reduce overhead
 * and deduplicates identical requests within a short time window.
 */

interface PendingRequest {
  channel: string;
  args: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class IpcBatchManager {
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private batchTimeout: number = 16; // ~1 frame at 60fps
  private dedupeWindow: number = 100; // 100ms deduplication window
  private requestCache: Map<string, { result: any; timestamp: number }> = new Map();

  /**
   * Batch IPC invoke calls
   */
  async invoke(channel: string, ...args: any[]): Promise<any> {
    // Create a cache key for deduplication
    const cacheKey = `${channel}:${JSON.stringify(args)}`;
    
    // Check if we have a recent identical request
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.dedupeWindow) {
      console.log(`[IpcBatch] Cache hit for ${channel}`);
      return Promise.resolve(cached.result);
    }

    return new Promise((resolve, reject) => {
      if (!this.pendingRequests.has(channel)) {
        this.pendingRequests.set(channel, []);
      }

      const requests = this.pendingRequests.get(channel)!;
      requests.push({
        channel,
        args,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Schedule batch processing
      setTimeout(() => this.processBatch(channel), this.batchTimeout);
    });
  }

  /**
   * Process a batch of requests for a channel
   */
  private async processBatch(channel: string): Promise<void> {
    const requests = this.pendingRequests.get(channel);
    if (!requests || requests.length === 0) {
      return;
    }

    // Clear pending requests
    this.pendingRequests.delete(channel);

    // Process each request
    for (const request of requests) {
      try {
        const cacheKey = `${request.channel}:${JSON.stringify(request.args)}`;
        
        // Execute the IPC call
        const result = await (window as any).syscatApi?.[this.getApiMethod(channel)]?.(...request.args) 
          ?? await (window as any).electron?.ipcRenderer?.invoke(request.channel, ...request.args);
        
        // Cache the result
        this.requestCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });

        // Clean old cache entries (older than 5 seconds)
        this.cleanCache();

        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
  }

  /**
   * Get API method name from channel
   */
  private getApiMethod(channel: string): string {
    // Convert 'graph:tenant-summary' to 'getTenantSummary'
    const parts = channel.split(':');
    if (parts.length === 2) {
      const [namespace, action] = parts;
      const methodName = action
        .split('-')
        .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
      return `${namespace.charAt(0).toUpperCase()}${namespace.slice(1)}${methodName.charAt(0).toUpperCase()}${methodName.slice(1)}`;
    }
    return channel;
  }

  /**
   * Clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const maxAge = 5000; // 5 seconds

    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.requestCache.clear();
    console.log('[IpcBatch] Cache cleared');
  }
}

// Singleton instance
export const ipcBatchManager = new IpcBatchManager();

// Helper function to use batched IPC calls
export async function batchedInvoke(channel: string, ...args: any[]): Promise<any> {
  return ipcBatchManager.invoke(channel, ...args);
}

