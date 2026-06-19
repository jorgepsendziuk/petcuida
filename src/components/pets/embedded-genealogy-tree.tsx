"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PetCardModal } from "@/components/pets/pet-card-modal";
import { PetProfileDrawer } from "@/components/pets/pet-profile-drawer";
import {
  calculateAge,
  fetchAllPetsWithRelations,
  getAvatarColor,
  getCardColor,
  groupFamilies,
} from "@/components/pets/genealogy-utils";
import type { Pet } from "@/components/pets/genealogy-types";
import { getEmbeddedTreeLayout } from "@/components/pets/embedded-tree-layout";

import styles from "./embedded-genealogy-tree.module.css";

const speciesEmoji: Record<Pet["species"], string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  small_pet: "🐹",
  other: "🐾",
};

type EmbeddedGenealogyTreeProps = {
  userId: string;
};

export function EmbeddedGenealogyTree({ userId }: EmbeddedGenealogyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [drawerPetId, setDrawerPetId] = useState<string | null>(null);
  const [drawerEditMode, setDrawerEditMode] = useState(false);

  const { data: pets, isLoading } = useQuery({
    queryKey: ["all-pets-genealogy", userId],
    queryFn: () => fetchAllPetsWithRelations(userId),
    enabled: Boolean(userId),
  });

  const families = useMemo(() => {
    if (!pets?.length) return [];
    return groupFamilies(pets);
  }, [pets]);

  const layout = useMemo(() => getEmbeddedTreeLayout(pets?.length ?? 0), [pets?.length]);

  const fitToContainer = useCallback(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    stage.style.transform = "scale(1)";
    const cw = container.clientWidth - 8;
    const ch = container.clientHeight - 8;
    const sw = stage.scrollWidth;
    const sh = stage.scrollHeight;
    if (!sw || !sh || !cw || !ch) return;

    const padding = 0.96;
    const ideal = Math.min((cw / sw) * padding, (ch / sh) * padding);
    const scale = Math.min(layout.maxFitScale, Math.max(layout.minFitScale, ideal));
    setFitScale(scale);
  }, [layout.maxFitScale, layout.minFitScale]);

  useEffect(() => {
    fitToContainer();
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => fitToContainer());
    ro.observe(container);
    return () => ro.disconnect();
  }, [fitToContainer, pets, families]);

  const handlePetClick = (pet: Pet) => {
    setSelectedPet(pet);
    setModalOpen(true);
  };

  const handleViewProfile = (petId: string, editMode = false) => {
    setDrawerPetId(petId);
    setDrawerEditMode(editMode);
    setProfileDrawerOpen(true);
  };

  if (isLoading) {
    return <div className={styles.loading}>Carregando família…</div>;
  }

  if (!pets?.length) {
    return (
      <div className={styles.empty}>
        <p style={{ margin: 0 }}>Nenhum pet ainda 🐾</p>
        <a href="/pets/create" className={styles.emptyCta}>
          + Cadastrar pet
        </a>
      </div>
    );
  }

  const cssVars = {
    "--tree-avatar": `${layout.avatarPx}px`,
    "--tree-parent-avatar": `${layout.parentAvatarPx}px`,
    "--tree-name-size": layout.nameSize,
    "--tree-age-size": layout.ageSize,
    "--tree-card-padding": layout.cardPadding,
    "--tree-gap": layout.gap,
    "--tree-family-gap": layout.familyGap,
    "--tree-family-padding": layout.familyPadding,
    "--tree-fit-scale": String(fitScale),
  } as React.CSSProperties;

  const renderPet = (pet: Pet, role: "parent" | "child" | "solo") => {
    const isParent = role === "parent";
    const cardClass = `${styles.petCard} ${isParent ? styles.petCardParent : ""}`;
    const ringClass = `${styles.avatarRing} ${isParent ? styles.avatarRingParent : ""}`;

    return (
      <button
        key={pet.id}
        type="button"
        className={cardClass}
        style={{ "--pet-card-bg": getCardColor(pet.sex) } as React.CSSProperties}
        onClick={() => handlePetClick(pet)}
      >
        <div className={ringClass}>
          {pet.photo_url ? (
            <Image
              src={pet.photo_url}
              alt={pet.name}
              width={layout.avatarPx}
              height={layout.avatarPx}
              className={styles.avatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(pet.sex, false, false) }}>
              {speciesEmoji[pet.species]}
            </div>
          )}
        </div>
        <p className={styles.name}>{pet.name}</p>
        <p className={styles.age}>{calculateAge(pet)}</p>
      </button>
    );
  };

  return (
    <>
      <div ref={containerRef} className={styles.root} data-size={layout.size} style={cssVars}>
        <div ref={stageRef} className={styles.stage}>
          {families.map((family) => {
            const hasStructure = family.parents.length > 0 && family.children.length > 0;
            const isOrphanGroup =
              family.parents.length === 0 &&
              family.children.length === 0 &&
              family.allMembers.length > 0;

            if (isOrphanGroup) {
              return (
                <div key={family.id} className={styles.soloGrid}>
                  {family.allMembers.map((pet) => renderPet(pet, "solo"))}
                </div>
              );
            }

            return (
              <div
                key={family.id}
                className={`${styles.family} ${hasStructure ? styles.familyLinked : ""}`}
              >
                {family.parents.length > 0 && (
                  <div className={styles.parents}>
                    {family.parents.map((p) => renderPet(p, "parent"))}
                  </div>
                )}
                {hasStructure && <div className={styles.connector} aria-hidden />}
                {family.children.length > 0 && (
                  <div className={styles.children}>
                    {family.children.map((c) => renderPet(c, "child"))}
                  </div>
                )}
                {family.parents.length === 0 && family.children.length > 0 && (
                  <div className={styles.children}>
                    {family.children.map((c) => renderPet(c, "solo"))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedPet && (
        <PetCardModal
          pet={selectedPet}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          allPets={pets}
          onViewProfile={handleViewProfile}
        />
      )}

      <PetProfileDrawer
        petId={drawerPetId}
        open={profileDrawerOpen}
        initialEditMode={drawerEditMode}
        onClose={() => {
          setProfileDrawerOpen(false);
          setDrawerPetId(null);
          setDrawerEditMode(false);
        }}
        onSuccess={() => {
          setProfileDrawerOpen(false);
          setDrawerPetId(null);
          setDrawerEditMode(false);
        }}
      />
    </>
  );
}
