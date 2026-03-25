/**
 * User table component
 */

import type { AdminUserResponse } from '../../types/admin';

interface UserTableProps {
  users: AdminUserResponse[];
  loading: boolean;
  onSelectUser: (user: AdminUserResponse) => void;
  onSelectRow: (userId: number) => void;
  selectedRows: number[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function UserTable({
  users,
  loading,
  onSelectUser,
  onSelectRow,
  selectedRows,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.length === users.length && users.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectRow(-1); // Select all marker
                    } else {
                      // Clear all
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">KYC</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-slate-700/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(user.id)}
                    onChange={() => onSelectRow(user.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">{user.email}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{user.name || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{user.phone || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-300'
                        : user.status === 'BANNED'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.kycStatus === 'VERIFIED'
                        ? 'bg-green-500/20 text-green-300'
                        : user.kycStatus === 'REJECTED'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-slate-600/50 text-slate-300'
                    }`}
                  >
                    {user.kycStatus || 'PENDING'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => onSelectUser(user)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1 rounded bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-300">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
