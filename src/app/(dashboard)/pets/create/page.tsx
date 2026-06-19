"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Input, Spin } from "antd";
import { CameraOutlined } from "@ant-design/icons";

import { StepShell, stepStyles } from "@/components/wizard/step-shell";
import { analyzePetPhoto } from "@/lib/pet-photo-ai";
import { createPet, invalidatePetQueries } from "@/lib/pets/create-pet";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Species = Database["public"]["Tables"]["pets"]["Row"]["species"];
type Sex = Database["public"]["Tables"]["pets"]["Row"]["sex"];

const SPECIES: { label: string; value: Species; emoji: string }[] = [
  { label: "Cachorro", value: "dog", emoji: "🐕" },
  { label: "Gato", value: "cat", emoji: "🐈" },
  { label: "Ave", value: "bird", emoji: "🐦" },
  { label: "Pequeno", value: "small_pet", emoji: "🐹" },
  { label: "Outro", value: "other", emoji: "🐾" },
];

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Fêmea", value: "female" },
  { label: "Macho", value: "male" },
  { label: "Não sei", value: "unknown" },
];

export default function PetCreatePage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", margin: "40vh auto" }} />}>
      <PetCreateWizard />
    </Suspense>
  );
}

function PetCreateWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { message } = App.useApp();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const autoOpened = useRef(false);
  const wantCamera = searchParams.get("camera") === "1";
  const wantUpload = searchParams.get("upload") === "1";

  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [sex, setSex] = useState<Sex>("unknown");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  useEffect(() => {
    if (step !== 0 || autoOpened.current || (!wantCamera && !wantUpload)) return;
    autoOpened.current = true;
    const ref = wantCamera ? cameraRef : uploadRef;
    ref.current?.click();
  }, [step, wantCamera, wantUpload]);

  const onPickPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setStep(1);
    };
    reader.readAsDataURL(file);
  };

  const runAiAndNext = async () => {
    if (!name.trim()) {
      message.warning("Informe o nome do pet.");
      return;
    }
    setStep(2);
    if (!photo || !user?.id) return;

    setAiLoading(true);
    const analysis = await analyzePetPhoto(photo, user.id);
    setAiLoading(false);

    if (analysis) {
      if (analysis.species) setSpecies(analysis.species);
      if (analysis.sex) setSex(analysis.sex);
      if (analysis.breed) setBreed(analysis.breed);
      if (analysis.color) setColor(analysis.color);
      message.success("IA sugeriu alguns dados — confira ou pule.");
    }
  };

  const savePet = async (skipDetails = false) => {
    if (!user?.id || !name.trim()) return;
    setSaving(true);
    try {
      const pet = await createPet({
        ownerId: user.id,
        name,
        species: skipDetails ? "dog" : species,
        sex: skipDetails ? "unknown" : sex,
        breed: skipDetails ? null : breed || null,
        color: skipDetails ? null : color || null,
        photoUrl: photo,
        notes: null,
      });
      invalidatePetQueries(queryClient, user.id);
      message.success(`${name} cadastrado! 🎉`);
      router.push("/dashboard");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (step === 0) {
    return (
      <StepShell
        step={0}
        totalSteps={totalSteps}
        emoji="📸"
        title="Comece com uma foto"
        subtitle="Tire ou escolha uma foto do seu pet. A gente usa ela na ficha e na IA."
        actions={
          <>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickPhoto(f);
              }}
            />
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickPhoto(f);
              }}
            />
            <Button
              type="primary"
              block
              className={stepStyles.primaryBtn}
              icon={<CameraOutlined />}
              onClick={() => cameraRef.current?.click()}
            >
              Tirar foto
            </Button>
            <Button
              block
              className={stepStyles.secondaryBtn}
              onClick={() => uploadRef.current?.click()}
            >
              Enviar da galeria
            </Button>
            <Button type="text" block className={stepStyles.skipBtn} onClick={() => setStep(1)}>
              Sem foto por agora
            </Button>
          </>
        }
      >
        <div className={stepStyles.photoZone}>
          <button
            type="button"
            className={stepStyles.photoCircle}
            onClick={() => cameraRef.current?.click()}
          >
            <span className={stepStyles.photoPlaceholder}>📷</span>
          </button>
        </div>
      </StepShell>
    );
  }

  if (step === 1) {
    return (
      <StepShell
        step={1}
        totalSteps={totalSteps}
        emoji="💛"
        title="Qual o nome dele(a)?"
        subtitle="Só isso já basta para começar."
        actions={
          <>
            <Button
              type="primary"
              block
              className={stepStyles.primaryBtn}
              disabled={!name.trim()}
              onClick={() => void runAiAndNext()}
            >
              Continuar
            </Button>
            <Button type="text" block className={stepStyles.skipBtn} onClick={() => router.back()}>
              Voltar
            </Button>
          </>
        }
      >
        {photo && (
          <div className={stepStyles.photoZone}>
            <div className={`${stepStyles.photoCircle} ${stepStyles.photoCircleHasImage}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Preview" className={stepStyles.photoPreview} />
            </div>
          </div>
        )}
        <Input
          className={stepStyles.bigInput}
          placeholder="Ex: Luna"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={() => name.trim() && void runAiAndNext()}
          autoFocus
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      step={2}
      totalSteps={totalSteps}
      emoji="✨"
      title={aiLoading ? "A IA está olhando..." : `Sobre ${name}`}
      subtitle="Sugestões opcionais — pode deixar pra depois."
      actions={
        <>
          <Button
            type="primary"
            block
            className={stepStyles.primaryBtn}
            loading={saving}
            onClick={() => void savePet(false)}
          >
            Cadastrar {name}
          </Button>
          <Button
            block
            className={stepStyles.secondaryBtn}
            loading={saving}
            onClick={() => void savePet(true)}
          >
            Deixar detalhes pra depois
          </Button>
        </>
      }
    >
      {aiLoading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <span className={stepStyles.aiBadge}>✨ Sugestões da IA</span>
          <div className={stepStyles.suggestionCard}>
            <p className={stepStyles.suggestionLabel}>Espécie</p>
            <div className={stepStyles.chipRow}>
              {SPECIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`${stepStyles.chip} ${species === s.value ? stepStyles.chipSelected : ""}`}
                  onClick={() => setSpecies(s.value)}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className={stepStyles.suggestionCard}>
            <p className={stepStyles.suggestionLabel}>Sexo</p>
            <div className={stepStyles.chipRow}>
              {SEX_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`${stepStyles.chip} ${sex === s.value ? stepStyles.chipSelected : ""}`}
                  onClick={() => setSex(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            className={stepStyles.bigInput}
            placeholder="Raça (opcional)"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            style={{ fontSize: "1rem", height: 48 }}
          />
          <Input
            className={stepStyles.bigInput}
            placeholder="Cor (opcional)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ fontSize: "1rem", height: 48 }}
          />
        </>
      )}
    </StepShell>
  );
}
