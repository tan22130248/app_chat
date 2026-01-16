//Cấu hình Cloudinary
const CLOUDINARY_CONFIG = {
  cloudName: 'dlyhvdonu',
  uploadPreset: 'App_chat',
  assetFolder: 'Img_chat'
};

// Tải tệp lên Cloudinary
export const uploadToCloudinary = async (file: File, folder: string = 'Img_chat'): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.secure_url; // Trả về URL an toàn
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Tải lên nhiều tệp
export const uploadMultipleToCloudinary = async (
  files: File[],
  folder: string = 'Img_chat'
): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
};
