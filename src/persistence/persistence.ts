import type { Venue } from "@/model/types";

export interface PersistenceHandler {
  load(venueId: string): Promise<Venue | null>;
  save(venue: Venue): Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createMockPersistence(): PersistenceHandler & { failNext: () => void } {
  let shouldFail = false;
  return {
    failNext() {
      shouldFail = true;
    },
    async load(venueId: string): Promise<Venue | null> {
      await delay(150);
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(`venue:${venueId}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Venue;
      } catch {
        return null;
      }
    },
    async save(venue: Venue): Promise<void> {
      await delay(450);
      if (shouldFail) {
        shouldFail = false;
        throw new Error("Simulated persistence failure");
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`venue:${venue.id}`, JSON.stringify(venue));
      }
    }
  };
}

export function createApiPersistence(baseUrl: string): PersistenceHandler {
  return {
    async load(venueId: string) {
      const res = await fetch(`${baseUrl}/venues/${venueId}`);
      if (!res.ok) return null;
      return (await res.json()) as Venue;
    },
    async save(venue: Venue) {
      const res = await fetch(`${baseUrl}/venues/${venue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(venue)
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    }
  };
}
