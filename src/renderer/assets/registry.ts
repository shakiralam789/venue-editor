export interface AssetMeta {
  id: string;
  url: string;
  /** Optional human readable name shown in asset pickers. */
  name?: string;
}

export const ASSET_BASE = "/assets";

/**
 * Central registry of available 2D assets.
 *
 * Adding support for a new asset later only requires dropping the image file
 * into /public/assets and registering it here — no changes to the renderer or
 * editor core are necessary. The renderer always references assets by `assetId`.
 */
export const ASSET_REGISTRY: Record<string, AssetMeta> = {
  "chair-modern-01": { id: "chair-modern-01", url: `${ASSET_BASE}/chair-modern-01.svg`, name: "Modern Chair" },
  "table-round-01": { id: "table-round-01", url: `${ASSET_BASE}/table-round-01.svg`, name: "Round Table" },
  "table-rect-01": { id: "table-rect-01", url: `${ASSET_BASE}/table-rect-01.svg`, name: "Rectangular Table" },
  "sofa-01": { id: "sofa-01", url: `${ASSET_BASE}/sofa-01.svg`, name: "Sofa" },
  "counter-01": { id: "counter-01", url: `${ASSET_BASE}/counter-01.svg`, name: "Counter" },
  "bar-01": { id: "bar-01", url: `${ASSET_BASE}/bar-01.svg`, name: "Bar" },
  "plant-01": { id: "plant-01", url: `${ASSET_BASE}/plant-01.svg`, name: "Plant" },
  "booth-01": { id: "booth-01", url: `${ASSET_BASE}/booth-01.svg`, name: "Booth" },
  "stage-01": { id: "stage-01", url: `${ASSET_BASE}/stage-01.svg`, name: "Stage" },
  "screen-01": { id: "screen-01", url: `${ASSET_BASE}/screen-01.svg`, name: "Screen" },
  "podium-01": { id: "podium-01", url: `${ASSET_BASE}/podium-01.svg`, name: "Podium" },
  "registration-desk-01": { id: "registration-desk-01", url: `${ASSET_BASE}/registration-desk-01.svg`, name: "Registration Desk" },
  "speaker-01": { id: "speaker-01", url: `${ASSET_BASE}/speaker-01.svg`, name: "Speaker" }
};

export function getAssetMeta(assetId: string): AssetMeta | undefined {
  return ASSET_REGISTRY[assetId];
}
