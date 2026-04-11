'use client';

import { useState } from 'react';

interface ImageItem {
  id: string;
  url: string;
  filename: string;
  placeholder: string;
}

interface MultiImageUploadProps {
  onImagesChange: (images: ImageItem[]) => void;
  currentImages?: ImageItem[];
  label: string;
}

export default function MultiImageUpload({ onImagesChange, currentImages = [], label }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>(currentImages);

  const generatePlaceholder = (filename: string) => {
    const name = filename.split('.')[0];
    return `{{IMAGE:${name}}}`;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 5MB)`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'inner');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        
        if (data.success) {
          const newImage: ImageItem = {
            id: Date.now().toString() + i + Math.random().toString(36).substr(2, 5),
            url: data.url,
            filename: file.name,
            placeholder: generatePlaceholder(file.name),
          };
          
          const updatedImages = [...images, newImage];
          setImages(updatedImages);
          onImagesChange(updatedImages);
        } else {
          alert(`Failed to upload ${file.name}: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const copyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    alert('Placeholder copied! Paste it in your HTML content.');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      
      {/* Upload Button */}
      <div className="flex items-center gap-4">
        <label className={`cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 ${uploading ? 'opacity-50' : ''}`}>
          <span>{uploading ? 'Uploading...' : 'Upload Multiple Images'}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <span className="text-sm text-gray-500">You can select multiple images at once</span>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images ({images.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((image) => (
              <div key={image.id} className="border border-gray-200 rounded-lg p-2 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.filename} className="w-full h-24 object-cover rounded mb-2" />
                <p className="text-xs text-gray-600 truncate">{image.filename}</p>
                <code className="text-xs bg-gray-100 p-1 rounded block mt-1 truncate">
                  {image.placeholder}
                </code>
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => copyPlaceholder(image.placeholder)}
                    className="bg-green-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    title="Copy placeholder"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Click "Copy" to copy the placeholder, then paste it in your HTML content where you want the image to appear.
          </p>
        </div>
      )}
    </div>
  );
}