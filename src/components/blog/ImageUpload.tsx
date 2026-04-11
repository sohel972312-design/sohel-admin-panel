'use client';

import { useState } from 'react';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  type: 'banner' | 'inner';
  currentImage?: string | null;
  label: string;
}

export default function ImageUpload({ onImageUploaded, type, currentImage, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      console.log('Uploading file:', file.name, 'type:', type);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', res.status);
      
      // Check if response is OK
      if (!res.ok) {
        const text = await res.text();
        console.error('Response text:', text);
        throw new Error(`Upload failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setPreview(data.url);
        onImageUploaded(data.url);
        setError(null);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview('');
    onImageUploaded('');
    setError(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-center space-x-4">
        {preview && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}
        <label className={`cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <span>{uploading ? 'Uploading...' : preview ? 'Change Image' : 'Upload Image'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}