'use client';

import { useParams } from 'next/navigation';
import BlogForm from '@/components/blog/BlogForm';

export default function EditBlogPage() {
  const params = useParams();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  if (!id || isNaN(id)) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Invalid blog ID</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Blog Post</h1>
        <p className="text-gray-600 mt-1">Edit the details of your blog post</p>
      </div>
      <BlogForm blogId={id} />
    </div>
  );
}
