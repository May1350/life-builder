import { describe, it, expect } from "vitest";
import { LocalAdapter } from "@/services/local-adapter";

/**
 * DataService v2 tests — validate that the new methods exist with correct
 * signatures on LocalAdapter. These are structural tests that don't require
 * IndexedDB (they check the prototype, not runtime DB behavior).
 *
 * Full integration tests with Dexie would need fake-indexeddb; for now we
 * verify the contract is fulfilled.
 */
describe("DataService v2 — method signatures", () => {
  const adapter = new LocalAdapter();

  it("bulkAddGoals exists and is a function", () => {
    expect(typeof adapter.bulkAddGoals).toBe("function");
  });

  it("unlinkTasksForGoals exists and is a function", () => {
    expect(typeof adapter.unlinkTasksForGoals).toBe("function");
  });

  it("getUserProfile exists and is a function", () => {
    expect(typeof adapter.getUserProfile).toBe("function");
  });

  it("saveUserProfile exists and is a function", () => {
    expect(typeof adapter.saveUserProfile).toBe("function");
  });

  it("updateUserProfile exists and is a function", () => {
    expect(typeof adapter.updateUserProfile).toBe("function");
  });

  it("getOnboardingStep exists and is a function", () => {
    expect(typeof adapter.getOnboardingStep).toBe("function");
  });

  it("setOnboardingStep exists and is a function", () => {
    expect(typeof adapter.setOnboardingStep).toBe("function");
  });

  it("unlinkTasksForGoals with empty array returns 0 immediately", async () => {
    // This should NOT hit IndexedDB at all — it's a fast-path guard
    const result = await adapter.unlinkTasksForGoals([]);
    expect(result).toBe(0);
  });
});
