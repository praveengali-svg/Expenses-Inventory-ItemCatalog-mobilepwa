
/**
 * Compresses an image base64 string using Canvas API
 */
export const compressImage = (base64: string, maxWidth = 1200, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = base64;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context failed"));

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to webp with low quality for maximum compression
            // Fallback to jpeg if browser doesn't support webp
            try {
                const compressed = canvas.toDataURL("image/webp", quality);
                // If webp compression didn't actually happen (rare) or returned a larger string, use jpeg
                if (compressed.length < base64.length) {
                    resolve(compressed);
                } else {
                    resolve(canvas.toDataURL("image/jpeg", quality));
                }
            } catch (e) {
                resolve(canvas.toDataURL("image/jpeg", quality));
            }
        };

        img.onerror = (err) => reject(err);
    });
};
