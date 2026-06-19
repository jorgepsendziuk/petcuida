import dayjs from "dayjs";
import React from "react";
import { FaDog, FaCat, FaDove, FaPaw } from "react-icons/fa";
import { supabaseClient } from "@/lib/supabase/client";
import type { Pet, FamilyGroup, LevelData } from "./genealogy-types";

export const fetchAllPetsWithRelations = async (userId: string): Promise<Pet[]> => {
  const { data: pets, error } = await supabaseClient
    .from("pets")
    .select("*")
    .eq("owner_id", userId)
    .order("name");

  if (error || !pets) return [];
  return pets as Pet[];
};

export const buildTree = (pets: Pet[]): LevelData[] => {
  const petMap = new Map<string, Pet>();
  pets.forEach((pet) => {
    petMap.set(pet.id, { ...pet, children: [] });
  });

  pets.forEach((pet) => {
    const petAny = pet as any;
    const children = pets.filter((p) => {
      const pAny = p as any;
      return pAny.mother_id === pet.id || pAny.father_id === pet.id;
    });
    if (children.length > 0) {
      petMap.get(pet.id)!.children = children;
    }
  });

  const levels = new Map<string, number>();
  
  const calculateLevel = (petId: string, visited: Set<string>): number => {
    if (levels.has(petId)) return levels.get(petId)!;
    if (visited.has(petId)) return 0;

    visited.add(petId);
    const pet = petMap.get(petId);
    if (!pet) return 0;

    const petAny = pet as any;
    if (!petAny.mother_id && !petAny.father_id) {
      levels.set(petId, 0);
      return 0;
    }

    let maxParentLevel = -1;
    if (petAny.mother_id) {
      maxParentLevel = Math.max(maxParentLevel, calculateLevel(petAny.mother_id, visited));
    }
    if (petAny.father_id) {
      maxParentLevel = Math.max(maxParentLevel, calculateLevel(petAny.father_id, visited));
    }

    const petLevel = maxParentLevel + 1;
    levels.set(petId, petLevel);
    return petLevel;
  };

  pets.forEach((pet) => {
    if (!levels.has(pet.id)) {
      calculateLevel(pet.id, new Set());
    }
  });

  const minLevel = Math.min(...Array.from(levels.values()));
  const normalizedLevels = new Map<string, number>();
  levels.forEach((level, petId) => {
    normalizedLevels.set(petId, level - minLevel);
  });

  const levelMap = new Map<number, Pet[]>();
  pets.forEach((pet) => {
    const level = normalizedLevels.get(pet.id) || 0;
    if (!levelMap.has(level)) {
      levelMap.set(level, []);
    }
    levelMap.get(level)!.push(petMap.get(pet.id)!);
  });

  return Array.from(levelMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, petsInLevel]) => ({
      level,
      pets: petsInLevel.sort((a, b) => a.name.localeCompare(b.name)),
    }));
};

export const groupFamilies = (pets: Pet[]): FamilyGroup[] => {
  const families: FamilyGroup[] = [];
  const processed = new Set<string>();
  
  // Mapa para agrupar filhos por casal de pais (chave: ids dos pais ordenados)
  const familyMap = new Map<string, { mother: Pet; father: Pet; children: Pet[] }>();
  
  // Encontrar todos os filhos que têm ambos os pais cadastrados
  pets.forEach((pet) => {
    const petAny = pet as any;
    const motherId = petAny.mother_id;
    const fatherId = petAny.father_id;
    
    // Se o pet tem ambos os pais, adicionar à família do casal
    if (motherId && fatherId) {
      // Buscar os pets que são mãe e pai (usar o ID diretamente de mother_id e father_id)
      const motherPet = pets.find((p) => p.id === motherId);
      const fatherPet = pets.find((p) => p.id === fatherId);
      
      // Se encontramos ambos os pais na lista
      if (motherPet && fatherPet) {
        // Criar chave única para o casal (ordem consistente: IDs ordenados para garantir mesma chave)
        // Independente de qual pet é mãe ou pai, a chave será a mesma para o mesmo casal
        const coupleKey = [motherId, fatherId].sort().join("-");
        
        if (!familyMap.has(coupleKey)) {
          // Identificar qual é mãe e qual é pai baseado no sexo dos pets
          // Como mother_id aponta para a mãe e father_id aponta para o pai,
          // vamos usar os pets encontrados diretamente, mas verificar o sexo para garantir
          let identifiedMother: Pet;
          let identifiedFather: Pet;
          
          if (motherPet.sex === "female") {
            identifiedMother = motherPet;
            identifiedFather = fatherPet;
          } else if (fatherPet.sex === "female") {
            // Se father_id aponta para uma fêmea, os campos podem estar trocados
            identifiedMother = fatherPet;
            identifiedFather = motherPet;
          } else if (motherPet.sex === "male" && fatherPet.sex === "male") {
            // Ambos machos - usar a ordem dos campos (mother_id primeiro, father_id segundo)
            // Mas provavelmente está errado, então vamos confiar na ordem dos campos
            identifiedMother = motherPet; // Pode estar errado, mas vamos manter
            identifiedFather = fatherPet;
          } else {
            // Caso padrão: confiar na ordem dos campos (mother_id = mãe, father_id = pai)
            identifiedMother = motherPet;
            identifiedFather = fatherPet;
          }
          
          familyMap.set(coupleKey, {
            mother: identifiedMother,
            father: identifiedFather,
            children: [],
          });
        }
        
        const family = familyMap.get(coupleKey)!;
        // Adicionar filho se ainda não estiver na lista (evitar duplicatas)
        if (!family.children.some((c) => c.id === pet.id)) {
          family.children.push(pet);
        }
      }
      // Se não encontramos os pais na lista, isso significa que eles não são pets do mesmo owner
      // Nesse caso, não podemos agrupá-los em uma família
    }
  });
  
  // Criar cards de família para cada casal com filhos
  familyMap.forEach((familyData, coupleKey) => {
    if (familyData.children.length > 0) {
      // Ordenar pais: mãe primeiro (sex === "female"), depois pai (sex === "male")
      const sortedParents: Pet[] = [];
      
      // Adicionar mãe primeiro (se existir e não estiver duplicada)
      if (familyData.mother.sex === "female") {
        sortedParents.push(familyData.mother);
        if (familyData.father.id !== familyData.mother.id) {
          sortedParents.push(familyData.father);
        }
      } else if (familyData.father.sex === "female") {
        sortedParents.push(familyData.father);
        if (familyData.mother.id !== familyData.father.id) {
          sortedParents.push(familyData.mother);
        }
      } else {
        // Nenhum é fêmea, adicionar ambos na ordem que aparecem
        sortedParents.push(familyData.mother);
        if (familyData.father.id !== familyData.mother.id) {
          sortedParents.push(familyData.father);
        }
      }
      
      families.push({
        id: coupleKey,
        parents: sortedParents,
        children: familyData.children.sort((a, b) => a.name.localeCompare(b.name)),
        allMembers: [...sortedParents, ...familyData.children],
      });
      
      processed.add(familyData.mother.id);
      processed.add(familyData.father.id);
      familyData.children.forEach((c) => processed.add(c.id));
    }
  });
  
  // Pets que são pais solteiros (têm filhos mas o outro pai não está cadastrado ou não existe)
  pets.forEach((pet) => {
    const petAny = pet as any;
    
    if (!processed.has(pet.id)) {
      // Filhos onde este pet é pai ou mãe, mas o outro pai não está cadastrado ou não é do mesmo casal
      const children = pets.filter((p) => {
        if (processed.has(p.id)) return false; // Já foi processado em outra família
        
        const pAny = p as any;
        const isChildOfThisPet = pAny.mother_id === pet.id || pAny.father_id === pet.id;
        
        if (!isChildOfThisPet) return false;
        
        // Se o filho tem ambos os pais, só incluir se o outro pai não foi processado ainda
        // (caso contrário, o filho já está em uma família)
        if (pAny.mother_id && pAny.father_id) {
          return false; // Filho já está em uma família completa
        }
        
        return true; // Filho com apenas este pai
      });
      
      if (children.length > 0) {
        families.push({
          id: `single-${pet.id}`,
          parents: [pet],
          children: children.sort((a, b) => a.name.localeCompare(b.name)),
          allMembers: [pet, ...children],
        });
        processed.add(pet.id);
        children.forEach((c) => processed.add(c.id));
      }
    }
  });
  
  // Agrupar irmãos sem pais (usando sibling_group_id)
  const siblingGroups = new Map<string, Pet[]>();
  pets.forEach((pet) => {
    if (!processed.has(pet.id)) {
      const petAny = pet as any;
      // Se não tem pais, verificar se tem sibling_group_id
      if (!petAny.mother_id && !petAny.father_id && petAny.sibling_group_id) {
        const groupId = petAny.sibling_group_id;
        if (!siblingGroups.has(groupId)) {
          siblingGroups.set(groupId, []);
        }
        siblingGroups.get(groupId)!.push(pet);
      }
    }
  });

  // Criar famílias para grupos de irmãos sem pais
  siblingGroups.forEach((siblings, groupId) => {
    if (siblings.length > 1) {
      // Só criar família se houver pelo menos 2 irmãos
      families.push({
        id: `siblings-${groupId}`,
        parents: [],
        children: siblings.sort((a, b) => a.name.localeCompare(b.name)),
        allMembers: siblings,
      });
      siblings.forEach((sibling) => processed.add(sibling.id));
    } else {
      // Se só tem 1 irmão no grupo, tratar como órfão
      processed.add(siblings[0].id);
    }
  });

  // Pets órfãos (sem pais, sem filhos, e sem grupo de irmãos)
  pets.forEach((pet) => {
    if (!processed.has(pet.id)) {
      families.push({
        id: `orphan-${pet.id}`,
        parents: [],
        children: [],
        allMembers: [pet],
      });
      processed.add(pet.id);
    }
  });
  
  return families;
};

export const getCardColor = (sex: Pet["sex"]): string => {
  switch (sex) {
    case "male":
      return "#e6f4ff"; // Azul claro para macho
    case "female":
      return "#fff0f6"; // Rosa claro para fêmea
    default:
      return "#f5f5f5"; // Cinza para desconhecido
  }
};

export const getAvatarColor = (sex: Pet["sex"], hasChildren: boolean, hasParents: boolean): string => {
  if (hasChildren) return "#52c41a"; // Verde para quem tem filhos
  if (hasParents) return "#667eea"; // Azul para quem tem pais
  
  switch (sex) {
    case "male":
      return "#1890ff"; // Azul para macho
    case "female":
      return "#eb2f96"; // Rosa para fêmea
    default:
      return "#ff7875"; // Vermelho para desconhecido
  }
};

export const calculateAge = (pet: Pet): string => {
  const petAny = pet as any;
  if (petAny.birthdate) {
    const birthDate = dayjs(petAny.birthdate);
    const age = dayjs().diff(birthDate, "year");
    if (age === 0) {
      const months = dayjs().diff(birthDate, "month");
      return `${months} ${months === 1 ? "mês" : "meses"}`;
    }
    return `${age} ${age === 1 ? "ano" : "anos"}`;
  }
  if (petAny.birthdate_estimated) {
    return "Idade estimada";
  }
  return "—";
};

export const getSpeciesIcon = (species: Pet["species"]): React.ReactNode => {
  const iconStyle = { fontSize: 20 };
  switch (species) {
    case "dog":
      return React.createElement(FaDog, { style: iconStyle });
    case "cat":
      return React.createElement(FaCat, { style: iconStyle });
    case "bird":
      return React.createElement(FaDove, { style: iconStyle });
    case "small_pet":
      return React.createElement(FaPaw, { style: iconStyle });
    default:
      return React.createElement(FaPaw, { style: iconStyle });
  }
};

// Função helper para retornar o ícone correto para avatares baseado na espécie
export const getSpeciesAvatarIcon = (species: Pet["species"], fontSize: number = 60): React.ReactNode => {
  switch (species) {
    case "dog":
      return React.createElement(FaDog, { style: { fontSize } });
    case "cat":
      return React.createElement(FaCat, { style: { fontSize } });
    case "bird":
      return React.createElement(FaDove, { style: { fontSize } });
    case "small_pet":
      return React.createElement(FaPaw, { style: { fontSize } });
    case "other":
      return React.createElement(FaPaw, { style: { fontSize } });
    default:
      // Se espécie desconhecida ou não definida, usar paw
      return React.createElement(FaPaw, { style: { fontSize } });
  }
};

export const isDeceased = (pet: Pet): boolean => {
  const petAny = pet as any;
  return petAny.deceased === true;
};

export const getAvatarStyles = (
  pet: Pet,
  baseStyle: React.CSSProperties,
  hasChildren: boolean,
  hasParents: boolean
): React.CSSProperties => {
  const deceased = isDeceased(pet);
  return {
    ...baseStyle,
    filter: deceased ? "grayscale(100%)" : "none",
    opacity: deceased ? 0.7 : 1,
  };
};

type ParentCandidate = { id: string; sex: Pet["sex"] };

/** Mãe: apenas fêmeas */
export const filterMotherCandidates = <T extends ParentCandidate>(
  pets: T[],
  opts?: { excludeId?: string; fatherId?: string | null },
): T[] =>
  pets.filter(
    (p) => p.id !== opts?.excludeId && p.sex === "female" && p.id !== opts?.fatherId,
  );

/** Pai: apenas machos */
export const filterFatherCandidates = <T extends ParentCandidate>(
  pets: T[],
  opts?: { excludeId?: string; motherId?: string | null },
): T[] =>
  pets.filter(
    (p) => p.id !== opts?.excludeId && p.sex === "male" && p.id !== opts?.motherId,
  );
