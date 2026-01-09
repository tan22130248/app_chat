import React, { useState, useRef, useEffect } from 'react';
import { Image, Loader } from 'lucide-react';
import { uploadToCloudinary } from '../api/cloudinaryService';
import '../styles/imageUploader.css';

interface ImageUploaderProps {
  onImageSelect: (imageUrl: string) => void;
  disabled?: boolean;
  /** Nếu giá trị là true, thành phần sẽ mở trình chọn tập tin khi thuộc tính này trở thành true */
  open?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, disabled = false, open = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Kiểm tra tính hợp lệ của loại tệp
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh');
      return;
    }

    // Kiểm tra kích thước tệp (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadToCloudinary(file, 'Img_chat');
      onImageSelect(imageUrl);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Tải ảnh lên thất bại. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  // Nếu biến cha đặt `open` thành true, hãy kích hoạt thao tác nhấp chuột vào ô nhập tệp.
  useEffect(() => {
    if (open && !disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [open, disabled, isUploading]);

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="image-input-hidden"
        disabled={disabled || isUploading}
      />
      <button
        onClick={handleClick}
        className="image-upload-btn"
        disabled={disabled || isUploading}
        title="Tải ảnh lên"
      >
        {isUploading ? (
          <Loader size={18} className="spinner" />
        ) : (
          <Image size={18} />
        )}
      </button>
      {error && <div className="image-error">{error}</div>}
    </div>
  );
};

export default ImageUploader;
