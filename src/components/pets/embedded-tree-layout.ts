export type EmbeddedTreeSize = "showcase" | "comfortable" | "balanced" | "compact" | "dense";

export type EmbeddedTreeLayout = {
  size: EmbeddedTreeSize;
  avatarPx: number;
  parentAvatarPx: number;
  nameSize: string;
  ageSize: string;
  cardPadding: string;
  gap: string;
  familyGap: string;
  familyPadding: string;
  minFitScale: number;
  maxFitScale: number;
};

/**
 * Sempre grande por padrão; só encolhe com muitos pets.
 * Pais sempre maiores que filhos (~28% de diferença).
 */
export function getEmbeddedTreeLayout(petCount: number): EmbeddedTreeLayout {
  if (petCount <= 10) {
    return {
      size: "showcase",
      avatarPx: 112,
      parentAvatarPx: 144,
      nameSize: "1.25rem",
      ageSize: "0.92rem",
      cardPadding: "1.15rem 1.35rem",
      gap: "1.1rem",
      familyGap: "1.35rem",
      familyPadding: "1.35rem",
      minFitScale: 1,
      maxFitScale: 1.85,
    };
  }

  if (petCount <= 18) {
    return {
      size: "comfortable",
      avatarPx: 96,
      parentAvatarPx: 124,
      nameSize: "1.1rem",
      ageSize: "0.85rem",
      cardPadding: "1rem 1.15rem",
      gap: "0.95rem",
      familyGap: "1.15rem",
      familyPadding: "1.15rem",
      minFitScale: 0.92,
      maxFitScale: 1.45,
    };
  }

  if (petCount <= 28) {
    return {
      size: "balanced",
      avatarPx: 78,
      parentAvatarPx: 102,
      nameSize: "0.95rem",
      ageSize: "0.75rem",
      cardPadding: "0.75rem 0.9rem",
      gap: "0.75rem",
      familyGap: "0.9rem",
      familyPadding: "0.9rem",
      minFitScale: 0.78,
      maxFitScale: 1.15,
    };
  }

  if (petCount <= 40) {
    return {
      size: "compact",
      avatarPx: 62,
      parentAvatarPx: 82,
      nameSize: "0.82rem",
      ageSize: "0.68rem",
      cardPadding: "0.55rem 0.7rem",
      gap: "0.55rem",
      familyGap: "0.65rem",
      familyPadding: "0.7rem",
      minFitScale: 0.65,
      maxFitScale: 1,
    };
  }

  return {
    size: "dense",
    avatarPx: 48,
    parentAvatarPx: 64,
    nameSize: "0.72rem",
    ageSize: "0.6rem",
    cardPadding: "0.45rem 0.55rem",
    gap: "0.45rem",
    familyGap: "0.5rem",
    familyPadding: "0.55rem",
    minFitScale: 0.55,
    maxFitScale: 0.92,
  };
}
