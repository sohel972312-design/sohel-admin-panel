'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ImageUpload from './ImageUpload';

// Dynamic import for RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  catcolor: string;
  catBg: string;
  metatitle: string;
  metadescription: string;
  date: string;
  readtime: string;
  bannerimage: string;
  thumbbg: string;
  author: string;
  authoravatar: string;
  tags: string[];
  content: string;
  status: 'draft' | 'published';
}

interface BlogFormProps {
  initialData?: Partial<BlogFormData>;
  blogId?: number;
}

export default function BlogForm({ initialData, blogId }: BlogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BlogFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    category: initialData?.category || '',
    catcolor: initialData?.catcolor || '#3B82F6',
    catBg: initialData?.catBg || '#EFF6FF',
    metatitle: initialData?.metatitle || '',
    metadescription: initialData?.metadescription || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    readtime: initialData?.readtime || '5 min read',
    bannerimage: initialData?.bannerimage || '',
    thumbbg: initialData?.thumbbg || '',
    author: initialData?.author || 'Sohel Malek',
    authoravatar: initialData?.authoravatar || '',
    tags: initialData?.tags || [],
    content: initialData?.content || '',
    status: initialData?.status || 'draft',
  });

  const [tagInput, setTagInput] = useState('');

  // Auto-generate slug from title
  useEffect(() => {
    if (!blogId && formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.title, blogId, formData.slug]);

  const handleChange = (field: keyof BlogFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = blogId ? `/api/blogs/${blogId}` : '/api/blogs';
    const method = blogId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/blogs');
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      alert('Error saving blog');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug *</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">URL: sohelmalek.com/blog/{formData.slug}</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
            <RichTextEditor
              value={formData.content || ''}
              onChange={(value) => handleChange('content', value)}
            />
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as 'draft' | 'published')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Banner Image */}
          <ImageUpload
            type="banner"
            label="Banner Image"
            currentImage={formData.bannerimage}
            onImageUploaded={(url) => handleChange('bannerimage', url)}
          />

          {/* Thumbnail Background Image */}
          <ImageUpload
            type="inner"
            label="Thumbnail Background Image"
            currentImage={formData.thumbbg}
            onImageUploaded={(url) => handleChange('thumbbg', url)}
          />

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Category Text Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Category Text Color</label>
            <input
              type="color"
              value={formData.catcolor}
              onChange={(e) => handleChange('catcolor', e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300"
            />
          </div>

          {/* Category Background */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Category Background</label>
            <input
              type="color"
              value={formData.catBg}
              onChange={(e) => handleChange('catBg', e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Excerpt</label>
            <textarea
              rows={3}
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Short description of the blog..."
            />
          </div>

          {/* Read Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Read Time</label>
            <input
              type="text"
              value={formData.readtime}
              onChange={(e) => handleChange('readtime', e.target.value)}
              placeholder="5 min read"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Author</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => handleChange('author', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Author Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Author Avatar URL</label>
            <input
              type="text"
              value={formData.authoravatar}
              onChange={(e) => handleChange('authoravatar', e.target.value)}
              placeholder="https://sohelmalek.com/images/avatar.jpg"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Meta Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Meta Title (SEO)</label>
            <input
              type="text"
              value={formData.metatitle}
              onChange={(e) => handleChange('metatitle', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Meta Description (SEO)</label>
            <textarea
              rows={2}
              value={formData.metadescription}
              onChange={(e) => handleChange('metadescription', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-gray-100 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-900 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : blogId ? 'Update Blog' : 'Create Blog'}
        </button>
      </div>
    </form>
  );
}