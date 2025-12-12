import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./routes/admin";
import projectionsRoutes from "./routes/v1/projections";
import healthRoutes from "./routes/v1/health";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Register API v1 routes
  app.use('/api/v1/projections', projectionsRoutes);
  app.use('/api/v1/health', healthRoutes);

  // Register admin routes (development only - returns 404 in production)
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
