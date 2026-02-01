
/**
 * Compresses an image base64 string using Canvas API
 */
export const compressImage = (base64: string, maxWidth = 1200, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Validation check for empty or non-image strings
        if (!base64 || !base64.startsWith('data:image/')) {
            return resolve(base64);
        }

        const img = new Image();
        img.src = base64;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context failed"));

            ctx.drawImage(img, 0, 0, width, height);

            try {
                const compressed = canvas.toDataURL("image/webp", quality);
                if (compressed.length < base64.length) {
                    resolve(compressed);
                } else {
                    resolve(canvas.toDataURL("image/jpeg", quality));
                }
            } catch (e) {
                resolve(canvas.toDataURL("image/jpeg", quality));
            }
        };

        img.onerror = () => reject(new Error("Failed to load image for compression. Ensure the file is a valid image."));
    });
};
