// 朔知 · storage adapter -----------------------------------------------------
//
// LocalStorage 实现; 单人单设备持久化。后续接 Supabase 时只需新建
// SupabaseStorageAdapter 实现同一 interface, 在 getStorage() 切换即可。
// ----------------------------------------------------------------------------

import type {
  AssessmentSession, Report, StorageAdapter,
} from "./types";

const KEY_DRAFT  = "shuozhi.draft.v1";
const KEY_REPORTS = "shuozhi.reports.v1";
const KEY_SESSIONS = "shuozhi.sessions.v1";

function isBrowser() { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }

class LocalStorageAdapter implements StorageAdapter {
  async saveSession(s: AssessmentSession): Promise<void> {
    if (!isBrowser()) return;
    const raw = window.localStorage.getItem(KEY_SESSIONS);
    const map: Record<string, AssessmentSession> = raw ? JSON.parse(raw) : {};
    map[s.id] = s;
    window.localStorage.setItem(KEY_SESSIONS, JSON.stringify(map));
  }

  async getSession(id: string): Promise<AssessmentSession | null> {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(KEY_SESSIONS);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[id] ?? null;
  }

  async saveReport(r: Report): Promise<void> {
    if (!isBrowser()) return;
    const raw = window.localStorage.getItem(KEY_REPORTS);
    const map: Record<string, Report> = raw ? JSON.parse(raw) : {};
    map[r.id] = r;
    window.localStorage.setItem(KEY_REPORTS, JSON.stringify(map));
  }

  async getReport(id: string): Promise<Report | null> {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(KEY_REPORTS);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[id] ?? null;
  }

  async listReports(): Promise<Report[]> {
    if (!isBrowser()) return [];
    const raw = window.localStorage.getItem(KEY_REPORTS);
    if (!raw) return [];
    const map: Record<string, Report> = JSON.parse(raw);
    return Object.values(map).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async saveDraft(s: AssessmentSession): Promise<void> {
    if (!isBrowser()) return;
    window.localStorage.setItem(KEY_DRAFT, JSON.stringify(s));
  }

  async getDraft(): Promise<AssessmentSession | null> {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(KEY_DRAFT);
    return raw ? JSON.parse(raw) : null;
  }

  async clearDraft(): Promise<void> {
    if (!isBrowser()) return;
    window.localStorage.removeItem(KEY_DRAFT);
  }
}

let _adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!_adapter) _adapter = new LocalStorageAdapter();
  return _adapter;
}

// helper: id generator -------------------------------------------
export function newId(prefix = "s"): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}${rnd}`;
}
