"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";

import { PhotoScanHero } from "@/components/landing/photo-scan-hero";
import { PastelShell } from "@/components/landing/pastel-shell";
import { CardStack } from "@/components/wizard/card-stack";
import { draftToScanBadges, getGuestPet, saveGuestPet, speciesEmoji } from "@/lib/guest-pet";
import { analyzePetPhoto } from "@/lib/pet-photo-ai";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

import landing from "@/app/landing.module.css";
import styles from "./comecar.module.css";

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
  { label: "?", value: "unknown" },
];

export default function ComecarPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", margin: "40vh auto" }} />}>
      <ComecarWizard />
    </Suspense>
  );
}

function ComecarWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
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
  const [age, setAge] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      const qs = searchParams.toString();
      router.replace(`/pets/create${qs ? `?${qs}` : ""}`);
    }
  }, [authLoading, user, router, searchParams]);

  useEffect(() => {
    const existing = getGuestPet();
    if (!existing) return;
    setName(existing.name);
    setPhoto(existing.photo);
    setSpecies(existing.species);
    setSex(existing.sex);
    setBreed(existing.breed ?? "");
    setColor(existing.color ?? "");
    setAge(existing.estimatedAgeYears);
    setStep(2);
  }, []);

  useEffect(() => {
    if (step !== 0 || autoOpened.current || (!wantCamera && !wantUpload) || getGuestPet()) return;
    autoOpened.current = true;
    const ref = wantCamera ? cameraRef : uploadRef;
    ref.current?.click();
  }, [step, wantCamera, wantUpload]);

  const runAnalysis = async (image: string) => {
    setAiLoading(true);
    const analysis = await analyzePetPhoto(image);
    setAiLoading(false);

    if (analysis) {
      if (analysis.species) setSpecies(analysis.species);
      if (analysis.sex) setSex(analysis.sex);
      if (analysis.breed) setBreed(analysis.breed);
      if (analysis.color) setColor(analysis.color);
      if (analysis.estimatedAgeYears != null) setAge(analysis.estimatedAgeYears);
    }
  };

  const onPickPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      setStep(1);
      void runAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const goToConfirm = () => {
    if (!name.trim()) return;
    setStep(2);
  };

  const finishGuest = () => {
    if (!name.trim()) return;

    saveGuestPet({
      name: name.trim(),
      photo,
      species,
      sex,
      breed: breed.trim() || null,
      color: color.trim() || null,
      estimatedAgeYears: age,
      createdAt: new Date().toISOString(),
    });

    router.push("/register?tipo=cuidador&next=" + encodeURIComponent("/dashboard"));
  };

  const badges = draftToScanBadges({ breed, color, estimatedAgeYears: age });

  if (authLoading || user) {
    return (
      <div className={landing.page} style={{ display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <PastelShell backHref="/" backLabel="Início" fixed>
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

      <div className={styles.wizard}>
        <CardStack step={step}>
          {/* Carta 0 — Foto */}
          <div className={styles.cardBody}>
            <h1 className={styles.cardTitle}>📸 Foto do pet</h1>
            <p className={styles.cardSub}>A IA sugere raça, cor e idade.</p>
            <div className={styles.cardVisual}>
              <PhotoScanHero scanning badges={badges} compact />
            </div>
            <div className={styles.cardActions}>
              <button type="button" className={styles.primaryBtn} onClick={() => cameraRef.current?.click()}>
                📸 Tirar foto
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={() => uploadRef.current?.click()}>
                🖼️ Enviar foto
              </button>
              <button type="button" className={styles.textBtn} onClick={() => setStep(1)}>
                Sem foto por agora
              </button>
            </div>
          </div>

          {/* Carta 1 — Nome */}
          <div className={styles.cardBody}>
            <h1 className={styles.cardTitle}>Qual o nome?</h1>
            <p className={styles.cardSub}>Só isso para continuar.</p>
            {photo && (
              <div className={styles.cardVisual}>
                <PhotoScanHero photoUrl={photo} scanning={aiLoading} badges={badges} compact />
              </div>
            )}
            <input
              className={styles.bigInput}
              placeholder="Ex: Luna"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && goToConfirm()}
              autoFocus
            />
            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!name.trim()}
                onClick={goToConfirm}
              >
                Continuar
              </button>
              <button type="button" className={styles.textBtn} onClick={() => setStep(0)}>
                Voltar
              </button>
            </div>
          </div>

          {/* Carta 2 — Confirma */}
          <div className={styles.cardBody}>
            <h1 className={styles.cardTitle}>{aiLoading ? "IA analisando..." : `Sobre ${name || "seu pet"}`}</h1>
            <p className={styles.cardSub}>
              {aiLoading ? "Olhando a foto..." : "Confira e ajuste se precisar."}
            </p>
            <div className={styles.cardVisual}>
              <PhotoScanHero
                photoUrl={photo}
                emoji={speciesEmoji[species]}
                scanning={aiLoading}
                badges={badges}
                compact
              />
            </div>
            {aiLoading ? (
              <div className={styles.loadingBox}>
                <Spin />
              </div>
            ) : (
              <div className={styles.compactForm}>
                <div className={styles.chipRow}>
                  {SPECIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`${styles.chip} ${species === s.value ? styles.chipSelected : ""}`}
                      onClick={() => setSpecies(s.value)}
                    >
                      {s.emoji}
                    </button>
                  ))}
                </div>
                <div className={styles.inlineFields}>
                  <input
                    className={styles.miniInput}
                    placeholder="Raça"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                  />
                  <input
                    className={styles.miniInput}
                    placeholder="Cor"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div className={styles.chipRow}>
                  {SEX_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`${styles.chip} ${sex === s.value ? styles.chipSelected : ""}`}
                      onClick={() => setSex(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!name.trim() || aiLoading}
                onClick={finishGuest}
              >
                Salvar e criar conta
              </button>
              <button type="button" className={styles.textBtn} onClick={() => setStep(1)}>
                Voltar
              </button>
            </div>
          </div>
        </CardStack>
      </div>
    </PastelShell>
  );
}
