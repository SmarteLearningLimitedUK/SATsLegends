import { useEffect, useState } from 'react';

const pendingFrames = new Map<string, Promise<string>>();
const readyFrames = new Map<string, string>();

/** Freeze an existing asset and remove only its border-connected black matte. */
export const createStaticEnemyFrame = (src: string): Promise<string> => {
  const cached = pendingFrames.get(src);
  if (cached) return cached;

  const preparation = new Promise<string>((resolve, reject) => {
    const image = new Image();
    const releaseImage = () => {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute('src');
    };

    image.onload = () => {
      const canvas = document.createElement('canvas');
      try {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context || !canvas.width || !canvas.height) throw new Error('Unable to prepare Monster Mind image');

        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = pixels;
        const visited = new Uint8Array(width * height);
        const queue = new Uint32Array(width * height);
        let readIndex = 0;
        let writeIndex = 0;

        const enqueue = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const point = y * width + x;
          if (visited[point]) return;
          visited[point] = 1;
          const index = point * 4;
          if (data[index + 3] === 0) return;
          const maximum = Math.max(data[index], data[index + 1], data[index + 2]);
          const minimum = Math.min(data[index], data[index + 1], data[index + 2]);
          if (maximum <= 42 && maximum - minimum <= 18) queue[writeIndex++] = point;
        };

        for (let x = 0; x < width; x += 1) {
          enqueue(x, 0);
          enqueue(x, height - 1);
        }
        for (let y = 0; y < height; y += 1) {
          enqueue(0, y);
          enqueue(width - 1, y);
        }

        while (readIndex < writeIndex) {
          const point = queue[readIndex++];
          data[point * 4 + 3] = 0;
          const x = point % width;
          const y = Math.floor(point / width);
          enqueue(x - 1, y);
          enqueue(x + 1, y);
          enqueue(x, y - 1);
          enqueue(x, y + 1);
        }

        context.putImageData(pixels, 0, 0);
        const frame = canvas.toDataURL('image/png');
        readyFrames.set(src, frame);
        resolve(frame);
      } catch (error) {
        reject(error);
      } finally {
        releaseImage();
        canvas.width = 0;
        canvas.height = 0;
      }
    };
    image.onerror = () => {
      releaseImage();
      reject(new Error('Failed to load Monster Mind image'));
    };
    image.src = src;
  });

  pendingFrames.set(src, preparation);
  void preparation.catch(() => {
    if (pendingFrames.get(src) === preparation) pendingFrames.delete(src);
  });
  return preparation;
};

type PreparedFrame = { source: string; frame: string | null; failed: boolean };

/** Never expose the animated source or a late frame from a previous identity. */
export const useStaticEnemyFrame = (src: string) => {
  const [prepared, setPrepared] = useState<PreparedFrame>(() => ({
    source: src,
    frame: readyFrames.get(src) ?? null,
    failed: false,
  }));

  useEffect(() => {
    let active = true;
    if (!src) return undefined;
    createStaticEnemyFrame(src).then(
      (frame) => { if (active) setPrepared({ source: src, frame, failed: false }); },
      () => { if (active) setPrepared({ source: src, frame: null, failed: true }); },
    );
    return () => { active = false; };
  }, [src]);

  const current = prepared.source === src ? prepared : null;
  return {
    frame: readyFrames.get(src) ?? current?.frame ?? null,
    failed: current?.failed ?? false,
  };
};
