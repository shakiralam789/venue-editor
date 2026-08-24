import { Texture } from "pixi.js";
import { ASSET_REGISTRY } from "./registry";

/**
 * Loads and caches PixiJS textures for 2D venue assets (PNG, WebP, SVG).
 *
 * Textures are cached by `assetId` and reused across every object instance, so
 * a venue with hundreds of chairs only ever decodes and uploads the chair image
 * once. Loading is asynchronous; callers should treat the returned texture as a
 * promise and render a geometric fallback until it resolves.
 */
class AssetManagerImpl {
  private readonly cache = new Map<string, Texture>();
  private readonly inflight = new Map<string, Promise<Texture>>();

  get(assetId: string): Promise<Texture> {
    const cached = this.cache.get(assetId);
    if (cached) return Promise.resolve(cached);
    const pending = this.inflight.get(assetId);
    if (pending) return pending;

    const meta = ASSET_REGISTRY[assetId];
    if (!meta) return Promise.reject(new Error(`Asset not registered: ${assetId}`));

    const promise = new Promise<Texture>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        try {
          const texture = Texture.from(img);
          this.cache.set(assetId, texture);
          resolve(texture);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };
      img.onerror = () => reject(new Error(`Failed to load asset image: ${assetId}`));
      img.src = meta.url;
    }).finally(() => {
      this.inflight.delete(assetId);
    });

    this.inflight.set(assetId, promise);
    return promise;
  }

  /** Warm the cache for a set of asset ids. Failures are swallowed. */
  preload(ids: string[]): Promise<void> {
    return Promise.all(
      ids.map((id) => this.get(id).then(
        () => undefined,
        () => undefined
      ))
    ).then(() => undefined);
  }

  has(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /** Whether the asset is registered in the registry (regardless of load state). */
  isRegistered(assetId: string): boolean {
    return Boolean(ASSET_REGISTRY[assetId]);
  }
}

export const AssetManager = new AssetManagerImpl();
