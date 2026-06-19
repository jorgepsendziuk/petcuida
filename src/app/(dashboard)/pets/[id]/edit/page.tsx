"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Steps,
  Switch,
  Typography,
  Divider,
  Checkbox,
  Alert,
} from "antd";
import { CheckOutlined, ArrowLeftOutlined, CloseCircleOutlined, EditOutlined, CalendarOutlined, BarChartOutlined, CheckCircleOutlined, ScissorOutlined, TagOutlined, PictureOutlined, FileTextOutlined, BgColorsOutlined, UserOutlined } from "@ant-design/icons";
import { FaDog, FaCat, FaDove, FaPaw, FaWeight } from "react-icons/fa";
import { GiMale, GiFemale } from "react-icons/gi";
import { ImageCropUpload } from "@/components/pets/image-crop-upload";

import { supabaseClient } from "@/lib/supabase/client";
import { filterFatherCandidates, filterMotherCandidates } from "@/components/pets/genealogy-utils";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

const { Title, Text } = Typography;

type Pet = Database["public"]["Tables"]["pets"]["Row"];

type PetFormValues = {
  name: string;
  species: Pet["species"];
  sex: Pet["sex"];
  breed?: string;
  color?: string;
  microchip_id?: string;
  weight_kg?: number;
  birthdate?: Dayjs | null;
  birthdate_estimated: boolean;
  age_years?: number;
  age_months?: number;
  notes?: string;
  mother_id?: string;
  father_id?: string;
  photo_url?: string;
  castrated: boolean;
  deceased: boolean;
  death_date?: Dayjs | null;
};

const speciesOptions: { label: string; value: Pet["species"]; icon: React.ReactNode }[] = [
  { label: "Cachorro", value: "dog", icon: <FaDog style={{ fontSize: 16 }} /> },
  { label: "Gato", value: "cat", icon: <FaCat style={{ fontSize: 16 }} /> },
  { label: "Ave", value: "bird", icon: <FaDove style={{ fontSize: 16 }} /> },
  { label: "Pequeno porte", value: "small_pet", icon: <FaPaw style={{ fontSize: 16 }} /> },
  { label: "Outro", value: "other", icon: <FaPaw style={{ fontSize: 16 }} /> },
];

const breedOptions: { label: string; value: string }[] = [
  { label: "SRD", value: "SRD" },
  { label: "Golden Retriever", value: "Golden Retriever" },
  { label: "Labrador", value: "Labrador" },
  { label: "Bulldog", value: "Bulldog" },
  { label: "Pastor Alemão", value: "Pastor Alemão" },
  { label: "Poodle", value: "Poodle" },
  { label: "Vira-lata", value: "Vira-lata" },
  { label: "Outro", value: "other" },
];

const colorOptions: { label: string; value: string }[] = [
  { label: "Preto", value: "Preto" },
  { label: "Branco", value: "Branco" },
  { label: "Marrom", value: "Marrom" },
  { label: "Amarelo", value: "Amarelo" },
  { label: "Cinza", value: "Cinza" },
  { label: "Tricolor", value: "Tricolor" },
  { label: "Outro", value: "other" },
];

const fetchPets = async (userId: string, excludeId?: string) => {
  let query = supabaseClient.from("pets").select("id,name,sex").eq("owner_id", userId);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data, error } = await query.order("name");
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string; sex: Pet["sex"] }>;
};

const fetchPet = async (id: string) => {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("*")
    .eq("id", id)
    .maybeSingle<Database["public"]["Tables"]["pets"]["Row"]>();
  if (error) throw error;
  if (!data) throw new Error("Pet não encontrado");
  return data;
};

export default function PetEditPage() {
  const params = useParams<{ id: string }>();
  const petId = params.id;
  const router = useRouter();
  const [form] = Form.useForm<PetFormValues>();
  const { message } = App.useApp();
  const { user } = useAuth();
  const [ageType, setAgeType] = useState<"birthdate" | "age" | null>(null);
  const [showOtherBreedInput, setShowOtherBreedInput] = useState(false);
  const [showOtherColorInput, setShowOtherColorInput] = useState(false);
  const [selectedSiblings, setSelectedSiblings] = useState<string[]>([]);

  const { data: pet, isLoading: loadingPet } = useQuery({
    queryKey: ["pet-edit", petId],
    queryFn: () => fetchPet(petId!),
    enabled: !!petId,
  });

  const { data: availablePets } = useQuery({
    queryKey: ["pets-options-edit", user?.id, petId],
    queryFn: () => fetchPets(user!.id, petId),
    enabled: !!user?.id && !!petId,
  });

  // Buscar pets sem ambos os pais cadastrados (possíveis irmãos)
  const { data: possibleSiblings } = useQuery({
    queryKey: ["possible-siblings", user?.id, petId],
    queryFn: async () => {
      if (!user?.id || !petId) return [];
      const { data, error } = await supabaseClient
        .from("pets")
        .select("id,name,mother_id,father_id")
        .eq("owner_id", user.id)
        .neq("id", petId)
        .order("name");
      if (error) throw error;
      // Filtrar pets que não têm ambos os pais cadastrados (possíveis irmãos)
      const petsWithoutBothParents = (data ?? []).filter((p: any) => {
        // Mostrar apenas pets que não têm ambos pai E mãe cadastrados
        return !p.mother_id || !p.father_id;
      });
      return petsWithoutBothParents.map((p: any) => ({ id: p.id, name: p.name })) as Array<{ id: string; name: string }>;
    },
    enabled: !!user?.id && !!petId,
  });

  useEffect(() => {
    if (pet) {
      const petAny = pet as any;
      if (petAny.birthdate) {
        setAgeType("birthdate");
      } else if (petAny.birthdate_estimated) {
        setAgeType("age");
      }

      form.setFieldsValue({
        name: pet.name,
        species: pet.species,
        sex: pet.sex,
        breed: pet.breed ?? undefined,
        color: pet.color ?? undefined,
        microchip_id: pet.microchip_id ?? undefined,
        weight_kg: pet.weight_kg ?? undefined,
        birthdate: petAny.birthdate ? dayjs(petAny.birthdate) : null,
        birthdate_estimated: petAny.birthdate_estimated ?? false,
        notes: pet.notes ?? undefined,
        mother_id: petAny.mother_id ?? undefined,
        father_id: petAny.father_id ?? undefined,
        photo_url: petAny.photo_url ?? undefined,
        castrated: (petAny.castrated ?? false) as boolean,
        deceased: (petAny.deceased ?? false) as boolean,
        death_date: petAny.death_date ? dayjs(petAny.death_date) : null,
      });
    }
  }, [pet, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: PetFormValues) => {
      if (!petId) throw new Error("ID do pet não encontrado");

      let birthdate: Dayjs | null = values.birthdate ?? null;
      let birthdate_estimated = values.birthdate_estimated ?? false;

      if (ageType === "age" && (values.age_years || values.age_months)) {
        const years = values.age_years ?? 0;
        const months = values.age_months ?? 0;
        birthdate = dayjs().subtract(years, "year").subtract(months, "month");
        birthdate_estimated = true;
      }

      const photoUrl: string | null = values.photo_url || null;

      const payload: Database["public"]["Tables"]["pets"]["Update"] = {
        name: values.name,
        species: values.species,
        sex: values.sex,
        breed: values.breed && typeof values.breed === "string" ? values.breed.trim() : null,
        color: values.color && typeof values.color === "string" ? values.color.trim() : null,
        microchip_id: values.microchip_id && typeof values.microchip_id === "string" ? values.microchip_id.trim() : null,
        weight_kg: values.weight_kg ?? null,
        birthdate: birthdate ? birthdate.format("YYYY-MM-DD") : null,
        birthdate_estimated,
        notes: values.notes && typeof values.notes === "string" ? values.notes.trim() : null,
        mother_id: values.mother_id || null,
        father_id: values.father_id || null,
        photo_url: photoUrl,
        castrated: values.castrated ?? false,
        deceased: values.deceased ?? false,
        // Tentar incluir death_date - será ignorado se a coluna não existir no banco
        death_date: values.death_date ? values.death_date.format("YYYY-MM-DD") : null,
      } as any;

      // Atualizar o pet atual - usar try-catch para capturar erros de schema cache
      let error: any = null;
      
      try {
        const result = await supabaseClient.from("pets").update(payload as never).eq("id", petId);
        error = result.error;
      } catch (err: any) {
        // Capturar erros lançados durante a validação do schema
        error = err;
      }
      
      // Se houver erro relacionado a colunas que podem não existir (migrações pendentes), tentar novamente sem esses campos
      if (error) {
        const errorMessage = (error.message || error.toString() || "").toLowerCase();
        
        // Verificar se é um erro de schema cache ou coluna não encontrada
        const isSchemaError = 
          errorMessage.includes("schema cache") ||
          errorMessage.includes("could not find") ||
          (errorMessage.includes("column") && errorMessage.includes("not found")) ||
          errorMessage.includes("does not exist");
        
        // Se for erro de schema e tivermos campos opcionais que podem estar faltando, tentar novamente sem eles
        if (isSchemaError && (payload.castrated !== undefined || payload.deceased !== undefined || payload.death_date !== undefined)) {
          const payloadWithoutOptionalFields = { ...payload };
          delete (payloadWithoutOptionalFields as any).castrated;
          delete (payloadWithoutOptionalFields as any).deceased;
          delete (payloadWithoutOptionalFields as any).death_date;
          
          const retryResult = await supabaseClient.from("pets").update(payloadWithoutOptionalFields as never).eq("id", petId);
          if (retryResult.error) {
            // Se ainda houver erro, lançar o erro original
            throw error;
          }
          
          // Avisar o usuário sobre as migrações pendentes
          const migrationsNeeded: string[] = [];
          const removedFields: string[] = [];
          if (payload.castrated !== undefined) {
            removedFields.push("castrated");
            migrationsNeeded.push("20251127000000_add_pet_castrated.sql");
          }
          if (payload.deceased !== undefined || payload.death_date !== undefined) {
            if (payload.deceased !== undefined) removedFields.push("deceased");
            if (payload.death_date !== undefined) removedFields.push("death_date");
            migrationsNeeded.push("20251127000002_add_pet_deceased.sql");
          }
          
          if (removedFields.length > 0) {
            message.warning(
              `Pet atualizado, mas os campos (${removedFields.join(", ")}) não foram salvos. ` +
              `As seguintes migrações precisam ser aplicadas pelo DBA: ${migrationsNeeded.join(", ")}`
            );
          }
          // Continuar normalmente para processar irmãos, etc.
        } else {
          // Se não for erro de schema ou não tiver campos opcionais, lançar o erro
          throw error;
        }
      }

      // Se há irmãos selecionados
      if (selectedSiblings.length > 0) {
        if (values.mother_id || values.father_id) {
          // Se há pais definidos, aplicar os mesmos pais aos irmãos
          const siblingPayload: Database["public"]["Tables"]["pets"]["Update"] = {
            mother_id: values.mother_id || null,
            father_id: values.father_id || null,
            sibling_group_id: null, // Limpar grupo de irmãos se tem pais
          } as any;

          // Atualizar todos os irmãos selecionados com os mesmos pais
          const { error: siblingsError } = await supabaseClient
            .from("pets")
            .update(siblingPayload as never)
            .in("id", selectedSiblings);

          if (siblingsError) throw siblingsError;
        } else {
          // Se não há pais, criar um grupo de irmãos usando sibling_group_id
          // Verificar se algum dos pets (atual ou selecionados) já tem um sibling_group_id
          const petAny = pet as any;
          let siblingGroupId: string | null = null;
          
          // Verificar se o pet atual já está em um grupo
          if (petAny.sibling_group_id) {
            siblingGroupId = petAny.sibling_group_id;
          } else {
            // Verificar se algum dos irmãos selecionados já está em um grupo
            const { data: siblingsData } = await supabaseClient
              .from("pets")
              .select("sibling_group_id")
              .in("id", selectedSiblings)
              .not("sibling_group_id", "is", null)
              .limit(1);
            
            if (siblingsData && siblingsData.length > 0) {
              const firstSibling = siblingsData[0] as any;
              if (firstSibling.sibling_group_id) {
                siblingGroupId = firstSibling.sibling_group_id;
              } else {
                // Criar novo grupo usando o menor ID entre o pet atual e os irmãos
                const allIds = [petId, ...selectedSiblings].sort();
                siblingGroupId = allIds[0];
              }
            } else {
              // Criar novo grupo usando o menor ID entre o pet atual e os irmãos
              // Isso garante que todos os pets do grupo usem o mesmo ID (o menor)
              const allIds = [petId, ...selectedSiblings].sort();
              siblingGroupId = allIds[0]; // Usar o menor ID como ID do grupo
            }
          }
          
          // Atualizar o pet atual e todos os irmãos selecionados com o mesmo sibling_group_id
          const siblingPayload: Database["public"]["Tables"]["pets"]["Update"] = {
            sibling_group_id: siblingGroupId,
          } as any;

          // Atualizar o pet atual
          const { error: currentPetError } = await supabaseClient
            .from("pets")
            .update(siblingPayload as never)
            .eq("id", petId);
          
          if (currentPetError) throw currentPetError;

          // Atualizar todos os irmãos selecionados com o mesmo sibling_group_id
          const { error: siblingsError } = await supabaseClient
            .from("pets")
            .update(siblingPayload as never)
            .in("id", selectedSiblings);

          if (siblingsError) throw siblingsError;
        }
      }
    },
    onSuccess: () => {
      message.success({
        content: "Pet atualizado com sucesso!",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      if (selectedSiblings.length > 0) {
        const hasParents = form.getFieldValue("mother_id") || form.getFieldValue("father_id");
        if (hasParents) {
          message.info(`${selectedSiblings.length} irmão(s) também foram atualizado(s) com os mesmos pais`);
        } else {
          message.info(`${selectedSiblings.length} irmão(s) foram agrupados juntos na árvore genealógica`);
        }
      }
      router.push(`/pets/${petId}`);
    },
    onError: (error: Error) => {
      message.error(`Erro ao atualizar pet: ${error.message}`);
    },
  });

  const handleSubmit = async (values: PetFormValues) => {
    updateMutation.mutate(values);
  };

  if (loadingPet) {
    return <Card loading />;
  }

  if (!pet) {
    return <Card>Pet não encontrado</Card>;
  }

  return (
    <Card
      title={
        <Space>
          <ArrowLeftOutlined onClick={() => router.back()} style={{ cursor: "pointer", fontSize: 18 }} />
          <span>Editar Pet</span>
        </Space>
      }
      style={{ maxWidth: 800, margin: "0 auto" }}
    >
      <Form<PetFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          {/* Foto */}
          <Form.Item
            label={
              <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <PictureOutlined />
                Foto
              </Text>
            }
            name="photo_url"
          >
            <ImageCropUpload
              value={form.getFieldValue("photo_url")}
              onChange={(base64) => {
                form.setFieldsValue({ photo_url: base64 || undefined });
              }}
              onRemove={() => {
                form.setFieldsValue({ photo_url: undefined });
              }}
            />
          </Form.Item>

          <Divider style={{ margin: "16px 0" }} />

          {/* Nome */}
          <Form.Item
            label={
              <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <EditOutlined />
                Nome
              </Text>
            }
            name="name"
            rules={[{ required: true, message: "Informe o nome" }]}
          >
            <Input size="large" placeholder="Digite o nome..." style={{ fontSize: 16 }} />
          </Form.Item>

          {/* Espécie e Sexo */}
          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item
              label={
                <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <FaPaw />
                  Espécie
                </Text>
              }
              name="species"
              rules={[{ required: true, message: "Escolha a espécie" }]}
              style={{ flex: 1 }}
            >
              <Radio.Group size="large" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {speciesOptions.map((option) => (
                  <Radio.Button
                    key={option.value}
                    value={option.value}
                    style={{ height: 45, fontSize: 16, flex: "1 1 auto", minWidth: 120, textAlign: "center" }}
                  >
                    {option.icon} {option.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label={<Text strong style={{ fontSize: 16 }}>Sexo</Text>}
              name="sex"
              rules={[{ required: true, message: "Escolha o sexo" }]}
              style={{ flex: 1 }}
            >
              <Radio.Group size="large" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Radio.Button value="female" style={{ height: 45, fontSize: 16, flex: "1 1 auto", minWidth: 100 }}>
                  <GiFemale style={{ marginRight: 8 }} />
                  Fêmea
                </Radio.Button>
                <Radio.Button value="male" style={{ height: 45, fontSize: 16, flex: "1 1 auto", minWidth: 100 }}>
                  <GiMale style={{ marginRight: 8 }} />
                  Macho
                </Radio.Button>
                <Radio.Button value="unknown" style={{ height: 45, fontSize: 16, flex: "1 1 auto", minWidth: 120 }}>
                  <UserOutlined style={{ marginRight: 8 }} />
                  Desconhecido
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Space>

          {/* Castrado */}
          <Form.Item
            label={
              <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <ScissorOutlined />
                Castrado
              </Text>
            }
            name="castrated"
            valuePropName="checked"
          >
            <Switch size="default" />
          </Form.Item>

          {/* Falecido */}
          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item
              label={
                <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <CloseCircleOutlined />
                  Falecido
                </Text>
              }
              name="deceased"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch size="default" />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.deceased !== currentValues.deceased}
            >
              {({ getFieldValue }) => (
                <Form.Item
                  label={
                    <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <CalendarOutlined />
                      Data de falecimento
                    </Text>
                  }
                  name="death_date"
                  style={{ flex: 1 }}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!getFieldValue("deceased") || value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Informe a data de falecimento"));
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                    size="large"
                    disabled={!getFieldValue("deceased")}
                  />
                </Form.Item>
              )}
            </Form.Item>
          </Space>

          {/* Raça e Cor */}
          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item
              label={
                <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <FaDog />
                  Raça
                </Text>
              }
              name="breed"
              style={{ flex: 1 }}
            >
              <Radio.Group size="large" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {breedOptions.map((option) => (
                  <Radio.Button
                    key={option.value}
                    value={option.value}
                    style={{ height: 45, fontSize: 16, flex: "1 1 auto", minWidth: 120 }}
                    onClick={() => {
                      if (option.value === "other") {
                        setShowOtherBreedInput(true);
                      } else {
                        setShowOtherBreedInput(false);
                      }
                    }}
                  >
                    {option.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            {showOtherBreedInput && (
              <Form.Item name="breed" style={{ flex: 1, marginTop: 16 }}>
                <Input size="large" placeholder="Digite a raça..." style={{ fontSize: 16 }} />
              </Form.Item>
            )}

            <Form.Item
              label={
                <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <BgColorsOutlined />
                  Cor
                </Text>
              }
              name="color"
              style={{ flex: 1 }}
            >
              <Radio.Group size="large" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {colorOptions.map((option) => (
                  <Radio.Button
                    key={option.value}
                    value={option.value}
                    style={{ height: 45, fontSize: 16, flex: "1 1 auto", minWidth: 100 }}
                    onClick={() => {
                      if (option.value === "other") {
                        setShowOtherColorInput(true);
                      } else {
                        setShowOtherColorInput(false);
                      }
                    }}
                  >
                    {option.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            {showOtherColorInput && (
              <Form.Item name="color" style={{ flex: 1, marginTop: 16 }}>
                <Input size="large" placeholder="Digite a cor..." style={{ fontSize: 16 }} />
              </Form.Item>
            )}
          </Space>

          {/* Peso e Idade */}
          <Space size="large" style={{ width: "100%" }} wrap>
            <Form.Item
              label={
                <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <FaWeight />
                  Peso (kg)
                </Text>
              }
              name="weight_kg"
              style={{ flex: 1 }}
            >
              <InputNumber
                size="large"
                min={0}
                max={200}
                step={0.1}
                placeholder="Ex: 12.5"
                style={{ width: "100%", fontSize: 16 }}
              />
            </Form.Item>

            <Form.Item
              label={
                <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarOutlined />
                  Idade
                </Text>
              }
              style={{ flex: 1 }}
            >
              {!ageType ? (
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  <Button
                    size="large"
                    onClick={() => setAgeType("birthdate")}
                    style={{ width: "100%", height: 45, fontSize: 16 }}
                  >
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Data exata
                  </Button>
                  <Button
                    size="large"
                    onClick={() => setAgeType("age")}
                    style={{ width: "100%", height: 45, fontSize: 16 }}
                  >
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    Idade aproximada
                  </Button>
                </Space>
              ) : ageType === "birthdate" ? (
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  <Form.Item name="birthdate" style={{ marginBottom: 8 }}>
                    <DatePicker
                      size="large"
                      style={{ width: "100%", fontSize: 16, height: 45 }}
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                  <Form.Item name="birthdate_estimated" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Space>
                      <Switch />
                      <Text style={{ fontSize: 14 }}>Data estimada?</Text>
                    </Space>
                  </Form.Item>
                  <Button size="small" onClick={() => setAgeType(null)}>
                    Trocar tipo
                  </Button>
                </Space>
              ) : (
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  <Space size="small" style={{ width: "100%" }}>
                    <Form.Item name="age_years" label="Anos" style={{ flex: 1, marginBottom: 8 }}>
                      <InputNumber
                        size="large"
                        min={0}
                        max={30}
                        placeholder="0"
                        style={{ width: "100%", fontSize: 16 }}
                      />
                    </Form.Item>
                    <Form.Item name="age_months" label="Meses" style={{ flex: 1, marginBottom: 8 }}>
                      <InputNumber
                        size="large"
                        min={0}
                        max={11}
                        placeholder="0"
                        style={{ width: "100%", fontSize: 16 }}
                      />
                    </Form.Item>
                  </Space>
                  <Button size="small" onClick={() => setAgeType(null)}>
                    Trocar tipo
                  </Button>
                </Space>
              )}
            </Form.Item>
          </Space>

          {/* Microchip */}
          <Form.Item
            label={
              <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <TagOutlined />
                Microchip
              </Text>
            }
            name="microchip_id"
          >
            <Input size="large" placeholder="Código do microchip (opcional)" style={{ fontSize: 16 }} />
          </Form.Item>

          <Divider style={{ margin: "16px 0" }} />

          {/* Parentesco */}
          <Form.Item label={<Text strong style={{ fontSize: 16 }}>Parentesco</Text>}>
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              <Space size="large" style={{ width: "100%" }} wrap>
                <Form.Item
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <GiFemale />
                      Mãe (só fêmeas)
                    </span>
                  }
                  name="mother_id"
                  style={{ flex: 1 }}
                >
                  <Select
                    size="large"
                    placeholder="Selecione a mãe (opcional)"
                    allowClear
                    style={{ fontSize: 16 }}
                    options={filterMotherCandidates(availablePets ?? [], {
                      excludeId: petId,
                      fatherId: form.getFieldValue("father_id"),
                    }).map((pet) => ({
                        label: (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FaDog />
                            {pet.name}
                          </span>
                        ),
                        value: pet.id,
                      }))}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <GiMale />
                      Pai (só machos)
                    </span>
                  }
                  name="father_id"
                  style={{ flex: 1 }}
                >
                  <Select
                    size="large"
                    placeholder="Selecione o pai (opcional)"
                    allowClear
                    style={{ fontSize: 16 }}
                    options={filterFatherCandidates(availablePets ?? [], {
                      excludeId: petId,
                      motherId: form.getFieldValue("mother_id"),
                    }).map((pet) => ({
                        label: (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FaDog />
                            {pet.name}
                          </span>
                        ),
                        value: pet.id,
                      }))}
                  />
                </Form.Item>
              </Space>

              {/* Possíveis irmãos */}
              {possibleSiblings && possibleSiblings.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    title="Vincular irmãos"
                    description={
                      form.getFieldValue("mother_id") || form.getFieldValue("father_id")
                        ? "Selecione os pets que são irmãos deste pet. Quando você salvar, os mesmos pais serão aplicados aos irmãos selecionados."
                        : "Selecione os pets que são irmãos deste pet (sem pais cadastrados). Eles serão agrupados juntos na árvore genealógica."
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #d9d9d9", borderRadius: 6, padding: 12 }}>
                    <Checkbox.Group
                      value={selectedSiblings}
                      onChange={(checkedValues) => setSelectedSiblings(checkedValues as string[])}
                      style={{ width: "100%" }}
                    >
                      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                        {possibleSiblings.map((sibling) => (
                          <Checkbox key={sibling.id} value={sibling.id} style={{ fontSize: 14 }}>
                            <FaDog style={{ marginRight: 8 }} />
                            {sibling.name}
                          </Checkbox>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </div>
                  {selectedSiblings.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                      {selectedSiblings.length} irmão(s) selecionado(s).
                      {form.getFieldValue("mother_id") || form.getFieldValue("father_id")
                        ? " Os pais deste pet serão aplicados a eles ao salvar."
                        : " Eles serão agrupados juntos na árvore genealógica."}
                    </Text>
                  )}
                </div>
              )}
            </Space>
          </Form.Item>

          <Divider style={{ margin: "16px 0" }} />

          {/* Observações */}
          <Form.Item
            label={
              <Text strong style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <FileTextOutlined />
                Observações
              </Text>
            }
            name="notes"
          >
            <Input.TextArea
              rows={4}
              placeholder="Alergias, cuidados especiais, etc..."
              style={{ fontSize: 16 }}
            />
          </Form.Item>

          {/* Botão de salvar */}
          <Form.Item style={{ marginTop: 20, marginBottom: 0 }}>
            <Space size="large" style={{ width: "100%", justifyContent: "space-between" }}>
              <Button size="large" onClick={() => router.back()} style={{ height: 50, fontSize: 16 }}>
                Cancelar
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                icon={<CheckOutlined />}
                loading={updateMutation.isPending}
                style={{ height: 50, fontSize: 18, padding: "0 40px" }}
              >
                Salvar Alterações
              </Button>
            </Space>
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
