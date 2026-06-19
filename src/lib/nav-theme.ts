export type NavTheme = {
  gradient: string;
  image: string;
  emoji: string;
  accent: string;
  /** large = 2 colunas no grid */
  size?: "large" | "normal";
};

export const NAV_THEMES: Record<string, NavTheme> = {
  "/dashboard": {
    gradient: "linear-gradient(145deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
    image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80",
    emoji: "🏠",
    accent: "#a855f7",
    size: "large",
  },
  "/pets": {
    gradient: "linear-gradient(145deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
    emoji: "🐕",
    accent: "#f97316",
    size: "large",
  },
  "/treatments": {
    gradient: "linear-gradient(145deg, #0ea5e9 0%, #06b6d4 50%, #22d3ee 100%)",
    image: "https://images.unsplash.com/photo-1628009368230-7bb7cfcb0def?w=800&q=80",
    emoji: "💉",
    accent: "#0ea5e9",
  },
  "/reminders": {
    gradient: "linear-gradient(145deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
    emoji: "🔔",
    accent: "#10b981",
  },
  "/sharing": {
    gradient: "linear-gradient(145deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80",
    emoji: "🤝",
    accent: "#8b5cf6",
  },
  "/clinicas": {
    gradient: "linear-gradient(145deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%)",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80",
    emoji: "🏥",
    accent: "#6366f1",
  },
  "/clinic": {
    gradient: "linear-gradient(145deg, #14b8a6 0%, #2dd4bf 50%, #5eead4 100%)",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80",
    emoji: "🩺",
    accent: "#14b8a6",
    size: "large",
  },
  "/chatbot": {
    gradient: "linear-gradient(145deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)",
    image: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&q=80",
    emoji: "✨",
    accent: "#f43f5e",
  },
  "/profile": {
    gradient: "linear-gradient(145deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)",
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80",
    emoji: "👤",
    accent: "#64748b",
  },
};

export const getNavTheme = (key: string): NavTheme =>
  NAV_THEMES[key] ?? {
    gradient: "linear-gradient(145deg, #1677ff, #4096ff)",
    image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80",
    emoji: "🐾",
    accent: "#1677ff",
  };

export const FLOATING_ANIMALS = ["🐕", "🐈", "🐦", "🐹", "🐰", "🐾", "🦴", "🐠", "🦜"];
