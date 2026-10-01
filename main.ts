

type Extension = {
  /** Called when the extension is loaded */
  onLoad?: () => Promise<void> | void;
  /** Called when the extension is unloaded */
  onUnload?: () => Promise<void> | void;

  /** Called when script is polled */
  onPoll?: () => Promise<void> | void;
  /** Called when script is paused */
  onPause?: () => Promise<void> | void;
  /** Called when script is resumed */
  onResume?: () => Promise<void> | void;
}


export const EXTENSION_REGISTRY: Record<string, Extension> = {

};


let lastLoadTime: number | undefined;
let loadedExtensions: Map<string, Extension> = new Map();

export default async function main() {
  if (!lastLoadTime || (Date.now() - lastLoadTime) >= 500) {
    const extension = (await import("./main.ts")).EXTENSION_REGISTRY;

    // unload extensions that are no longer in the registry
    for (const [identifier, ext] of loadedExtensions)
      if (!(identifier in extension)) {
        await ext.onUnload?.();
        loadedExtensions.delete(identifier);
      }

    // load new extensions
    for (const [identifier, ext] of Object.entries(extension))
      if (!loadedExtensions.has(identifier)) {
        await ext.onLoad?.();
        loadedExtensions.set(identifier, ext);
      }

    lastLoadTime = Date.now();
  }

  for (const ext of loadedExtensions.values())
    await ext.onPoll?.();
}

export async function afterResume() {
  for (const ext of loadedExtensions.values())
    await ext.onResume?.();
}

export async function beforePause() {
  for (const ext of loadedExtensions.values())
    await ext.onPause?.();
}
