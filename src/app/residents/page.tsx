import Link from 'next/link';

import { AccessDenied } from '@/components/identity/AccessDenied';
import { SessionControls } from '@/components/identity/SessionControls';
import { ResidentList } from '@/components/residents/ResidentList';
import { canEnterEntry } from '@/components/shell/feature-entry';
import { getCurrentUser } from '@/modules/identity';

export default async function ResidentsPage() {
  const current = await getCurrentUser();
  const denied =
    current !== null && !(await canEnterEntry(current, ['resident-list']));
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            href="/"
          >
            ← Trung tâm
          </Link>
          <SessionControls />
        </header>
        <div className="mt-10">
          <p className="font-mono text-xs tracking-[0.16em] text-cyan-300 uppercase">
            Quản lý cư dân
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Danh sách cư dân đặc biệt
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Tạm trú dài hạn, người nước ngoài và tái hòa nhập theo phân công.
          </p>
        </div>
        <div className="mt-10">
          {denied ? (
            <AccessDenied message="Danh sách cư dân không thuộc nhiệm vụ hoặc phạm vi của tài khoản hiện tại." />
          ) : (
            <ResidentList />
          )}
        </div>
      </div>
    </main>
  );
}
