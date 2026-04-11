'use client';

import { useState, useEffect } from 'react';
import type { Category } from '@/types/blog';

interface FormState {
  name: string;
  catcolor: string;
  catBg: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  catcolor: '#3B82F6',
  catBg: '#EFF6FF',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, catcolor: cat.catcolor, catBg: cat.catBg });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Save failed');
      }

      await fetchCategories();
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"? Blogs using this category will lose their category.`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCategories();
      }
    } catch {
      setError('Failed to delete category');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Manage blog post categories</p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Add Category
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Name */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Technology"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.catcolor}
                  onChange={e => setForm(prev => ({ ...prev, catcolor: e.target.value }))}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <span className="text-sm font-mono text-gray-500">{form.catcolor}</span>
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.catBg}
                  onChange={e => setForm(prev => ({ ...prev, catBg: e.target.value }))}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <span className="text-sm font-mono text-gray-500">{form.catBg}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {form.name && (
            <div className="mt-4">
              <span className="text-xs text-gray-500 mr-2">Preview:</span>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                style={{ color: form.catcolor, backgroundColor: form.catBg }}
              >
                {form.name}
              </span>
            </div>
          )}

          {formError && (
            <p className="mt-3 text-sm text-red-600">{formError}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              onClick={closeForm}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
          <button onClick={fetchCategories} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
          <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
          <p className="text-base">No categories yet.</p>
          <p className="text-sm mt-1">Click &quot;Add Category&quot; to create your first one.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">{cat.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={{ color: cat.catcolor, backgroundColor: cat.catBg }}
                    >
                      {cat.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-gray-200 inline-block"
                          style={{ backgroundColor: cat.catcolor }}
                        />
                        <span className="text-xs font-mono text-gray-400">{cat.catcolor}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-gray-200 inline-block"
                          style={{ backgroundColor: cat.catBg }}
                        />
                        <span className="text-xs font-mono text-gray-400">{cat.catBg}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(cat.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => openEditForm(cat)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
