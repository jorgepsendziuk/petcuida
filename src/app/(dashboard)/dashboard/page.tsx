"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { usePersona } from "@/providers/persona-provider";

import { CaregiverHub } from "@/components/dashboard/caregiver-hub";
import { PartnerHub } from "@/components/clinic/partner-hub";

export default function DashboardPage() {
  const { persona } = usePersona();
  const router = useRouter();

  useEffect(() => {
    if (persona === "partner") {
      router.replace("/clinic");
    }
  }, [persona, router]);

  if (persona === "partner") return null;

  return <CaregiverHub />;
}
