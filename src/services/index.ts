import { LocalAdapter } from "./local-adapter";
import type { DataService } from "./data-service";

// MVP: local-only. Switch to CloudAdapter in v0.2.
export const dataService: DataService = new LocalAdapter();
