export interface IStorage {
  // Storage interface for fantasy baseball app
  // All data is persisted via localStorage on client-side
}

export class MemStorage implements IStorage {
  constructor() {
    // No server-side storage needed - all client-side
  }
}

export const storage = new MemStorage();
