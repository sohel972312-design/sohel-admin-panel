'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/types/blog';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBlogs();
  }, [filter]);

  const fetchBlogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      
      const response = await fetch(`/api/blogs?${params}`);
      const data = await response.json();

      if (!response.ok) {
        const msg = (data as { details?: string; error?: string }).details
          || (data as { error?: string }).error
          || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      if (Array.isArray(data)) {
        setBlogs(data);
      } else {
        setBlogs([]);
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch blogs');
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const deleteBlog = async (id: number) => {
    if (confirm('Are you sure you want to delete this blog?')) {
      try {
        const response = await fetch(`/api/blogs/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          fetchBlogs();
        }
      } catch (error) {
        console.error('Error deleting blog:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading blogs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
          <button 
            onClick={fetchBlogs}
            className="mt-2 text-sm bg-red-100 px-3 py-1 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Management</h1>
        <Link
          href="/blogs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create New Blog
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All ({blogs.length})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 rounded ${filter === 'published' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Published
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded ${filter === 'draft' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
        >
          Draft
        </button>
      </div>

      {/* Blogs Table */}
      {blogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No blogs found. Click "Create New Blog" to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blogs.map((blog) => (
                <tr key={blog.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{blog.title}</div>
                      <div className="text-sm text-gray-500">{blog.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span style={{ color: blog.catcolor || '#000' }}>
                      {blog.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(blog.id, blog.status)}
                      className={`px-2 py-1 rounded text-sm ${
                        blog.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {blog.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{blog.date}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <Link
                      href={`/blogs/edit/${blog.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteBlog(blog.id)}
                      className="text-red-600 hover:text-red-900"
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