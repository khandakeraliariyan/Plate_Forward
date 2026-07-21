import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import type { Session } from "../types";

export default function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");

  const [documents, setDocuments] = useState<{ _id: string; url: string; label?: string }[]>([]);
  const [docUploading, setDocUploading] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me").then((res) => {
      const u = res.data.data;
      setFullName(u.fullName ?? "");
      setPhone(u.phone ?? "");
      setAvatarUrl(u.avatar ?? "");
      setDocuments(u.documents ?? []);
    });
    api
      .get("/users/me/sessions")
      .then((res) => setSessions(res.data.data ?? []))
      .finally(() => setSessionsLoading(false));
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await api.patch("/users/me", { fullName, phone });
      setProfileMsg("Profile updated.");
    } catch (err: any) {
      setProfileMsg(err?.response?.data?.message ?? "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    setChangingPassword(true);
    try {
      await api.patch("/auth/change-password", { currentPassword, newPassword });
      setPasswordMsg("Password changed. You'll need to log in again next time.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordErr(err?.response?.data?.message ?? "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await api.patch("/users/me/avatar", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarUrl(res.data.data.avatar);
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadDocument = async (file: File) => {
    setDocUploading(true);
    try {
      const body = new FormData();
      body.append("document", file);
      const res = await api.post("/users/me/documents", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocuments(res.data.data.documents ?? []);
    } finally {
      setDocUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    const res = await api.delete(`/users/me/documents/${id}`);
    setDocuments(res.data.data.documents ?? []);
  };

  const revokeSession = async (id: string) => {
    await api.delete(`/users/me/sessions/${id}`);
    setSessions((prev) => prev.filter((s) => s._id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {avatarUrl ? (
              <img src={avatarUrl} className="h-full w-full object-cover" />
            ) : (
              user?.fullName?.charAt(0)?.toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{user?.fullName}</h1>
            <p className="text-sm capitalize text-slate-500">{user?.role} account</p>
          </div>
          <label className="ml-auto cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            {avatarUploading ? "Uploading…" : "Change Avatar"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
        </div>

        {/* Profile */}
        <form onSubmit={saveProfile} className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">General Information</h2>
          {profileMsg && <p className="mt-2 text-sm text-brand-700">{profileMsg}</p>}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">
                Email
              </label>
              <input
                disabled
                value={user?.email ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="mt-4 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Security</h2>
          {passwordMsg && <p className="mt-2 text-sm text-brand-700">{passwordMsg}</p>}
          {passwordErr && <p className="mt-2 text-sm text-red-600">{passwordErr}</p>}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="mt-4 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {changingPassword ? "Changing…" : "Change Password"}
          </button>
        </form>

        {/* Documents */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Verification Documents</h2>
            <label className="cursor-pointer text-xs font-bold text-brand-700">
              {docUploading ? "Uploading…" : "+ Upload"}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
              />
            </label>
          </div>
          <div className="mt-3 space-y-2">
            {documents.length === 0 && (
              <p className="text-sm text-slate-400">No documents uploaded yet.</p>
            )}
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
              >
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-slate-700 hover:underline">
                  📄 {doc.label || "Document"}
                </a>
                <button
                  onClick={() => deleteDocument(doc._id)}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Active Sessions</h2>
          <div className="mt-3 space-y-2">
            {sessionsLoading && <p className="text-sm text-slate-400">Loading…</p>}
            {!sessionsLoading && sessions.length === 0 && (
              <p className="text-sm text-slate-400">No active sessions found.</p>
            )}
            {sessions.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-700">{s.userAgent || "Unknown device"}</div>
                  <div className="text-xs text-slate-400">
                    {s.ip} · last used {new Date(s.lastUsedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => revokeSession(s._id)}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
