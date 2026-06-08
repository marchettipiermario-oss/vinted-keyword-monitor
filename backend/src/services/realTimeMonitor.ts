import { Server as SocketIOServer } from 'socket.io';
import { Repository } from 'typeorm';
import { SavedSearch, Product } from '../database/models';
import { SearchManager } from './searchManager';
import { SEARCH_UPDATE_INTERVAL } from '../utils/constants';

export class RealTimeMonitor {
  private monitors: Map<string, NodeJS.Timeout> = new Map();
  private searchManager: SearchManager;

  constructor(
    private io: SocketIOServer,
    searchRepository: Repository<SavedSearch>,
    productRepository: Repository<Product>
  ) {
    this.searchManager = new SearchManager(searchRepository, productRepository);
  }

  startMonitoring(searchId: string, interval: number = SEARCH_UPDATE_INTERVAL): void {
    // Clear existing monitor if any
    if (this.monitors.has(searchId)) {
      clearInterval(this.monitors.get(searchId));
    }

    // Perform initial search
    this.runSearch(searchId);

    // Set up interval for periodic checks
    const monitor = setInterval(() => {
      this.runSearch(searchId);
    }, interval);

    this.monitors.set(searchId, monitor);
    console.log(`Started monitoring search: ${searchId} with interval: ${interval}ms`);
  }

  stopMonitoring(searchId: string): void {
    const monitor = this.monitors.get(searchId);
    if (monitor) {
      clearInterval(monitor);
      this.monitors.delete(searchId);
      console.log(`Stopped monitoring search: ${searchId}`);
    }
  }

  private async runSearch(searchId: string): Promise<void> {
    try {
      const search = await this.searchManager.getSearch(searchId);
      if (!search) {
        this.stopMonitoring(searchId);
        return;
      }

      const result = await this.searchManager.performSearch(search);

      if (result.newProducts.length > 0 && search.notificationEnabled) {
        // Emit new products to all connected clients
        this.io.emit('new_products', {
          searchId,
          products: result.newProducts,
          totalFound: result.totalProducts,
          timestamp: new Date(),
        });

        console.log(`Found ${result.newProducts.length} new products for search: ${searchId}`);
      }
    } catch (error) {
      console.error(`Error running search ${searchId}:`, error);
      this.io.emit('search_error', {
        searchId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  async startAllMonitors(searches: SavedSearch[]): Promise<void> {
    for (const search of searches) {
      this.startMonitoring(search.id, search.updateFrequency);
    }
  }

  stopAllMonitors(): void {
    for (const [searchId] of this.monitors) {
      this.stopMonitoring(searchId);
    }
  }

  getActiveMonitors(): string[] {
    return Array.from(this.monitors.keys());
  }
}
