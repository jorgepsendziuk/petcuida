"use client";

import type { Dayjs } from "dayjs";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { App, DatePicker, Form, Input, InputNumber, Select } from "antd";
import dayjs from "dayjs";

import { addClinicTreatment } from "@/lib/clinic/treatments";
import {
  TREATMENT_KIND_LABELS,
  TREATMENT_STATUS_LABELS,
  type ClinicTreatmentPayload,
  type TreatmentKind,
  type TreatmentStatus,
} from "@/lib/clinic/treatment-payload";

import ui from "./clinic-ui.module.css";

type FormValues = {
  title: string;
  kind: TreatmentKind;
  status: TreatmentStatus;
  description?: string;
  start_date?: Dayjs | null;
  due_date?: Dayjs | null;
  frequency_days?: number;
  notes?: string;
};

const kindOptions = Object.entries(TREATMENT_KIND_LABELS).map(([value, label]) => ({
  value: value as TreatmentKind,
  label,
}));

const statusOptions = Object.entries(TREATMENT_STATUS_LABELS).map(([value, label]) => ({
  value: value as TreatmentStatus,
  label,
}));

type Props = {
  clinicId: string;
  petId: string;
  tutorId: string;
  userId: string;
  hasGrant: boolean;
  onSuccess?: () => void;
};

export const ClinicTreatmentForm = ({
  clinicId,
  petId,
  tutorId,
  userId,
  hasGrant,
  onSuccess,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: ClinicTreatmentPayload = {
        title: values.title,
        kind: values.kind,
        status: values.status,
        description: values.description ?? null,
        start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
        due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        frequency_days: values.frequency_days ?? null,
        notes: values.notes ?? null,
      };

      return addClinicTreatment({
        clinicId,
        petId,
        tutorId,
        userId,
        hasGrant,
        payload,
      });
    },
    onSuccess: (result) => {
      if (result.mode === "applied") {
        message.success("Cuidado registrado na ficha do pet.");
      } else {
        message.success("Rascunho enviado. O cuidador precisa aprovar.");
      }
      form.resetFields();
      setOpen(false);
      onSuccess?.();
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (!open) {
    return (
      <button type="button" className={`${ui.btnPrimary} ${ui.btnBlock}`} onClick={() => setOpen(true)}>
        + Registrar cuidado
      </button>
    );
  }

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      onFinish={(values) => mutation.mutate(values)}
      initialValues={{ status: "completed", kind: "checkup" }}
      className={ui.formStack}
    >
      {!hasGrant && (
        <p className={ui.cardMeta}>
          Sem acesso liberado — o cuidado ficará como rascunho até aprovação.
        </p>
      )}

      <Form.Item label="Título" name="title" rules={[{ required: true, message: "Informe o título" }]}>
        <Input className={ui.field} placeholder="Ex: Consulta de rotina" />
      </Form.Item>

      <div className={ui.formRow}>
        <Form.Item label="Tipo" name="kind" rules={[{ required: true }]}>
          <Select options={kindOptions} />
        </Form.Item>
        <Form.Item label="Status" name="status" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
      </div>

      <Form.Item label="Descrição" name="description">
        <Input.TextArea rows={2} placeholder="Detalhes do atendimento" />
      </Form.Item>

      <div className={ui.formRow}>
        <Form.Item label="Data" name="start_date">
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item label="Próximo retorno" name="due_date">
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      <Form.Item label="Frequência (dias)" name="frequency_days">
        <InputNumber min={1} style={{ width: "100%" }} placeholder="Ex: 30" />
      </Form.Item>

      <Form.Item label="Observações" name="notes">
        <Input.TextArea rows={2} />
      </Form.Item>

      <div className={ui.actions}>
        <button type="submit" className={ui.btnPrimary} disabled={mutation.isPending}>
          {hasGrant ? "Salvar na ficha" : "Enviar rascunho"}
        </button>
        <button type="button" className={ui.btnGhost} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </Form>
  );
};
