"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Spin } from "antd";

import { ClinicTreatmentForm } from "@/components/clinic/clinic-treatment-form";
import ui from "@/components/clinic/clinic-ui.module.css";
import { PrescriptionUploadOCR } from "@/components/prescriptions/prescription-upload-ocr";
import { useClinicMembership } from "@/hooks/use-clinic-membership";
import {
  TREATMENT_KIND_LABELS,
  TREATMENT_STATUS_LABELS,
} from "@/lib/clinic/treatment-payload";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

type Pet = Database["public"]["Tables"]["pets"]["Row"];
type PetTreatment = Database["public"]["Tables"]["pet_treatments"]["Row"];

const speciesLabel: Record<Pet["species"], string> = {
  dog: "Cachorro",
  cat: "Gato",
  bird: "Ave",
  small_pet: "Pequeno porte",
  other: "Outro",
};

const fetchClinicPet = async (clinicId: string, petId: string) => {
  const [grantRes, petRes, treatmentsRes] = await Promise.all([
    supabaseClient
      .from("pet_access_grants")
      .select("id, expires_at, tutor_id")
      .eq("clinic_id", clinicId)
      .eq("pet_id", petId)
      .is("revoked_at", null)
      .maybeSingle(),
    supabaseClient.from("pets").select("*").eq("id", petId).maybeSingle<Pet>(),
    supabaseClient
      .from("pet_treatments")
      .select("*")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false }),
  ]);

  if (grantRes.error) throw grantRes.error;
  if (petRes.error) throw petRes.error;
  if (!petRes.data) throw new Error("Pet não encontrado");
  if (treatmentsRes.error) throw treatmentsRes.error;

  const grant = grantRes.data as {
    id: string;
    expires_at: string | null;
    tutor_id: string;
  } | null;

  const hasGrant =
    !!grant && (grant.expires_at === null || new Date(grant.expires_at) > new Date());

  return {
    pet: petRes.data,
    treatments: (treatmentsRes.data ?? []) as PetTreatment[],
    hasGrant,
    tutorId: grant?.tutor_id ?? petRes.data.owner_id,
    grantExpiresAt: grant?.expires_at ?? null,
  };
};

export default function ClinicPetDetailPage() {
  const params = useParams<{ id: string }>();
  const petId = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: membership, isLoading: membershipLoading } = useClinicMembership();

  const { data, isLoading, error } = useQuery({
    queryKey: ["clinic-pet-detail", membership?.clinic_id, petId],
    queryFn: () => fetchClinicPet(membership!.clinic_id, petId),
    enabled: !!membership?.clinic_id && !!petId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["clinic-pet-detail", membership?.clinic_id, petId] });
  };

  if (membershipLoading || isLoading) {
    return <div className={ui.empty}><Spin /></div>;
  }

  if (!membership) {
    return (
      <div className={ui.page}>
        <div className={ui.empty}>Cadastre sua clínica primeiro.</div>
        <Link href="/clinic/setup" className={`${ui.btnPrimary} ${ui.btnBlock}`}>Cadastrar</Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={ui.page}>
        <div className={ui.empty}>{(error as Error)?.message ?? "Sem permissão para este pet."}</div>
        <Link href="/clinic/pets" className={ui.btnGhost}>← Voltar</Link>
      </div>
    );
  }

  const { pet, treatments, hasGrant, tutorId, grantExpiresAt } = data;

  return (
    <div className={ui.page}>
      <section className={ui.hero}>
        <Link href="/clinic/pets" className={ui.btnGhost}>← Pets</Link>
        <span className={ui.badge}>Visão parceiro</span>
        <h1 className={ui.title}>{pet.name}</h1>
        <p className={ui.subtitle}>
          {speciesLabel[pet.species]}
          {pet.breed ? ` · ${pet.breed}` : ""}
        </p>
      </section>

      <article className={ui.card}>
        <span className={`${ui.chip} ${hasGrant ? ui.chipCompleted : ui.chipPending}`}>
          {hasGrant
            ? grantExpiresAt
              ? `Liberado até ${dayjs(grantExpiresAt).format("DD/MM/YYYY")}`
              : "Acesso liberado"
            : "Sem acesso — rascunhos só"}
        </span>
        {pet.notes && <p className={ui.cardMeta} style={{ marginTop: 10 }}>{pet.notes}</p>}
      </article>

      {user && (
        <section>
          <span className={ui.sectionLabel}>Registrar cuidado</span>
          <div className={ui.card}>
            <ClinicTreatmentForm
              clinicId={membership.clinic_id}
              petId={petId}
              tutorId={tutorId}
              userId={user.id}
              hasGrant={hasGrant}
              onSuccess={invalidate}
            />
          </div>
        </section>
      )}

      {hasGrant && user && (
        <section>
          <span className={ui.sectionLabel}>Receita (foto)</span>
          <div className={ui.card}>
            <PrescriptionUploadOCR
              petId={petId}
              ownerId={pet.owner_id}
              clinicMode
              onSuccess={invalidate}
            />
          </div>
        </section>
      )}

      <section>
        <span className={ui.sectionLabel}>Histórico</span>
        {!treatments.length ? (
          <div className={ui.empty}>Nenhum cuidado ainda.</div>
        ) : (
          <div className={ui.cardList}>
            {treatments.map((item) => (
              <article key={item.id} className={ui.card}>
                <div className={ui.cardHeader}>
                  <div>
                    <h3 className={ui.cardTitle}>{item.title}</h3>
                    <p className={ui.cardMeta}>
                      {TREATMENT_KIND_LABELS[item.kind]} · {TREATMENT_STATUS_LABELS[item.status]}
                    </p>
                  </div>
                </div>
                {item.notes && <p className={ui.cardMeta}>{item.notes}</p>}
                {item.due_date && (
                  <p className={ui.cardMeta}>Próximo: {dayjs(item.due_date).format("DD/MM/YYYY")}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Link href={`/clinic/appointments?pet=${petId}`} className={`${ui.btnSecondary} ${ui.btnBlock}`}>
        📅 Agendar consulta
      </Link>
    </div>
  );
}
