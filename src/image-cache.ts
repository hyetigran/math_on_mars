const pending = new Map<string, Promise<HTMLImageElement>>();
const images = new Map<string, HTMLImageElement>();

/** Keep decoded artwork across scenes, instead of fetching it for every battle. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = pending.get(url);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "Artwork loading timed out. Check your connection and retry.",
          ),
        ),
      60000,
    );
    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) reject(error);
      else {
        images.set(url, image);
        resolve(image);
      }
    }
    image.onload = () => {
      void image.decode().then(
        () => finish(),
        () => finish(new Error("Could not decode game artwork. Please retry.")),
      );
    };
    image.onerror = () =>
      finish(
        new Error(
          "Could not load game artwork. Check your connection and retry.",
        ),
      );
    image.src = url;
  }).catch((error) => {
    pending.delete(url);
    throw error;
  });
  pending.set(url, promise);
  return promise;
}

export function loadedImage(url: string): HTMLImageElement {
  const image = images.get(url);
  if (!image) throw new Error("Game artwork has not finished loading.");
  return image;
}
