import { useEffect, useState } from 'react';

const trimTransparentImageSource = (src: string, alphaThreshold = 0): Promise<string> => (
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) {
          resolve(src);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const { data } = imageData;

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = ((y * width) + x) * 4;
            if (data[index + 3] <= alphaThreshold) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve(src);
          return;
        }

        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        const output = document.createElement('canvas');
        output.width = cropWidth;
        output.height = cropHeight;
        const outputCtx = output.getContext('2d');
        if (!outputCtx) {
          resolve(src);
          return;
        }

        outputCtx.drawImage(image, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        resolve(output.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Failed to load image ${src}`));
    image.src = src;
  })
);

export const useTrimmedImageSource = (src: string, alphaThreshold = 0) => {
  const [trimmed, setTrimmed] = useState(src);

  useEffect(() => {
    let isActive = true;
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      setTrimmed(src);
      return () => {
        isActive = false;
      };
    }

    trimTransparentImageSource(src, alphaThreshold)
      .then((result) => {
        if (isActive) setTrimmed(result);
      })
      .catch(() => {
        if (isActive) setTrimmed(src);
      });

    return () => {
      isActive = false;
    };
  }, [alphaThreshold, src]);

  return trimmed;
};

export const useTrimmedImageSources = (sources: readonly string[], alphaThreshold = 0) => {
  const [trimmedSources, setTrimmedSources] = useState<string[]>(() => [...sources]);

  useEffect(() => {
    let isActive = true;
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      setTrimmedSources([...sources]);
      return () => {
        isActive = false;
      };
    }

    Promise.all(sources.map((src) => trimTransparentImageSource(src, alphaThreshold)))
      .then((results) => {
        if (isActive) setTrimmedSources(results);
      })
      .catch(() => {
        if (isActive) setTrimmedSources([...sources]);
      });

    return () => {
      isActive = false;
    };
  }, [alphaThreshold, sources]);

  return trimmedSources;
};
