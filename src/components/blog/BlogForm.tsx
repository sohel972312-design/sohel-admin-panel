'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ImageUpload from './ImageUpload';
import MultiImageUpload from './MultiImageUpload';
import type { ImageItem, Category } from '@/types/blog';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  category_id: number | '';
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
  images: ImageItem[];
}

interface BlogFormProps {
  initialData?: Partial<BlogFormData & { tags: string[] | string | null; images: ImageItem[] | string | null }>;
  blogId?: number;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

function parseJsonField<T>(value: T[] | string | null | undefined, fallback: T[]): T[] {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const EMPTY_FORM: BlogFormData = {
  title: '',
  slug: '',
  excerpt: '',
  category_id: '',
  catcolor: '',
  catBg: '',
  metatitle: '',
  metadescription: '',
  date: new Date().toISOString().split('T')[0],
  readtime: '5 min read',
  bannerimage: '',
  thumbbg: '',
  author: 'Sohel Malek',
  authoravatar: '',
  tags: [],
  content: '',
  status: 'draft',
  images: [],
};

function dataToForm(data: Record<string, unknown>): BlogFormData {
  return {
    title: (data.title as string) || '',
    slug: (data.slug as string) || '',
    excerpt: (data.excerpt as string) || '',
    category_id: (data.category_id as number) || '',
    catcolor: (data.catcolor as string) || '',
    catBg: (data.catBg as string) || '',
    metatitle: (data.metatitle as string) || '',
    metadescription: (data.metadescription as string) || '',
    date: (data.date as string) || new Date().toISOString().split('T')[0],
    readtime: (data.readtime as string) || '5 min read',
    bannerimage: (data.bannerimage as string) || '',
    thumbbg: (data.thumbbg as string) || '',
    author: (data.author as string) || 'Sohel Malek',
    authoravatar: (data.authoravatar as string) || '',
    tags: parseJsonField<string>(data.tags as string[] | string | null, []),
    content: (data.content as string) || '',
    status: (data.status as 'draft' | 'published') || 'draft',
    images: parseJsonField<ImageItem>(data.images as ImageItem[] | string | null, []),
  };
}

export default function BlogForm({ initialData, blogId }: BlogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(!!blogId);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<BlogFormData>(
    initialData ? dataToForm(initialData as Record<string, unknown>) : EMPTY_FORM
  );

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof BlogFormData, string>>>({});

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch categories for dropdown
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  // Fetch blog data when editing
  useEffect(() => {
    if (!blogId) return;

    setFetchLoading(true);
    setFetchError(null);

    fetch(`/api/blogs/${blogId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Error ${res.status}`);
        }
        return res.json();
      })
      .then((data: Record<string, unknown>) => {
        setFormData(dataToForm(data));
      })
      .catch((err: Error) => {
        setFetchError(err.message || 'Failed to load blog data');
      })
      .finally(() => setFetchLoading(false));
  }, [blogId]);


  const handleChange = (field: keyof BlogFormData, value: string | number | string[] | ImageItem[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleCategorySelect = (categoryId: number | '') => {
    if (categoryId === '') {
      setFormData(prev => ({ ...prev, category_id: '', catcolor: '', catBg: '' }));
      return;
    }
    const selected = categories.find(c => c.id === categoryId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        category_id: selected.id,
        catcolor: selected.catcolor,
        catBg: selected.catBg,
      }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      handleChange('tags', [...formData.tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags.filter(t => t !== tag));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BlogFormData, string>> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    // Strip HTML tags to check actual text content
    const textContent = formData.content.replace(/<[^>]*>/g, '').trim();
    if (!textContent) newErrors.content = 'Content is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      setTimeout(() => {
        document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    return Object.keys(newErrors).length === 0;
  };

  const processContentForSave = (content: string, images: ImageItem[]) => {
    let processed = content;
    images.forEach(image => {
      const imgHtml = `<img src="${image.url}" alt="${image.filename}" class="blog-image max-w-full h-auto my-4 rounded-lg" />`;
      processed = processed.replace(new RegExp(image.placeholder.replace(/[{}]/g, '\\$&'), 'g'), imgHtml);
    });
    return processed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('error', 'Please fix the errors before submitting.');
      return;
    }
    setLoading(true);

    const processedContent = processContentForSave(formData.content, formData.images);
    const selectedCategory = categories.find(c => c.id === formData.category_id);
    const submitData = {
      ...formData,
      content: processedContent,
      category: selectedCategory?.name || null,
    };

    const url = blogId ? `/api/blogs/${blogId}` : '/api/blogs';
    const method = blogId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        showToast('success', blogId ? 'Blog updated successfully!' : 'Blog created successfully!');
        setTimeout(() => {
          router.push('/blogs');
          router.refresh();
        }, 1200);
      } else {
        const error = await res.json();
        showToast('error', error.error || 'Something went wrong');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading skeleton while fetching blog for edit
  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading blog data...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg">
        <p className="font-medium">Failed to load blog</p>
        <p className="text-sm mt-1">{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm bg-red-100 px-3 py-1.5 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white font-medium transition-all max-w-sm ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column – Main Content ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Enter blog title..."
                  className={`block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => handleChange('slug', e.target.value)}
                  placeholder="my-custom-slug"
                  className={`block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm ${
                    errors.slug ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {errors.slug
                  ? <p className="text-red-500 text-xs mt-1">{errors.slug}</p>
                  : <p className="text-xs text-gray-400 mt-1">URL: sohelmalek.com/blog/{formData.slug || '...'}</p>
                }
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea
                  rows={3}
                  value={formData.excerpt}
                  onChange={e => handleChange('excerpt', e.target.value)}
                  placeholder="Short description shown in blog listing..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg border border-gray-200 p-5" data-error={errors.content ? 'true' : undefined}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <div className={errors.content ? 'ring-1 ring-red-400 rounded-lg' : ''}>
                <RichTextEditor
                  value={formData.content}
                  onChange={value => handleChange('content', value)}
                />
              </div>
              {errors.content && (
                <p className="text-red-500 text-sm mt-2 font-medium">{errors.content}</p>
              )}
            </div>
          </div>

          {/* ── Right Column – Sidebar ── */}
          <div className="space-y-5">

            {/* Publish Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Publish</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => handleChange('status', e.target.value as 'draft' | 'published')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => handleChange('date', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Read Time</label>
                <input
                  type="text"
                  value={formData.readtime}
                  onChange={e => handleChange('readtime', e.target.value)}
                  placeholder="5 min read"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Author */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Author</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={e => handleChange('author', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                <input
                  type="text"
                  // value={formData.authoravatar}
                  value="https://sohelmalek.com/images/sohel_malek.webp"
                  onChange={e => handleChange('authoravatar', e.target.value)}
                  placeholder="https://..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Images</h3>
              <ImageUpload
                type="banner"
                label="Banner Image"
                currentImage={formData.bannerimage}
                onImageUploaded={url => handleChange('bannerimage', url)}
              />
              <ImageUpload
                type="inner"
                label="Thumbnail Background"
                currentImage={formData.thumbbg}
                onImageUploaded={url => handleChange('thumbbg', url)}
              />
              <MultiImageUpload
                label="Content Images"
                currentImages={formData.images}
                onImagesChange={images => handleChange('images', images)}
              />
            </div>

            {/* Category */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Category</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Category</label>
                <select
                  value={formData.category_id}
                  onChange={e => handleCategorySelect(e.target.value === '' ? '' : Number(e.target.value))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                >
                  <option value="">— No category —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    No categories yet.{' '}
                    <a href="/categories" className="text-blue-500 underline" target="_blank" rel="noreferrer">
                      Create one
                    </a>
                  </p>
                )}
              </div>

              {/* Preview badge of selected category */}
              {formData.category_id !== '' && (() => {
                const cat = categories.find(c => c.id === formData.category_id);
                return cat ? (
                  <div>
                    <span className="text-xs text-gray-400 mr-2">Preview:</span>
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={{ color: cat.catcolor, backgroundColor: cat.catBg }}
                    >
                      {cat.name}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Tags</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Add a tag..."
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-gray-100 px-3 py-2 rounded-md hover:bg-gray-200 text-sm"
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900 font-bold leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SEO Card ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">SEO Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input
                type="text"
                value={formData.metatitle}
                onChange={e => handleChange('metatitle', e.target.value)}
                placeholder="Leave blank to use post title"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">{formData.metatitle.length} / 60 chars</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea
                rows={2}
                value={formData.metadescription}
                onChange={e => handleChange('metadescription', e.target.value)}
                placeholder="Short description for search engines..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">{formData.metadescription.length} / 160 chars</p>
            </div>
          </div>
        </div>

        {/* ── Validation summary ── */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-700">
            <p className="font-semibold mb-1">Please fix the following before saving:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Submit Buttons ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Saving...' : blogId ? 'Update Blog' : 'Create Blog'}
          </button>
        </div>
      </form>
    </>
  );
}
