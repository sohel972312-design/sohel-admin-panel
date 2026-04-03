'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BlogForm from '@/components/blog/BlogForm';
import type { BlogPost } from '@/types/blog';

export default function EditBlogPage() {
  const params = useParams();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlog();
  }, []);

  const fetchBlog = async () => {
    try {
      const res = await fetch(`/api/blogs/${params.id}`);
      const data = await res.json();
      setBlog(data);
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Blog not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Blog Post</h1>
        <p className="text-gray-600 mt-1">Edit the details of your blog post</p>
      </div>
      <BlogForm initialData={blog} blogId={blog.id} />
    </div>
  );
}