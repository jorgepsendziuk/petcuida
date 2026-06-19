"use client";

import { useState } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  Tag,
  Upload,
  Image,
} from "antd";
import { UploadOutlined, UserOutlined, HeartOutlined, CloseCircleOutlined, MedicineBoxOutlined, CalendarOutlined, EditOutlined, FileTextOutlined, CheckCircleOutlined, CloseOutlined, CheckOutlined, PlusOutlined, ArrowRightOutlined, ArrowLeftOutlined, TagOutlined, PictureOutlined, BgColorsOutlined, ReloadOutlined, GiftOutlined } from "@ant-design/icons";
import { FaDog, FaCat, FaDove, FaPaw, FaBug, FaHospital, FaWeight, FaBirthdayCake } from "react-icons/fa";
import { GiMale, GiFemale, GiSyringe } from "react-icons/gi";
import { ImageCropUpload } from "@/components/pets/image-crop-upload";
import { filterFatherCandidates, filterMotherCandidates } from "@/components/pets/genealogy-utils";

import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { BRAND_NAME } from "@/lib/brand";
import type { Database } from "@/types/database";

const { Title, Text, Paragraph } = Typography;

type Pet = Database["public"]["Tables"]["pets"]["Row"];
type TreatmentKind = Database["public"]["Enums"]["treatment_kind"];
type TreatmentStatus = Database["public"]["Enums"]["treatment_status"];

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
  photo_url?: string; // base64
  castrated: boolean;
  deceased: boolean;
  death_date?: Dayjs | null;
};

type TreatmentFormValues = {
  pet_id: string;
  title: string;
  kind: TreatmentKind;
  status: TreatmentStatus;
  description?: string;
  start_date?: Dayjs | null;
  due_date?: Dayjs | null;
  frequency_days?: number;
  notes?: string;
};

type WizardAction = "pet" | "treatment" | null;
type PetWizardStep =
  | "name"
  | "species"
  | "sex"
  | "castrated"
  | "breed"
  | "color"
  | "weight"
  | "age"
  | "photo"
  | "parents"
  | "deceased"
  | "notes"
  | "complete";

type TreatmentWizardStep =
  | "pet"
  | "kind"
  | "status"
  | "description"
  | "dates"
  | "frequency"
  | "notes"
  | "complete";

const speciesOptions: { label: string; value: Pet["species"]; icon: React.ReactNode; color: string }[] = [
  { label: "Cachorro", value: "dog", icon: <FaDog style={{ fontSize: 24 }} />, color: "#ff6b6b" },
  { label: "Gato", value: "cat", icon: <FaCat style={{ fontSize: 24 }} />, color: "#4ecdc4" },
  { label: "Ave", value: "bird", icon: <FaDove style={{ fontSize: 24 }} />, color: "#ffe66d" },
  { label: "Pequeno porte", value: "small_pet", icon: <FaPaw style={{ fontSize: 24 }} />, color: "#a8e6cf" },
  { label: "Outro", value: "other", icon: <FaPaw style={{ fontSize: 24 }} />, color: "#ffd3b6" },
];

const sexOptions: { label: string; value: Pet["sex"]; icon: React.ReactNode }[] = [
  { label: "Macho", value: "male", icon: <GiMale style={{ fontSize: 20 }} /> },
  { label: "Fêmea", value: "female", icon: <GiFemale style={{ fontSize: 20 }} /> },
  { label: "Não sei", value: "unknown", icon: <UserOutlined style={{ fontSize: 20 }} /> },
];

const commonBreeds = [
  "SRD (Sem Raça Definida)",
  "Golden Retriever",
  "Labrador",
  "Bulldog",
  "Pastor Alemão",
  "Poodle",
  "Shih Tzu",
  "Yorkshire",
  "Pinscher",
  "Rottweiler",
  "Husky",
  "Border Collie",
  "Beagle",
  "Dachshund",
  "Chihuahua",
];

const commonColors = [
  "Branco",
  "Preto",
  "Marrom",
  "Dourado",
  "Cinza",
  "Tigrado",
  "Caramelo",
  "Tricolor",
  "Bicolor",
  "Ruivo",
];

const kindOptions: { label: string; value: TreatmentKind; icon: React.ReactNode }[] = [
  { label: "Vacina", value: "vaccine", icon: <GiSyringe style={{ fontSize: 20 }} /> },
  { label: "Vermífugo", value: "deworming", icon: <MedicineBoxOutlined style={{ fontSize: 20 }} /> },
  { label: "Carrapato/Pulga", value: "tick_flea", icon: <FaBug style={{ fontSize: 20 }} /> },
  { label: "Medicação", value: "general_medication", icon: <MedicineBoxOutlined style={{ fontSize: 20 }} /> },
  { label: "Check-up", value: "checkup", icon: <FaHospital style={{ fontSize: 20 }} /> },
];

const statusOptions: { label: string; value: TreatmentStatus }[] = [
  { label: "Agendado", value: "scheduled" },
  { label: "Concluído", value: "completed" },
  { label: "Perdido", value: "missed" },
  { label: "Cancelado", value: "cancelled" },
];

type PetOption = Pick<Database["public"]["Tables"]["pets"]["Row"], "id" | "name" | "sex">;

const fetchPets = async (userId: string) => {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("id,name,sex")
    .eq("owner_id", userId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as PetOption[];
};

type WizardProps = {
  onComplete?: () => void;
  onSkip?: () => void;
  initialAction?: "pet" | "treatment";
};

export function ChatbotWizard({ onComplete, onSkip, initialAction }: WizardProps) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [action, setAction] = useState<WizardAction>(initialAction || null);
  const [petStep, setPetStep] = useState<PetWizardStep>("name");
  const [treatmentStep, setTreatmentStep] = useState<TreatmentWizardStep>("pet");
  const [petForm] = Form.useForm<PetFormValues>();
  const [treatmentForm] = Form.useForm<TreatmentFormValues>();
  const [showBreedInput, setShowBreedInput] = useState(false);
  const [showColorInput, setShowColorInput] = useState(false);
  const [ageType, setAgeType] = useState<"birthdate" | "age" | null>(null);
  const [dateType, setDateType] = useState<"start" | "due" | "both" | null>(null);

  const { data: pets, isLoading: loadingPets } = useQuery({
    queryKey: ["pets-options", user?.id],
    queryFn: () => fetchPets(user!.id),
    enabled: !!user?.id,
  });

  const petMutation = useMutation({
    mutationFn: async (values: PetFormValues) => {
      if (!user) throw new Error("Usuário não autenticado");

      console.log("Valores recebidos na mutation:", values);

      // Validar campos obrigatórios
      if (!values.name || typeof values.name !== "string" || !values.name.trim()) {
        throw new Error("O nome do pet é obrigatório");
      }

      // Calcular data de nascimento se for idade aproximada
      let birthdate: Dayjs | null = values.birthdate ?? null;
      let birthdate_estimated = values.birthdate_estimated ?? false;

      if (ageType === "age" && (values.age_years || values.age_months)) {
        const years = values.age_years ?? 0;
        const months = values.age_months ?? 0;
        birthdate = dayjs().subtract(years, "year").subtract(months, "month");
        birthdate_estimated = true;
      }

      // A foto já vem como base64 do componente de crop
      const photoUrl: string | null = values.photo_url || null;

      const payload = {
        owner_id: user.id,
        name: (values.name || "").trim(),
        species: values.species || "dog",
        sex: values.sex || "unknown",
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
        death_date: values.death_date ? values.death_date.format("YYYY-MM-DD") : null,
      };

      console.log("Payload sendo enviado:", payload);

      const { error } = await supabaseClient.from("pets").insert(payload as never);
      if (error) {
        console.error("Erro do Supabase:", error);
        throw error;
      }
    },
    onSuccess: () => {
      message.success({
        content: "Pet cadastrado com sucesso!",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      petForm.resetFields();
      setPetStep("name");
      setAction(null);
      setAgeType(null);
      onComplete?.();
    },
    onError: (error: Error) => {
      message.error(`Erro ao cadastrar pet: ${error.message}`);
    },
  });

  const treatmentMutation = useMutation({
    mutationFn: async (values: TreatmentFormValues) => {
      const payload = {
        pet_id: values.pet_id,
        title: values.title,
        kind: values.kind,
        status: values.status,
        description: values.description ?? null,
        start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
        due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        frequency_days: values.frequency_days ?? null,
        notes: values.notes ?? null,
      };

      const { error } = await supabaseClient.from("pet_treatments").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      message.success({
        content: "Tratamento cadastrado com sucesso!",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
      treatmentForm.resetFields();
      setTreatmentStep("pet");
      setDateType(null);
      setAction(null);
      onComplete?.();
    },
    onError: (error: Error) => {
      message.error(`Erro ao cadastrar tratamento: ${error.message}`);
    },
  });

  const handlePetStepNext = () => {
    const currentValues = petForm.getFieldsValue();
    
    switch (petStep) {
      case "name":
        if (!currentValues.name?.trim()) {
          message.warning("Por favor, informe o nome do pet");
          return;
        }
        setPetStep("species");
        break;
      case "species":
        if (!currentValues.species) {
          message.warning("Por favor, escolha a espécie");
          return;
        }
        setPetStep("sex");
        break;
      case "sex":
        if (!currentValues.sex) {
          message.warning("Por favor, escolha o sexo");
          return;
        }
        setPetStep("castrated");
        break;
      case "castrated":
        setPetStep("breed");
        break;
      case "breed":
        setPetStep("color");
        break;
      case "color":
        setPetStep("weight");
        break;
        case "weight":
          setPetStep("age");
          break;
        case "age":
          setPetStep("photo");
          break;
        case "photo":
          setPetStep("parents");
          break;
        case "parents":
          setPetStep("deceased");
          break;
        case "deceased":
          const deceasedValue = currentValues.deceased;
          if (deceasedValue === true && !currentValues.death_date) {
            message.warning("Por favor, informe a data de falecimento");
            return;
          }
          setPetStep("notes");
          break;
        case "notes":
        // Este caso não é mais usado, o botão Finalizar trata isso diretamente
          break;
    }
  };

  const handlePetStepSkip = () => {
    switch (petStep) {
      case "breed":
      case "color":
      case "weight":
      case "notes":
        handlePetStepNext();
        break;
      case "age":
        setAgeType(null);
        petForm.setFieldsValue({ birthdate: null, age_years: undefined, age_months: undefined });
        handlePetStepNext();
        break;
      case "photo":
      case "parents":
      case "deceased":
        handlePetStepNext();
        break;
      default:
        handlePetStepNext();
    }
  };

  // Tela inicial - seleção de ação
  if (!action) {
    return (
      <Card
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          borderRadius: 20,
          padding: 40,
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
          <div>
            <Title level={1} style={{ color: "white", margin: 0, fontSize: 48, display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
              <FaPaw style={{ fontSize: 48 }} />
              {BRAND_NAME}
            </Title>
            <Paragraph style={{ color: "rgba(255,255,255,0.9)", fontSize: 20, marginTop: 16 }}>
              Vamos cadastrar seu pet de forma rápida e fácil!
            </Paragraph>
          </div>

          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setAction("pet")}
              block
              style={{
                height: 80,
                fontSize: 24,
                fontWeight: "bold",
                borderRadius: 15,
                background: "rgba(255,255,255,0.2)",
                border: "2px solid white",
                color: "white",
              }}
            >
              <FaDog style={{ marginRight: 8 }} />
              Cadastrar Novo Pet
            </Button>

            <Button
              type="primary"
              size="large"
              icon={<MedicineBoxOutlined />}
              onClick={() => {
                if (!pets || pets.length === 0) {
                  message.warning("Cadastre um pet primeiro para poder criar tratamentos!");
                  return;
                }
                setAction("treatment");
              }}
              block
              style={{
                height: 80,
                fontSize: 24,
                fontWeight: "bold",
                borderRadius: 15,
                background: "rgba(255,255,255,0.2)",
                border: "2px solid white",
                color: "white",
              }}
              disabled={loadingPets || !pets || pets.length === 0}
            >
              <MedicineBoxOutlined style={{ marginRight: 8 }} />
              Cadastrar Tratamento
              {(!loadingPets && (!pets || pets.length === 0)) && (
                <Tag color="orange" style={{ marginLeft: 8, fontSize: 14 }}>
                  Cadastre um pet primeiro
                </Tag>
              )}
            </Button>
          </Space>

          <Button
            type="text"
            size="large"
            onClick={onSkip}
            style={{
              color: "white",
              fontSize: 18,
              marginTop: 20,
            }}
          >
            Ou converse com o assistente diretamente →
          </Button>
        </Space>
      </Card>
    );
  }

  // Wizard de cadastro de pet - interface passo a passo
  if (action === "pet") {
    const renderPetStep = () => {
      switch (petStep) {
        case "name":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                Qual é o nome do seu pet? <FaPaw style={{ fontSize: 24, marginLeft: 8 }} />
              </Title>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input
                  size="large"
                  placeholder="Digite o nome..."
                  style={{ fontSize: 24, height: 60, textAlign: "center" }}
                  autoFocus
                  onPressEnter={handlePetStepNext}
                />
              </Form.Item>
            </Space>
          );

        case "species":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                Qual a espécie?
              </Title>
              <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                {speciesOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="large"
                    onClick={() => {
                      console.log("Espécie selecionada:", option.value);
                      petForm.setFieldsValue({ species: option.value });
                      // Aguardar um pouco para garantir que o valor foi setado
                      setTimeout(() => {
                        setPetStep("sex");
                      }, 100);
                    }}
                    style={{
                      height: 100,
                      width: 150,
                      fontSize: 20,
                      fontWeight: "bold",
                      borderRadius: 15,
                      background: option.color,
                      border: "none",
                      color: "white",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{option.icon}</div>
                      <div>{option.label}</div>
                    </div>
                  </Button>
                ))}
              </Space>
            </Space>
          );

        case "sex":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                Qual o sexo?
              </Title>
              <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                {sexOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="large"
                    onClick={() => {
                      console.log("Sexo selecionado:", option.value);
                      petForm.setFieldsValue({ sex: option.value });
                      setTimeout(() => {
                        setPetStep("castrated");
                      }, 100);
                    }}
                    style={{
                      height: 100,
                      width: 200,
                      fontSize: 24,
                      fontWeight: "bold",
                      borderRadius: 15,
                    }}
                  >
                    <span style={{ marginRight: 10, display: "inline-flex", alignItems: "center" }}>{option.icon}</span>
                    {option.label}
                  </Button>
                ))}
              </Space>
            </Space>
          );

        case "castrated":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  O pet é castrado?
                </span>
              </Title>
              <Form.Item name="castrated" initialValue={false} style={{ marginBottom: 0 }}>
                <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                  <Button
                    size="large"
                    type={petForm.getFieldValue("castrated") === true ? "primary" : "default"}
                    onClick={() => {
                      petForm.setFieldsValue({ castrated: true });
                      setTimeout(() => {
                        handlePetStepNext();
                      }, 100);
                    }}
                    style={{
                      height: 100,
                      width: 200,
                      fontSize: 24,
                      fontWeight: "bold",
                      borderRadius: 15,
                    }}
                  >
                    <CheckOutlined style={{ marginRight: 8 }} />
                    Sim
                  </Button>
                  <Button
                    size="large"
                    type={petForm.getFieldValue("castrated") === false ? "primary" : "default"}
                    onClick={() => {
                      petForm.setFieldsValue({ castrated: false });
                      setTimeout(() => {
                        handlePetStepNext();
                      }, 100);
                    }}
                    style={{
                      height: 100,
                      width: 200,
                      fontSize: 24,
                      fontWeight: "bold",
                      borderRadius: 15,
                    }}
                  >
                    <CloseOutlined style={{ marginRight: 8 }} />
                    Não
                  </Button>
                </Space>
              </Form.Item>
            </Space>
          );

        case "breed":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Qual a raça?
                  <TagOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              {!showBreedInput ? (
                <>
                  <Space wrap style={{ justifyContent: "center", width: "100%", marginBottom: 20 }}>
                    {commonBreeds.slice(0, 5).map((breed) => (
                      <Button
                        key={breed}
                        size="large"
                        onClick={() => {
                          petForm.setFieldsValue({ breed });
                          handlePetStepNext();
                        }}
                        style={{
                          height: 60,
                          fontSize: 18,
                          borderRadius: 10,
                        }}
                      >
                        {breed}
                      </Button>
                    ))}
                  </Space>
                  <Space wrap style={{ justifyContent: "center", width: "100%", marginBottom: 20 }}>
                    {commonBreeds.slice(5, 10).map((breed) => (
                      <Button
                        key={breed}
                        size="large"
                        onClick={() => {
                          petForm.setFieldsValue({ breed });
                          handlePetStepNext();
                        }}
                        style={{
                          height: 60,
                          fontSize: 18,
                          borderRadius: 10,
                        }}
                      >
                        {breed}
                      </Button>
                    ))}
                  </Space>
                  <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                    {commonBreeds.slice(10).map((breed) => (
                      <Button
                        key={breed}
                        size="large"
                        onClick={() => {
                          petForm.setFieldsValue({ breed });
                          handlePetStepNext();
                        }}
                        style={{
                          height: 60,
                          fontSize: 18,
                          borderRadius: 10,
                        }}
                      >
                        {breed}
                      </Button>
                    ))}
                  </Space>
                  <Button
                    size="large"
                    onClick={() => setShowBreedInput(true)}
                    style={{
                      height: 60,
                      fontSize: 20,
                      marginTop: 20,
                    }}
                  >
                    Outros...
                    <EditOutlined style={{ marginLeft: 8 }} />
                  </Button>
                </>
              ) : (
                <>
                  <Form.Item name="breed" style={{ marginBottom: 20 }}>
                    <Input
                      size="large"
                      placeholder="Digite a raça..."
                      style={{ fontSize: 24, height: 60, textAlign: "center" }}
                      autoFocus
                      onPressEnter={handlePetStepNext}
                    />
                  </Form.Item>
                  <Button size="large" onClick={() => setShowBreedInput(false)}>
                    Voltar para opções
                  </Button>
                </>
              )}
            </Space>
          );

        case "color":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Qual a cor?
                  <BgColorsOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              {!showColorInput ? (
                <>
                  <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                    {commonColors.map((color) => (
                      <Button
                        key={color}
                        size="large"
                        onClick={() => {
                          petForm.setFieldsValue({ color });
                          handlePetStepNext();
                        }}
                        style={{
                          height: 70,
                          fontSize: 18,
                          borderRadius: 10,
                          minWidth: 120,
                        }}
                      >
                        {color}
                      </Button>
                    ))}
                  </Space>
                  <Button
                    size="large"
                    onClick={() => setShowColorInput(true)}
                    style={{
                      height: 60,
                      fontSize: 20,
                      marginTop: 20,
                    }}
                  >
                    Outros...
                    <EditOutlined style={{ marginLeft: 8 }} />
                  </Button>
                </>
              ) : (
                <>
                  <Form.Item name="color" style={{ marginBottom: 20 }}>
                    <Input
                      size="large"
                      placeholder="Digite a cor..."
                      style={{ fontSize: 24, height: 60, textAlign: "center" }}
                      autoFocus
                      onPressEnter={handlePetStepNext}
                    />
                  </Form.Item>
                  <Button size="large" onClick={() => setShowColorInput(false)}>
                    Voltar para opções
                  </Button>
                </>
              )}
            </Space>
          );

        case "weight":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Qual o peso?
                  <FaWeight style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Form.Item name="weight_kg" style={{ marginBottom: 0 }}>
                <InputNumber
                  size="large"
                  min={0}
                  step={0.1}
                  placeholder="Ex: 12.5"
                  style={{ fontSize: 24, height: 60, width: 300 }}
                  autoFocus
                  onPressEnter={handlePetStepNext}
                />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 18 }}>
                (em quilogramas)
              </Text>
            </Space>
          );

        case "age":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Data de nascimento ou idade?
                  <CalendarOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              {!ageType ? (
                <Space>
                  <Button
                    size="large"
                    onClick={() => setAgeType("birthdate")}
                    style={{
                      height: 80,
                      width: 250,
                      fontSize: 20,
                      borderRadius: 15,
                    }}
                  >
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Data de Nascimento
                  </Button>
                  <Button
                    size="large"
                    onClick={() => setAgeType("age")}
                    style={{
                      height: 80,
                      width: 250,
                      fontSize: 20,
                      borderRadius: 15,
                    }}
                  >
                    <FaBirthdayCake style={{ marginRight: 8, fontSize: 18 }} />
                    Idade Aproximada
                  </Button>
                </Space>
              ) : ageType === "birthdate" ? (
                <>
                  <Form.Item name="birthdate" style={{ marginBottom: 20 }}>
                    <DatePicker
                      size="large"
                      style={{ fontSize: 24, height: 60, width: 300 }}
                      format="DD/MM/YYYY"
                      autoFocus
                    />
                  </Form.Item>
                  <Form.Item name="birthdate_estimated" valuePropName="checked" initialValue={false}>
                    <Space>
                      <Switch size="default" />
                      <Text style={{ fontSize: 18 }}>Data estimada?</Text>
                    </Space>
                  </Form.Item>
                  <Button size="large" onClick={() => setAgeType(null)}>
                    Voltar
                  </Button>
                </>
              ) : (
                <>
                  <Space orientation="vertical" size="middle">
                    <Form.Item name="age_years" label={<Text style={{ fontSize: 20 }}>Anos</Text>}>
                      <InputNumber
                        size="large"
                        min={0}
                        max={30}
                        placeholder="0"
                        style={{ fontSize: 24, height: 60, width: 200 }}
                        autoFocus
                      />
                    </Form.Item>
                    <Form.Item name="age_months" label={<Text style={{ fontSize: 20 }}>Meses</Text>}>
                      <InputNumber
                        size="large"
                        min={0}
                        max={11}
                        placeholder="0"
                        style={{ fontSize: 24, height: 60, width: 200 }}
                      />
                    </Form.Item>
                  </Space>
                  <Button size="large" onClick={() => setAgeType(null)}>
                    Voltar
                  </Button>
                </>
              )}
            </Space>
          );

        case "photo":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Adicionar foto?
                  <PictureOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Form.Item name="photo_url" style={{ marginBottom: 0 }}>
                <ImageCropUpload
                  value={petForm.getFieldValue("photo_url")}
                  onChange={(base64) => {
                    petForm.setFieldsValue({ photo_url: base64 || undefined });
                  }}
                  onRemove={() => {
                    petForm.setFieldsValue({ photo_url: undefined });
                  }}
                />
              </Form.Item>
            </Space>
          );

        case "parents":
          const availableParents = pets ?? [];
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                Quem são os pais?
              </Title>
              {availableParents.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 18 }}>
                  Cadastre outros pets primeiro para poder definir parentesco
                </Text>
              ) : (
                <>
                  <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                    <div>
                      <Text strong style={{ fontSize: 20, display: "block", marginBottom: 10 }}>
                        Mãe (só fêmeas)
                      </Text>
                      <Form.Item name="mother_id" style={{ marginBottom: 0 }}>
                        <Select
                          size="large"
                          placeholder="Selecione a mãe (opcional)"
                          allowClear
                          style={{ fontSize: 18, minWidth: 300 }}
                          options={filterMotherCandidates(availableParents, {
                            fatherId: petForm.getFieldValue("father_id"),
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
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 20, display: "block", marginBottom: 10 }}>
                        Pai (só machos)
                      </Text>
                      <Form.Item name="father_id" style={{ marginBottom: 0 }}>
                        <Select
                          size="large"
                          placeholder="Selecione o pai (opcional)"
                          allowClear
                          style={{ fontSize: 18, minWidth: 300 }}
                          options={filterFatherCandidates(availableParents, {
                            motherId: petForm.getFieldValue("mother_id"),
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
                    </div>
                  </Space>
                </>
              )}
            </Space>
          );

        case "deceased":
          const isDeceased = petForm.getFieldValue("deceased") === true;
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              {!isDeceased ? (
                <>
                  <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                    O pet já faleceu?
                  </Title>
                  <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                    <Button
                      size="large"
                      onClick={() => {
                        petForm.setFieldsValue({ deceased: true });
                      }}
                      style={{
                        height: 80,
                        minWidth: 200,
                        fontSize: 22,
                        fontWeight: "bold",
                        borderRadius: 15,
                      }}
                    >
                      <CloseCircleOutlined style={{ marginRight: 8 }} />
                      Sim
                    </Button>
                    <Button
                      size="large"
                      type="primary"
                      onClick={() => {
                        petForm.setFieldsValue({ deceased: false, death_date: null });
                        setTimeout(() => {
                          handlePetStepNext();
                        }, 100);
                      }}
                      style={{
                        height: 80,
                        minWidth: 200,
                        fontSize: 22,
                        fontWeight: "bold",
                        borderRadius: 15,
                      }}
                    >
                      Não
                    </Button>
                  </Space>
                </>
              ) : (
                <>
                  <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      Data de falecimento
                      <CalendarOutlined style={{ fontSize: 24 }} />
                    </span>
                  </Title>
                  <Form.Item
                    name="death_date"
                    rules={[{ required: true, message: "Informe a data de falecimento" }]}
                    style={{ marginBottom: 20 }}
                  >
                    <DatePicker
                      size="large"
                      style={{ width: "100%", fontSize: 20, height: 60 }}
                      format="DD/MM/YYYY"
                      placeholder="Selecione a data..."
                      autoFocus
                    />
                  </Form.Item>
                  <Button
                    size="large"
                    type="text"
                    onClick={() => {
                      petForm.setFieldsValue({ deceased: false, death_date: null });
                    }}
                    style={{ fontSize: 16 }}
                  >
                    Voltar
                  </Button>
                </>
              )}
            </Space>
          );

        case "notes":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Observações adicionais?
                  <EditOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Form.Item name="notes" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  rows={6}
                  placeholder="Alergias, cuidados especiais, etc..."
                  style={{ fontSize: 20 }}
                  autoFocus
                />
              </Form.Item>
            </Space>
          );

        default:
          return null;
      }
    };

    return (
      <Card style={{ borderRadius: 20, padding: 40 }}>
        <Form form={petForm} layout="vertical" initialValues={{ birthdate_estimated: false, castrated: false, deceased: false }}>
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setAction(null);
                  setPetStep("name");
                  setShowBreedInput(false);
                  setShowColorInput(false);
                  setAgeType(null);
                }}
                style={{ fontSize: 18 }}
              >
                Voltar
              </Button>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => {
                  setAction(null);
                  setPetStep("name");
                  petForm.resetFields();
                }}
                style={{ fontSize: 18 }}
              >
                Cancelar
              </Button>
            </div>

            <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {renderPetStep()}
            </div>

            <Space style={{ width: "100%", justifyContent: "center", gap: 20 }}>
              {petStep !== "name" && (
                <Button
                  size="large"
                  onClick={() => {
                    const steps: PetWizardStep[] = [
                      "name",
                      "species",
                      "sex",
                      "castrated",
                      "breed",
                      "color",
                      "weight",
                      "age",
                      "photo",
                      "parents",
                      "deceased",
                      "notes",
                    ];
                    const currentIndex = steps.indexOf(petStep);
                    if (currentIndex > 0) {
                      setPetStep(steps[currentIndex - 1]);
                      if (petStep === "breed") setShowBreedInput(false);
                      if (petStep === "color") setShowColorInput(false);
                      if (petStep === "age") setAgeType(null);
                    }
                  }}
                  icon={<ArrowLeftOutlined />}
                  style={{ height: 50, fontSize: 18 }}
                >
                  Anterior
                </Button>
              )}
              <Button
                type="primary"
                size="large"
                onClick={async () => {
                  if (petStep === "notes") {
                    // Capturar todos os valores do formulário
                    try {
                      // Primeiro, validar campos obrigatórios
                      await petForm.validateFields(["name", "species", "sex"]);
                      
                      // Depois, pegar todos os valores
                      const allValues = petForm.getFieldsValue(true); // true = incluir valores undefined
                      console.log("Todos os valores do formulário:", allValues);
                      
                      // Garantir que os campos obrigatórios existam
                      if (!allValues.name || typeof allValues.name !== "string" || !allValues.name.trim()) {
                        message.warning("Por favor, informe o nome do pet");
                        setPetStep("name");
                        return;
                      }
                      if (!allValues.species) {
                        message.warning("Por favor, escolha a espécie");
                        setPetStep("species");
                        return;
                      }
                      if (!allValues.sex) {
                        message.warning("Por favor, escolha o sexo");
                        setPetStep("sex");
                        return;
                      }
                      
                      // Submeter
                      petMutation.mutate(allValues as PetFormValues);
                    } catch (error) {
                      console.error("Erro na validação:", error);
                      // Se a validação falhar, mostrar mensagem
                      const errorInfo = error as { errorFields?: Array<{ name: string[] }> };
                      if (errorInfo.errorFields) {
                        const firstError = errorInfo.errorFields[0];
                        if (firstError.name.includes("name")) {
                          setPetStep("name");
                          message.warning("Por favor, informe o nome do pet");
                        } else if (firstError.name.includes("species")) {
                          setPetStep("species");
                          message.warning("Por favor, escolha a espécie");
                        } else if (firstError.name.includes("sex")) {
                          setPetStep("sex");
                          message.warning("Por favor, escolha o sexo");
                        }
                      }
                    }
                  } else {
                    handlePetStepNext();
                  }
                }}
                icon={petStep === "notes" ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
                loading={petMutation.isPending}
                style={{ height: 50, fontSize: 18, minWidth: 150 }}
              >
                {petStep === "notes" ? "Finalizar" : "OK"}
              </Button>
              {(petStep === "castrated" ||
                petStep === "breed" ||
                petStep === "color" ||
                petStep === "weight" ||
                petStep === "age" ||
                petStep === "photo" ||
                petStep === "parents" ||
                petStep === "deceased" ||
                petStep === "notes") && (
                <Button
                  size="large"
                  onClick={handlePetStepSkip}
                  style={{ height: 50, fontSize: 18 }}
                >
                  Pular
                </Button>
              )}
            </Space>
          </Space>
        </Form>
      </Card>
    );
  }

  // Wizard de tratamento - interface passo a passo
  if (action === "treatment") {
    const handleTreatmentStepNext = () => {
      const currentValues = treatmentForm.getFieldsValue();

      switch (treatmentStep) {
        case "pet":
          if (!currentValues.pet_id) {
            message.warning("Por favor, selecione o pet");
            return;
          }
          setTreatmentStep("kind");
          break;
        case "kind":
          if (!currentValues.kind) {
            message.warning("Por favor, escolha o tipo de tratamento");
            return;
          }
          setTreatmentStep("status");
          break;
        case "status":
          if (!currentValues.status) {
            message.warning("Por favor, escolha o status");
            return;
          }
          setTreatmentStep("description");
          break;
        case "description":
          setTreatmentStep("dates");
          break;
        case "dates":
          setTreatmentStep("frequency");
          break;
        case "frequency":
          setTreatmentStep("notes");
          break;
        case "notes":
          // Finalizar
          treatmentForm.validateFields().then((values) => {
            treatmentMutation.mutate(values);
          });
          break;
      }
    };

    const renderTreatmentStep = () => {
      switch (treatmentStep) {
        case "pet":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                Para qual pet?
              </Title>
              <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                {(pets ?? []).map((pet) => (
                  <Button
                    key={pet.id}
                    size="large"
                    onClick={() => {
                      treatmentForm.setFieldsValue({ pet_id: pet.id });
                      setTimeout(() => {
                        setTreatmentStep("kind");
                      }, 100);
                    }}
                    style={{
                      height: 80,
                      minWidth: 200,
                      fontSize: 22,
                      fontWeight: "bold",
                      borderRadius: 15,
                    }}
                  >
                    <FaDog style={{ marginRight: 8 }} />
                    {pet.name}
                  </Button>
                ))}
              </Space>
            </Space>
          );

        case "kind":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Qual o tipo?
                  <FaHospital style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                {kindOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="large"
                    onClick={() => {
                      treatmentForm.setFieldsValue({ kind: option.value });
                      setTimeout(() => {
                        setTreatmentStep("status");
                      }, 100);
                    }}
                    style={{
                      height: 100,
                      width: 180,
                      fontSize: 20,
                      fontWeight: "bold",
                      borderRadius: 15,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 32 }}>{option.icon}</div>
                    <div>{option.label}</div>
                  </Button>
                ))}
              </Space>
            </Space>
          );

        case "status":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Qual o status?
                  <FileTextOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Space wrap style={{ justifyContent: "center", width: "100%" }}>
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="large"
                    onClick={() => {
                      treatmentForm.setFieldsValue({ status: option.value });
                      setTimeout(() => {
                        setTreatmentStep("description");
                      }, 100);
                    }}
                    style={{
                      height: 80,
                      width: 200,
                      fontSize: 20,
                      fontWeight: "bold",
                      borderRadius: 15,
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Space>
            </Space>
          );

        case "description":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Alguma descrição?
                  <EditOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Form.Item name="description" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  rows={6}
                  placeholder="Detalhes do cuidado, fabricante, dose, etc..."
                  style={{ fontSize: 20 }}
                  autoFocus
                />
              </Form.Item>
            </Space>
          );

        case "dates":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Datas importantes?
                  <CalendarOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              {!dateType ? (
                <Space>
                  <Button
                    size="large"
                    onClick={() => setDateType("start")}
                    style={{
                      height: 80,
                      width: 250,
                      fontSize: 20,
                      borderRadius: 15,
                    }}
                  >
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Data de Início
                  </Button>
                  <Button
                    size="large"
                    onClick={() => setDateType("due")}
                    style={{
                      height: 80,
                      width: 250,
                      fontSize: 20,
                      borderRadius: 15,
                    }}
                  >
                    ⏰ Próximo Vencimento
                  </Button>
                  <Button
                    size="large"
                    onClick={() => setDateType("both")}
                    style={{
                      height: 80,
                      width: 250,
                      fontSize: 20,
                      borderRadius: 15,
                    }}
                  >
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Ambas
                  </Button>
                </Space>
              ) : dateType === "start" ? (
                <>
                  <Form.Item name="start_date" style={{ marginBottom: 20 }}>
                    <DatePicker
                      size="large"
                      style={{ fontSize: 24, height: 60, width: 300 }}
                      format="DD/MM/YYYY"
                      autoFocus
                    />
                  </Form.Item>
                  <Button size="large" onClick={() => setDateType(null)}>
                    Voltar
                  </Button>
                </>
              ) : dateType === "due" ? (
                <>
                  <Form.Item name="due_date" style={{ marginBottom: 20 }}>
                    <DatePicker
                      size="large"
                      style={{ fontSize: 24, height: 60, width: 300 }}
                      format="DD/MM/YYYY"
                      autoFocus
                    />
                  </Form.Item>
                  <Button size="large" onClick={() => setDateType(null)}>
                    Voltar
                  </Button>
                </>
              ) : (
                <>
                  <Space orientation="vertical" size="middle">
                    <Form.Item name="start_date" label={<Text style={{ fontSize: 20 }}>Data de Início</Text>}>
                      <DatePicker
                        size="large"
                        style={{ fontSize: 24, height: 60, width: 300 }}
                        format="DD/MM/YYYY"
                        autoFocus
                      />
                    </Form.Item>
                    <Form.Item name="due_date" label={<Text style={{ fontSize: 20 }}>Próximo Vencimento</Text>}>
                      <DatePicker
                        size="large"
                        style={{ fontSize: 24, height: 60, width: 300 }}
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Space>
                  <Button size="large" onClick={() => setDateType(null)}>
                    Voltar
                  </Button>
                </>
              )}
            </Space>
          );

        case "frequency":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Frequência (dias)?
                  <ReloadOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Form.Item name="frequency_days" style={{ marginBottom: 0 }}>
                <InputNumber
                  size="large"
                  min={0}
                  placeholder="Ex: 30"
                  style={{ fontSize: 24, height: 60, width: 300 }}
                  autoFocus
                  onPressEnter={handleTreatmentStepNext}
                />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 18 }}>
                (deixe em branco se não houver frequência)
              </Text>
            </Space>
          );

        case "notes":
          return (
            <Space orientation="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
              <Title level={2} style={{ fontSize: 36, marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Observações adicionais?
                  <FileTextOutlined style={{ fontSize: 24 }} />
                </span>
              </Title>
              <Form.Item name="notes" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  rows={6}
                  placeholder="Observações adicionais..."
                  style={{ fontSize: 20 }}
                  autoFocus
                />
              </Form.Item>
            </Space>
          );

        default:
          return null;
      }
    };

    return (
      <Card style={{ borderRadius: 20, padding: 40 }}>
        <Form
          form={treatmentForm}
          layout="vertical"
          initialValues={{
            status: "scheduled",
            kind: "general_medication",
          }}
        >
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setAction(null);
                  setTreatmentStep("pet");
                  setDateType(null);
                }}
                style={{ fontSize: 18 }}
              >
                Voltar
              </Button>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => {
                  setAction(null);
                  setTreatmentStep("pet");
                  treatmentForm.resetFields();
                }}
                style={{ fontSize: 18 }}
              >
                Cancelar
              </Button>
            </div>

            <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {renderTreatmentStep()}
            </div>

            <Space style={{ width: "100%", justifyContent: "center", gap: 20 }}>
              {treatmentStep !== "pet" && (
                <Button
                  size="large"
                  onClick={() => {
                    const steps: TreatmentWizardStep[] = [
                      "pet",
                      "kind",
                      "status",
                      "description",
                      "dates",
                      "frequency",
                      "notes",
                    ];
                    const currentIndex = steps.indexOf(treatmentStep);
                    if (currentIndex > 0) {
                      setTreatmentStep(steps[currentIndex - 1]);
                      if (treatmentStep === "dates") setDateType(null);
                    }
                  }}
                  icon={<ArrowLeftOutlined />}
                  style={{ height: 50, fontSize: 18 }}
                >
                  Anterior
                </Button>
              )}
              <Button
                type="primary"
                size="large"
                onClick={async () => {
                  if (treatmentStep === "notes") {
                    try {
                      await treatmentForm.validateFields(["pet_id", "kind", "status"]);
                      const allValues = treatmentForm.getFieldsValue(true);
                      
                      // Se não tiver título, usar o tipo como título
                      if (!allValues.title || !allValues.title.trim()) {
                        const kindLabel = kindOptions.find((k) => k.value === allValues.kind)?.label || "Tratamento";
                        allValues.title = kindLabel.replace(/[^\w\s]/g, "").trim(); // Remove emojis
                      }
                      
                      console.log("Valores do tratamento:", allValues);
                      treatmentMutation.mutate(allValues as TreatmentFormValues);
                    } catch (error) {
                      console.error("Erro na validação:", error);
                      const errorInfo = error as { errorFields?: Array<{ name: string[] }> };
                      if (errorInfo.errorFields) {
                        const firstError = errorInfo.errorFields[0];
                        if (firstError.name.includes("pet_id")) {
                          setTreatmentStep("pet");
                          message.warning("Por favor, selecione o pet");
                        } else if (firstError.name.includes("kind")) {
                          setTreatmentStep("kind");
                          message.warning("Por favor, escolha o tipo");
                        } else if (firstError.name.includes("status")) {
                          setTreatmentStep("status");
                          message.warning("Por favor, escolha o status");
                        }
                      }
                    }
                  } else {
                    handleTreatmentStepNext();
                  }
                }}
                icon={treatmentStep === "notes" ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
                loading={treatmentMutation.isPending}
                style={{ height: 50, fontSize: 18, minWidth: 150 }}
              >
                {treatmentStep === "notes" ? "Finalizar" : "OK"}
              </Button>
              {(treatmentStep === "description" ||
                treatmentStep === "dates" ||
                treatmentStep === "frequency" ||
                treatmentStep === "notes") && (
                <Button size="large" onClick={handleTreatmentStepNext} style={{ height: 50, fontSize: 18 }}>
                  Pular
                </Button>
              )}
            </Space>
          </Space>
        </Form>
      </Card>
    );
  }

  return null;
}
