import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[AdminLayout] Profile fetch error:', error.message);
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-slate-500">
          You need an admin account to access this area.
        </p>
        <form action="/admin/login" className="mt-4">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go to login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <AdminSidebar email={profile.email} />
      <div className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
