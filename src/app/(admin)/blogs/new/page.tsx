import BlogForm from '@/components/blog/BlogForm';

export default function NewBlogPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Blog Post</h1>
        <p className="text-gray-600 mt-1">Fill in the details to create a new blog post</p>
      </div>
      <BlogForm />
    </div>
  );
}