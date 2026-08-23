/**
 * Flutter의 features/recent/recent_view_store.dart 대응.
 * 백엔드에 API가 없어 기기(브라우저) 안에만 저장한다. 최대 30개, 같은 항목은 맨 앞으로.
 * 앱은 secure storage, 웹은 localStorage를 쓴다.
 */

export type RecentViewType = "place" | "companion" | "guide";

export interface RecentViewItem {
  type: RecentViewType;
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  viewedAt: string;
}

const KEY = "recent_views";
const MAX_ITEMS = 30;

function read(): RecentViewItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentViewItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecentViewItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* 저장 공간이 없거나 차단된 경우 조용히 무시 */
  }
}

export const recentViews = {
  getAll: read,

  record(item: Omit<RecentViewItem, "viewedAt">) {
    const items = read().filter((e) => !(e.type === item.type && e.id === item.id));
    items.unshift({ ...item, viewedAt: new Date().toISOString() });
    write(items.slice(0, MAX_ITEMS));
  },

  remove(type: RecentViewType, id: string) {
    write(read().filter((e) => !(e.type === type && e.id === id)));
  },

  clear() {
    write([]);
  },
};
