"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Col, Empty, Row, Spin, Typography } from "antd";

import { supabaseClient } from "@/lib/supabase/client";
import { BRAND_NAME } from "@/lib/brand";
import { usePersona } from "@/providers/persona-provider";
import type { Database } from "@/types/database";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

const fetchClinics = async () => {
  const { data, error } = await supabaseClient
    .from("clinics")
    .select("*")
    .eq("is_public", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Clinic[];
};

export default function ClinicasPage() {
  const router = useRouter();
  const { persona } = usePersona();
  const { data, isLoading } = useQuery({
    queryKey: ["clinics-catalog"],
    queryFn: fetchClinics,
  });

  useEffect(() => {
    if (persona === "partner") {
      router.replace("/clinic");
    }
  }, [persona, router]);

  if (persona === "partner") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Typography.Title level={3}>Clínicas parceiras</Typography.Title>
      <Typography.Paragraph type="secondary">
        Encontre parceiros de saúde que usam o {BRAND_NAME}. Compartilhe a ficha do seu pet com quem você confiar.
      </Typography.Paragraph>

      {isLoading ? (
        <Card loading />
      ) : !data?.length ? (
        <Empty description="Nenhuma clínica cadastrada ainda." />
      ) : (
        <Row gutter={[16, 16]}>
          {data.map((clinic) => (
            <Col xs={24} sm={12} lg={8} key={clinic.id}>
              <Card title={clinic.name}>
                {clinic.description && <Typography.Paragraph>{clinic.description}</Typography.Paragraph>}
                {clinic.city && (
                  <Typography.Text type="secondary">
                    {clinic.city}
                    {clinic.state ? `, ${clinic.state}` : ""}
                  </Typography.Text>
                )}
                {clinic.phone && (
                  <Typography.Paragraph style={{ marginTop: 8 }}>
                    <strong>Telefone:</strong> {clinic.phone}
                  </Typography.Paragraph>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Typography.Paragraph style={{ marginTop: 24 }}>
        É parceiro veterinário? <Link href="/clinic/setup">Cadastre sua clínica gratuitamente</Link>
      </Typography.Paragraph>
    </div>
  );
}
