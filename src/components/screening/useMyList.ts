import { useState } from "react";
export function useMyList(userId: string) {
  const key = `dept-screening-list:${userId}`;
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data.filter((v: unknown) => typeof v === "string") : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");
  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id];
    setIds(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
    } catch {
      setError("Your list is available for this visit, but this browser could not save it.");
    }
  }
  return { ids, toggle, error };
}
