/**
 * Compresses an image file to a target size (controlled by VITE_UPLOAD_COMPRESS_SIZE_KB, default < 200KB)
 */
export async function compressImage(
  file: File,
  maxSizeMB?: number,
  maxWidthOrHeight: number = 1920
): Promise<File> {
  // Use environment variable if maxSizeMB is not provided
  const configSizeKB =
    Number(import.meta.env.VITE_UPLOAD_COMPRESS_SIZE_KB) || 150;
  const finalMaxSizeMB =
    maxSizeMB !== undefined ? maxSizeMB : configSizeKB / 1024;

  // If file is already smaller than target, return it
  if (file.size <= finalMaxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Resize if too large
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Recursive compression
        let quality = 0.9;
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Compression failed"));
                return;
              }

              if (blob.size <= finalMaxSizeMB * 1024 * 1024 || quality <= 0.1) {
                // Done
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Try lower quality
                quality -= 0.1;
                compress();
              }
            },
            "image/jpeg",
            quality
          );
        };
        compress();
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
