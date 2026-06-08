import { Router, Request, Response } from 'express';
import { Repository } from 'typeorm';
import { SavedSearch, Product } from '../../database/models';
import { SearchManager } from '../../services/searchManager';
import { RealTimeMonitor } from '../../services/realTimeMonitor';
import { savedSearchValidationSchema, validate } from '../../utils/validators';
import { Server as SocketIOServer } from 'socket.io';

export const createSavedSearchesRouter = (
  searchRepository: Repository<SavedSearch>,
  productRepository: Repository<Product>,
  monitor: RealTimeMonitor,
  io: SocketIOServer
): Router => {
  const router = Router();
  const searchManager = new SearchManager(searchRepository, productRepository);

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { error, value } = validate(savedSearchValidationSchema, req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          errors: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        });
      }

      const search = await searchManager.createSearch(value);
      monitor.startMonitoring(search.id, search.updateFrequency);

      res.status(201).json({
        success: true,
        data: search,
      });
    } catch (error) {
      console.error('Error creating saved search:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const searches = await searchManager.getAllSearches();
      res.json({
        success: true,
        data: searches,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const search = await searchManager.getSearch(req.params.id);
      if (!search) {
        return res.status(404).json({
          success: false,
          error: 'Search not found',
        });
      }
      res.json({
        success: true,
        data: search,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/:id/products', async (req: Request, res: Response) => {
    try {
      const products = await searchManager.getSearchProducts(req.params.id);
      res.json({
        success: true,
        data: {
          searchId: req.params.id,
          totalProducts: products.length,
          products,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { error, value } = validate(savedSearchValidationSchema, req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          errors: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        });
      }

      const updated = await searchManager.updateSearch(req.params.id, value);
      monitor.stopMonitoring(req.params.id);
      monitor.startMonitoring(req.params.id, updated.updateFrequency);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      monitor.stopMonitoring(req.params.id);
      await searchManager.deleteSearch(req.params.id);
      res.json({
        success: true,
        message: 'Search deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/:id/monitoring', async (req: Request, res: Response) => {
    try {
      const { action } = req.body;
      const search = await searchManager.getSearch(req.params.id);

      if (!search) {
        return res.status(404).json({
          success: false,
          error: 'Search not found',
        });
      }

      if (action === 'start') {
        monitor.startMonitoring(req.params.id, search.updateFrequency);
      } else if (action === 'stop') {
        monitor.stopMonitoring(req.params.id);
      }

      res.json({
        success: true,
        message: `Monitoring ${action}ed for search ${req.params.id}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
};

export default createSavedSearchesRouter;
