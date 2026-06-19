"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Space, Typography, Avatar, Button, Divider, Slider, Tooltip, Flex } from "antd";
import { CloseCircleOutlined, ZoomInOutlined, ZoomOutOutlined, ScissorOutlined, FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import { FaDog, FaCat, FaDove, FaPaw, FaGenderless } from "react-icons/fa";
import { GiMale, GiFemale } from "react-icons/gi";
import dayjs from "dayjs";

import { supabaseClient } from "@/lib/supabase/client";
import { PetCardModal } from "@/components/pets/pet-card-modal";
import { PetProfileDrawer } from "@/components/pets/pet-profile-drawer";
import type { Pet, FullGenealogyTreeProps, LevelData, FamilyGroup } from "./genealogy-types";
import {
  fetchAllPetsWithRelations,
  buildTree,
  groupFamilies,
  getCardColor,
  getAvatarColor,
  getAvatarStyles,
  isDeceased,
  calculateAge,
  getSpeciesIcon,
  getSpeciesAvatarIcon,
} from "./genealogy-utils";
import { speciesLabel } from "./genealogy-types";

const { Text } = Typography;

// Funções e componentes movidos para arquivos separados:
// - genealogy-utils.ts: fetchAllPetsWithRelations, buildTree, groupFamilies, getCardColor, getAvatarColor, calculateAge, getSpeciesIcon, isDeceased, getAvatarStyles
// - pet-card-modal.tsx: PetCardModal
// - pet-profile-drawer.tsx: PetProfileDrawer
// - genealogy-types.ts: tipos e constantes

// buildTree ainda usado localmente - importado de genealogy-utils

export function FullGenealogyTree({ userId, embedded = false }: FullGenealogyTreeProps) {
  const router = useRouter();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [drawerPetId, setDrawerPetId] = useState<string | null>(null);
  const [drawerEditMode, setDrawerEditMode] = useState<boolean>(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Pet["species"][]>([]);
  const [selectedSex, setSelectedSex] = useState<Pet["sex"][]>([]);
  const [selectedCastrated, setSelectedCastrated] = useState<boolean[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (embedded) setZoomLevel(58);
  }, [embedded]);
  
  const handleViewProfile = (petId: string, editMode: boolean = false) => {
    setDrawerPetId(petId);
    setDrawerEditMode(editMode);
    setProfileDrawerOpen(true);
  };

  // Listener para fullscreenchange
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const { data: pets, isLoading } = useQuery({
    queryKey: ["all-pets-genealogy", userId],
    queryFn: () => fetchAllPetsWithRelations(userId),
    enabled: Boolean(userId),
  });

  // Obter todas as espécies disponíveis dos pets e suas contagens
  const availableSpecies = useMemo(() => {
    if (!pets || pets.length === 0) return [];
    const speciesSet = new Set<Pet["species"]>();
    pets.forEach((pet) => {
      speciesSet.add(pet.species);
    });
    return Array.from(speciesSet);
  }, [pets]);

  // Contagem de pets por espécie
  const speciesCount = useMemo(() => {
    if (!pets || pets.length === 0) return {} as Record<Pet["species"], number>;
    const count: Partial<Record<Pet["species"], number>> = {};
    pets.forEach((pet) => {
      count[pet.species] = (count[pet.species] || 0) + 1;
    });
    return count as Record<Pet["species"], number>;
  }, [pets]);

  // Contar por sexo
  const sexCount = useMemo(() => {
    if (!pets || pets.length === 0) return { male: 0, female: 0, unknown: 0 };
    const count = { male: 0, female: 0, unknown: 0 };
    pets.forEach((pet) => {
      count[pet.sex]++;
    });
    return count;
  }, [pets]);

  // Contar por castrado
  const castratedCount = useMemo(() => {
    if (!pets || pets.length === 0) return { castrated: 0, notCastrated: 0 };
    const count = { castrated: 0, notCastrated: 0 };
    pets.forEach((pet) => {
      const petAny = pet as any;
      if (petAny.castrated === true) {
        count.castrated++;
      } else {
        count.notCastrated++;
      }
    });
    return count;
  }, [pets]);

  // Filtrar pets por critérios selecionados
  const filteredPets = useMemo(() => {
    if (!pets || pets.length === 0) return [];
    
    let filtered = pets;
    
    // Filtro por espécie
    if (selectedSpecies.length > 0) {
      filtered = filtered.filter((pet) => selectedSpecies.includes(pet.species));
    }
    
    // Filtro por sexo
    if (selectedSex.length > 0) {
      filtered = filtered.filter((pet) => selectedSex.includes(pet.sex));
    }
    
    // Filtro por castrado
    if (selectedCastrated.length > 0) {
      filtered = filtered.filter((pet) => {
        const petAny = pet as any;
        const isCastrated = petAny.castrated === true;
        return selectedCastrated.includes(isCastrated);
      });
    }
    
    return filtered;
  }, [pets, selectedSpecies, selectedSex, selectedCastrated]);

  const families = useMemo(() => {
    if (!filteredPets || filteredPets.length === 0) return [];
    return groupFamilies(filteredPets);
  }, [filteredPets]);

  const levels = useMemo(() => {
    if (!filteredPets || filteredPets.length === 0) return [];
    return buildTree(filteredPets);
  }, [filteredPets]);

  if (isLoading) {
    return embedded ? (
      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#94a3b8", fontWeight: 600 }}>
        Carregando árvore…
      </div>
    ) : (
      <Card loading />
    );
  }

  if (!pets || pets.length === 0) {
    if (embedded) {
      return (
        <div style={{ display: "grid", placeItems: "center", height: "100%", textAlign: "center", padding: "1rem" }}>
          <p style={{ margin: "0 0 1rem", color: "#64748b", fontWeight: 700 }}>Nenhum pet ainda 🐾</p>
          <a
            href="/pets/create"
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: 999,
              fontWeight: 800,
              color: "#fff",
              textDecoration: "none",
              background: "linear-gradient(135deg, #f97316, #ec4899, #a855f7)",
            }}
          >
            + Cadastrar pet
          </a>
        </div>
      );
    }
    return null;
  }

  const handlePetClick = (pet: Pet, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPet(pet);
    setModalOpen(true);
  };

  const allSpeciesOptions: { label: string; value: Pet["species"]; icon: React.ReactNode }[] = [
    { label: "Cachorro", value: "dog" as const, icon: <FaDog style={{ fontSize: 16 }} /> },
    { label: "Gato", value: "cat" as const, icon: <FaCat style={{ fontSize: 16 }} /> },
    { label: "Ave", value: "bird" as const, icon: <FaDove style={{ fontSize: 16 }} /> },
    { label: "Pequeno porte", value: "small_pet" as const, icon: <FaPaw style={{ fontSize: 16 }} /> },
    { label: "Outro", value: "other" as const, icon: <FaPaw style={{ fontSize: 16 }} /> },
  ];
  
  const speciesOptions = allSpeciesOptions.filter((option) => availableSpecies.includes(option.value));

  const treeInner = (
    <>
        {!embedded && (
        <div
          style={{
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderBottom: "1px solid #f0f0f0",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flex: 1 }}>
            {/* Filtro por espécie */}
          {speciesOptions.map((option) => {
            const count = speciesCount[option.value] || 0;
            const isSelected = selectedSpecies.includes(option.value);
            return (
              <Button
                key={option.value}
                type={isSelected ? "primary" : "default"}
                size="small"
                onClick={() => {
                  if (isSelected) {
                    setSelectedSpecies(selectedSpecies.filter((s) => s !== option.value));
                  } else {
                    setSelectedSpecies([...selectedSpecies, option.value]);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 32,
                  fontSize: 13,
                }}
              >
                {option.icon}
                <span>{option.label}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>({count})</span>
              </Button>
            );
          })}

          {/* Separador visual - entre espécie e sexo */}
          {availableSpecies.length > 0 && (
            <Divider orientation="vertical" style={{ height: 20, margin: "0 4px" }} />
          )}

          {/* Filtro por sexo */}
          <Button
            type={selectedSex.includes("male") ? "primary" : "default"}
            size="small"
            onClick={() => {
              if (selectedSex.includes("male")) {
                setSelectedSex(selectedSex.filter((s) => s !== "male"));
              } else {
                setSelectedSex([...selectedSex, "male"]);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              fontSize: 13,
            }}
          >
            <GiMale style={{ fontSize: 14, color: selectedSex.includes("male") ? "#fff" : "#1890ff" }} />
            <span>Macho</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>({sexCount.male})</span>
          </Button>
          <Button
            type={selectedSex.includes("female") ? "primary" : "default"}
            size="small"
            onClick={() => {
              if (selectedSex.includes("female")) {
                setSelectedSex(selectedSex.filter((s) => s !== "female"));
              } else {
                setSelectedSex([...selectedSex, "female"]);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              fontSize: 13,
            }}
          >
            <GiFemale style={{ fontSize: 14, color: selectedSex.includes("female") ? "#fff" : "#eb2f96" }} />
            <span>Fêmea</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>({sexCount.female})</span>
          </Button>
          <Button
            type={selectedSex.includes("unknown") ? "primary" : "default"}
            size="small"
            onClick={() => {
              if (selectedSex.includes("unknown")) {
                setSelectedSex(selectedSex.filter((s) => s !== "unknown"));
              } else {
                setSelectedSex([...selectedSex, "unknown"]);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              fontSize: 13,
            }}
          >
            <FaGenderless style={{ fontSize: 14, color: selectedSex.includes("unknown") ? "#fff" : "#8c8c8c" }} />
            <span>Desconhecido</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>({sexCount.unknown})</span>
          </Button>

          {/* Separador visual - entre sexo e castrado */}
          <Divider orientation="vertical" style={{ height: 20, margin: "0 4px" }} />

          {/* Filtro por castrado */}
          <Button
            type={selectedCastrated.includes(true) ? "primary" : "default"}
            size="small"
            onClick={() => {
              if (selectedCastrated.includes(true)) {
                setSelectedCastrated(selectedCastrated.filter((c) => c !== true));
              } else {
                setSelectedCastrated([...selectedCastrated, true]);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              fontSize: 13,
            }}
          >
            <ScissorOutlined style={{ fontSize: 12 }} />
            <span>Castrado</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>({castratedCount.castrated})</span>
          </Button>
          <Button
            type={selectedCastrated.includes(false) ? "primary" : "default"}
            size="small"
            onClick={() => {
              if (selectedCastrated.includes(false)) {
                setSelectedCastrated(selectedCastrated.filter((c) => c !== false));
              } else {
                setSelectedCastrated([...selectedCastrated, false]);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              fontSize: 13,
            }}
          >
            <span>Não castrado</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>({castratedCount.notCastrated})</span>
          </Button>

          {/* Botão limpar filtros */}
          {(selectedSpecies.length > 0 || selectedSex.length > 0 || selectedCastrated.length > 0) && (
            <>
              <Divider orientation="vertical" style={{ height: 20, margin: "0 4px" }} />
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setSelectedSpecies([]);
                  setSelectedSex([]);
                  setSelectedCastrated([]);
                }}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#8c8c8c" }}
              >
                Limpar
              </Button>
            </>
          )}
          </div>

          {/* Controles de Zoom e Tela Cheia */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tooltip title="Zoom Out">
              <Button
                type="text"
                size="small"
                icon={<ZoomOutOutlined />}
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                disabled={zoomLevel <= 50}
              />
            </Tooltip>
            <Slider
              min={50}
              max={200}
              step={10}
              value={zoomLevel}
              onChange={setZoomLevel}
              style={{ width: 120, margin: 0 }}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
            <Tooltip title="Zoom In">
              <Button
                type="text"
                size="small"
                icon={<ZoomInOutlined />}
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                disabled={zoomLevel >= 200}
              />
            </Tooltip>
            <Text style={{ fontSize: 12, color: "#8c8c8c", minWidth: 40, textAlign: "right" }}>
              {zoomLevel}%
            </Text>
            <Tooltip title={isFullscreen ? "Sair de tela cheia" : "Tela cheia"}>
              <Button
                type="text"
                size="small"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={async () => {
                  try {
                    if (!document.fullscreenElement) {
                      await document.documentElement.requestFullscreen();
                      setIsFullscreen(true);
                    } else {
                      await document.exitFullscreen();
                      setIsFullscreen(false);
                    }
                  } catch (err) {
                    console.error("Erro ao alternar fullscreen:", err);
                  }
                }}
              />
            </Tooltip>
          </div>
        </div>
        )}

        {/* Árvore genealógica */}
        <div style={{ position: "relative", padding: embedded ? "8px" : "20px", height: embedded ? "100%" : undefined, overflow: embedded ? "hidden" : undefined }}>

          {/* Árvore genealógica com zoom */}
          {filteredPets.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Nenhum pet encontrado com os filtros selecionados.
              </Text>
            </div>
          ) : (
            <div 
              style={{ 
                padding: embedded ? "8px" : "20px",
                display: "flex",
                flexWrap: "wrap",
                gap: embedded ? 20 : 40,
                justifyContent: "center",
                transform: `scale(${(embedded ? Math.min(zoomLevel, 70) : zoomLevel) / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease",
                width: "100%",
              }}
            >
              {families.map((family) => {
                const hasFamilyStructure = family.parents.length > 0 && family.children.length > 0;
                
                // Determinar espécie(s) da família - se todos têm a mesma, mostrar uma, senão mostrar todas
                const familySpecies = Array.from(new Set(family.allMembers.map((pet) => pet.species)));
                const mainSpecies = familySpecies.length === 1 ? familySpecies[0] : null; // Se todos têm a mesma espécie

                return (
                  <div
                    key={family.id}
                    style={{
                      border: hasFamilyStructure ? "3px solid #1677ff" : "2px solid #e8e8e8",
                      borderRadius: 16,
                      padding: 24,
                      backgroundColor: "#ffffff",
                      minWidth: family.parents.length === 2 ? 380 : 200,
                      maxWidth: 600,
                      display: "flex",
                      flexDirection: "column",
                      gap: hasFamilyStructure || (family.id.startsWith("siblings-") && family.children.length > 0) ? 16 : 24,
                      boxShadow: hasFamilyStructure ? "0 4px 12px rgba(22, 119, 255, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.08)",
                      transition: "all 0.3s ease",
                      position: "relative",
                    }}
                  >
                    {/* Indicador de espécie no quadro da família - canto superior direito */}
                    {mainSpecies ? (
                      <Tooltip title={mainSpecies === "dog" ? "Cachorro" : mainSpecies === "cat" ? "Gato" : mainSpecies === "bird" ? "Ave" : mainSpecies === "small_pet" ? "Pequeno porte" : "Outro"}>
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            zIndex: 1,
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "50%",
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            border: "2px solid #f0f0f0",
                          }}
                        >
                          {getSpeciesIcon(mainSpecies)}
                        </div>
                      </Tooltip>
                    ) : familySpecies.length > 0 ? (
                      <Tooltip title={`Múltiplas espécies: ${familySpecies.map(s => s === "dog" ? "Cachorro" : s === "cat" ? "Gato" : s === "bird" ? "Ave" : s === "small_pet" ? "Pequeno porte" : "Outro").join(", ")}`}>
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            zIndex: 1,
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: 8,
                            padding: "4px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            border: "2px solid #f0f0f0",
                          }}
                        >
                          {familySpecies.slice(0, 3).map((species) => (
                            <span key={species} style={{ display: "flex", alignItems: "center" }}>
                              {getSpeciesIcon(species)}
                            </span>
                          ))}
                          {familySpecies.length > 3 && (
                            <span style={{ fontSize: 10, color: "#8c8c8c" }}>+{familySpecies.length - 3}</span>
                          )}
                        </div>
                      </Tooltip>
                    ) : null}
                {/* Pais - lado a lado */}
                {/* Se for grupo de irmãos sem pais, mostrar apenas um ícone cinza */}
                {family.id.startsWith("siblings-") && family.parents.length === 0 ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Avatar
                      size={80}
                      icon={getSpeciesAvatarIcon("other", 40)}
                      style={{
                        backgroundColor: "#d9d9d9",
                        border: "3px solid #fff",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                        opacity: 0.6,
                      }}
                    />
                  </div>
                ) : family.parents.length > 0 ? (
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                    {family.parents
                      .sort((a, b) => {
                        if (a.sex === "female" && b.sex !== "female") return -1;
                        if (b.sex === "female" && a.sex !== "female") return 1;
                        if (a.sex === "male" && b.sex !== "male") return -1;
                        if (b.sex === "male" && a.sex !== "male") return 1;
                        return 0;
                      })
                      .map((parent) => (
                        <div
                          key={parent.id}
                          onClick={(e) => handlePetClick(parent, e)}
                          style={{
                            width: 150,
                            textAlign: "center",
                            cursor: "pointer",
                            padding: 16,
                            borderRadius: 12,
                            backgroundColor: getCardColor(parent.sex),
                            border: "2px solid transparent",
                            transition: "all 0.3s ease",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#1677ff";
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 119, 255, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                            <Avatar
                              size={80}
                              src={parent.photo_url || undefined}
                              icon={getSpeciesAvatarIcon(parent.species, 40)}
                              style={getAvatarStyles(
                                parent,
                                {
                                  backgroundColor: getAvatarColor(parent.sex, family.children.length > 0, false),
                                  marginBottom: 12,
                                  border: "3px solid #fff",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                                },
                                family.children.length > 0,
                                false
                              )}
                            />
                          </div>
                          <Typography.Text strong style={{ fontSize: 15, display: "block", color: "#262626" }}>
                            {parent.name}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
                            {calculateAge(parent)}
                          </Typography.Text>
                        </div>
                      ))}
                  </div>
                ) : null}

                {/* Linha conectora discreta - apenas um pequeno ponto sutil */}
                {(hasFamilyStructure || (family.id.startsWith("siblings-") && family.children.length > 0)) && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: -8, marginBottom: -8 }}>
                    <div
                      style={{
                        width: 1,
                        height: 16,
                        background: family.id.startsWith("siblings-")
                          ? "#d9d9d9"
                          : "#e0e0e0",
                        borderRadius: 1,
                        opacity: 0.4,
                      }}
                    />
                  </div>
                )}

                {/* Filhos - em flex */}
                {family.children.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                      width: "100%",
                    }}
                  >
                    {family.children.map((child) => {
                      const childAny = child as any;
                      const childsOwnChildren = pets.filter((p) => {
                        const pAny = p as any;
                        return pAny.mother_id === child.id || pAny.father_id === child.id;
                      });
                      const hasChildren = childsOwnChildren.length > 0;

                      return (
                        <div
                          key={child.id}
                          onClick={(e) => handlePetClick(child, e)}
                          style={{
                            textAlign: "center",
                            cursor: "pointer",
                            padding: 14,
                            borderRadius: 12,
                            backgroundColor: getCardColor(child.sex),
                            border: hasChildren ? "2px solid #52c41a" : "2px solid transparent",
                            transition: "all 0.3s ease",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = hasChildren ? "#52c41a" : "#1677ff";
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 119, 255, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = hasChildren ? "#52c41a" : "transparent";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                            <Avatar
                              size={64}
                              src={child.photo_url || undefined}
                              icon={getSpeciesAvatarIcon(child.species, 32)}
                              style={getAvatarStyles(
                                child,
                                {
                                  backgroundColor: getAvatarColor(child.sex, hasChildren, true),
                                  marginBottom: 10,
                                  border: "2px solid #fff",
                                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                                },
                                hasChildren,
                                true
                              )}
                            />
                          </div>
                          <Typography.Text strong style={{ fontSize: 14, display: "block", color: "#262626" }}>
                            {child.name}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                            {calculateAge(child)}
                          </Typography.Text>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pets órfãos */}
                {family.parents.length === 0 && family.children.length === 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 16,
                      justifyContent: "center",
                    }}
                  >
                    {family.allMembers.map((pet) => {
                      const petAny = pet as any;
                      const hasParents = petAny.mother_id || petAny.father_id;
                      const hasChildren = pets.some((p) => {
                        const pAny = p as any;
                        return (pAny.mother_id === pet.id || pAny.father_id === pet.id);
                      });

                      return (
                        <div
                          key={pet.id}
                          onClick={(e) => handlePetClick(pet, e)}
                          style={{
                            textAlign: "center",
                            cursor: "pointer",
                            padding: 14,
                            borderRadius: 12,
                            backgroundColor: getCardColor(pet.sex),
                            border: hasChildren || hasParents ? "2px solid #1677ff" : "2px solid transparent",
                            transition: "all 0.3s ease",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#1677ff";
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 119, 255, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = hasChildren || hasParents ? "#1677ff" : "transparent";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                            <Avatar
                              size={64}
                              src={pet.photo_url || undefined}
                              icon={getSpeciesAvatarIcon(pet.species, 32)}
                              style={getAvatarStyles(
                                pet,
                                {
                                  backgroundColor: getAvatarColor(pet.sex, hasChildren, hasParents),
                                  marginBottom: 10,
                                  border: "2px solid #fff",
                                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                                },
                                hasChildren,
                                hasParents
                              )}
                            />
                          </div>
                          <Typography.Text strong style={{ fontSize: 14, display: "block", color: "#262626" }}>
                            {pet.name}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                            {calculateAge(pet)}
                          </Typography.Text>
                        </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </>
  );

  return (
    <>
      {embedded ? (
        <div style={{ height: "100%", minHeight: 0, overflow: "hidden" }}>{treeInner}</div>
      ) : (
        <Card
          style={{ marginBottom: 24, border: "none", boxShadow: "none", padding: 0 }}
          styles={{ body: { padding: 0 } }}
        >
          {treeInner}
        </Card>
      )}

      {/* Modal de crachá */}
      {selectedPet && (
        <PetCardModal 
          pet={selectedPet} 
          open={modalOpen} 
          onClose={() => setModalOpen(false)} 
          allPets={pets || []}
          onViewProfile={handleViewProfile}
        />
      )}
      
      {/* Drawer unificado para perfil completo e edição */}
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
