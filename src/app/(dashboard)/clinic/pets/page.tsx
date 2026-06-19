"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";

import ui from "@/components/clinic/clinic-ui.module.css";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import { supabaseClient } from "@/lib/supabase/client";

type GrantedPet = {
  grant_id: string;
  pet_id: string;
  pet_name: string;
  species: string;
  expires_at: string | null;
};

const speciesEmoji: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  small_pet: "🐹",
  other: "🐾",
};

const fetchGrantedPets = async (clinicId: string) => {
  const { data, error } = await supabaseClient
    .from("pet_access_grants")
    .select("id, pet_id, expires_at, pets(name, species)")
    .eq("clinic_id", clinicId)
    .is("revoked_at", null);
  if (error) throw error;

  type GrantRow = {
    id: string;
    pet_id: string;
    expires_at: string | null;
    pets: { name: string; species: string } | null;
  };

  return ((data ?? []) as GrantRow[]).map((row) => ({
    grant_id: row.id,
    pet_id: row.pet_id,
    pet_name: row.pets?.name ?? "—",
    species: row.pets?.species ?? "other",
    expires_at: row.expires_at,
  }));
};

export default function ClinicPetsPage() {
  const { data: membership, isLoading: membershipLoading } = useClinicMembership();
  const { data, isLoading } = useQuery({
    queryKey: ["clinic-granted-pets", membership?.clinic_id],
    queryFn: () => fetchGrantedPets(membership!.clinic_id),
    enabled: !!membership?.clinic_id,
  });

  if (membershipLoading) return <div className={ui.empty}><Spin /></div>;

  if (!membership) {
    return (
      <div className={ui.page}>
        <div className={ui.empty}>Cadastre sua clínica para ver pets compartilhados.</div>
        <Link href="/clinic/setup" className={`${ui.btnPrimary} ${ui.btnBlock}`}>Cadastrar clínica</Link>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <section className={ui.hero}>
        <Link href="/clinic" className={ui.btnGhost}>← Início</Link>
        <span className={ui.badge}>{membership.clinic.name}</span>
        <h1 className={ui.title}>Pets compartilhados</h1>
        <p className={ui.subtitle}>Fichas que o cuidador liberou para você.</p>
      </section>

      <Link href="/clinic/access" className={`${ui.btnSecondary} ${ui.btnBlock}`}>
        🔍 Buscar mais pets por CPF
      </Link>

      {isLoading ? (
        <div className={ui.empty}>Carregando…</div>
      ) : !data?.length ? (
        <div className={ui.empty}>
          Nenhum pet com acesso ainda.
          <p style={{ marginTop: 8, fontSize: "0.85rem" }}>Peça permissão pelo CPF do cuidador.</p>
        </div>
      ) : (
        <div className={ui.cardList}>
          {data.map((pet: GrantedPet) => (
            <Link key={pet.grant_id} href={`/clinic/pets/${pet.pet_id}`} className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h3 className={ui.cardTitle}>
                    {speciesEmoji[pet.species] ?? "🐾"} {pet.pet_name}
                  </h3>
                  <p className={ui.cardMeta}>
                    {pet.expires_at
                      ? `Válido até ${dayjs(pet.expires_at).format("DD/MM/YYYY")}`
                      : "Acesso sem prazo"}
                  </p>
                </div>
                <span className={`${ui.chip} ${ui.chipCompleted}`}>Abrir</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
