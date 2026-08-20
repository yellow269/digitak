import { BlogForm } from '@/components/admin/blog-form';

export const dynamic = 'force-dynamic';

export default function NewBlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Write Article</h1>
        <p className="text-sm text-slate-500">Create a new blog post</p>
      </div>
      <BlogForm />
    </div>
  );
}
