// hooks/useUsers.ts
import { useEffect, useState, useCallback, useRef } from "react";

export function useUsers() {
  const [users, setUsers] = useState<TimelineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fb/fetch-users");
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        console.log("useUsers fetched", json.data.length, "users");
        setUsers(json.data as TimelineUser[]);
      } else {
        console.error("fetch-users error", json);
      }
    } catch (err) {
      console.error("fetchUsers error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchUsers();
    }
  }, [fetchUsers]);

  const getOrCreateUser = useCallback(
    async (payload: {
      clerkUserId: string;
      displayName: string;
      email?: string | null;
      imageUrl?: string | null;
    }): Promise<TimelineUser | null> => {
      try {
        const res = await fetch("/api/fb/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json?.ok && json.data) {
          const user = json.data as TimelineUser;
          // Update local state
          setUsers((prev) => {
            const idx = prev.findIndex(
              (u) => u.clerkUserId === user.clerkUserId
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = user;
              return updated;
            }
            return [...prev, user].sort((a, b) =>
              a.displayName.localeCompare(b.displayName)
            );
          });
          return user;
        } else {
          console.error("save-user error", json);
          return null;
        }
      } catch (err) {
        console.error("getOrCreateUser error", err);
        return null;
      }
    },
    []
  );

  const addTimelineToUser = useCallback(
    async (clerkUserId: string, timelineId: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/fb/add-timeline-to-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkUserId, timelineId }),
        });
        const json = await res.json();
        if (json?.ok) {
          // Update local state
          setUsers((prev) =>
            prev.map((u) =>
              u.clerkUserId === clerkUserId
                ? {
                    ...u,
                    timelineUids: [...(u.timelineUids || []), timelineId],
                  }
                : u
            )
          );
          return true;
        } else {
          console.error("add-timeline-to-user error", json);
          return false;
        }
      } catch (err) {
        console.error("addTimelineToUser error", err);
        return false;
      }
    },
    []
  );

  const fetchUserById = useCallback(
    async (userId: string): Promise<TimelineUser | null> => {
      try {
        const res = await fetch(
          `/api/fb/fetch-user?userId=${encodeURIComponent(userId)}`
        );
        const json = await res.json();
        if (json?.ok && json.data) {
          return json.data as TimelineUser;
        } else {
          console.error("fetch-user error", json);
          return null;
        }
      } catch (err) {
        console.error("fetchUserById error", err);
        return null;
      }
    },
    []
  );

  return {
    users,
    loading,
    fetchUsers,
    getOrCreateUser,
    addTimelineToUser,
    fetchUserById,
  };
}
