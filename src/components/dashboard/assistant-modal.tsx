"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import { App, Avatar, Button, Flex, Form, Input, Space, Tag, Typography } from "antd";
import {
  PlusOutlined,
  MedicineBoxOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useAuth } from "@/providers/auth-provider";
import { ChatbotWizard } from "@/components/chatbot/wizard";
import { BRAND_NAME } from "@/lib/brand";

import styles from "./assistant-modal.module.css";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type ChatMessage = {
  id: string;
  author: "user" | "assistant";
  content: string;
  action?: string;
  timestamp: string;
};

type ChatFormValues = { prompt: string };

const functionsUrl = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const override = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;
  if (override) return override.replace(/\/$/, "");
  if (!url) return "";
  return url.replace(".supabase.co", ".functions.supabase.co");
})();

const formatAction = (action?: string) => {
  if (!action) return "resposta";
  const translations: Record<string, string> = {
    create_pet: "Cadastro de pet",
    create_pet_treatment: "Cadastro de cuidado",
    create_pets: "Cadastro de múltiplos pets",
    create_pet_treatments: "Cadastro de tratamentos em lote",
    update_pet: "Atualização de pet",
    update_pets: "Atualização em lote",
    log_treatment: "Registro de aplicação",
  };
  return translations[action] ?? action;
};

type AssistantModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AssistantModal({ open, onClose }: AssistantModalProps) {
  const { session } = useAuth();
  const [form] = Form.useForm<ChatFormValues>();
  const [wizardMode, setWizardMode] = useState<"pet" | "treatment" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { message } = App.useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async ({ prompt, history }: { prompt: string; history: ChatMessage[] }) => {
      if (!functionsUrl) throw new Error("URL das edge functions não configurada.");
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!token || !userId) throw new Error("Sessão inválida.");

      const response = await fetch(`${functionsUrl}/chatbot-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-petcuida-chatbot-secret": process.env.NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET ?? "",
        },
        body: JSON.stringify({
          query: prompt,
          userId,
          history: history.map((item) => ({
            role: item.author === "user" ? "user" : "assistant",
            content: item.content,
          })),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Falha ao chamar o assistente.");
      }
      return (await response.json()) as { action?: string; data?: unknown; error?: string };
    },
    onSuccess: (result) => {
      let content = result.error ? `Erro: ${result.error}` : "Ação executada com sucesso.";
      if (!result.error && result.data) {
        const data = result.data as Record<string, unknown>;
        if (result.action === "create_pet") content = `Pet "${data.name}" cadastrado!`;
      }
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), author: "assistant", content, action: result.action, timestamp: new Date().toISOString() },
      ]);
      form.resetFields();
    },
    onError: (error: Error) => {
      message.error(error.message);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), author: "assistant", content: error.message, timestamp: new Date().toISOString() },
      ]);
    },
  });

  const timeline = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages],
  );

  useEffect(() => {
    if (timeline.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.modal} role="dialog" aria-label="Assistente" onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <span className={styles.sparkle}>✨</span>
          <h2>Assistente {BRAND_NAME}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        {wizardMode === null && (
          <div className={styles.quickActions}>
            <button type="button" onClick={() => setWizardMode("pet")}>
              <PlusOutlined /> Pet
            </button>
            <button type="button" onClick={() => setWizardMode("treatment")}>
              <MedicineBoxOutlined /> Cuidado
            </button>
          </div>
        )}

        <div className={styles.body}>
          {wizardMode === "pet" || wizardMode === "treatment" ? (
            <div className={styles.wizardWrap}>
              <button type="button" className={styles.backLink} onClick={() => setWizardMode(null)}>
                ← Voltar
              </button>
              <ChatbotWizard
                initialAction={wizardMode}
                onComplete={() => {
                  setWizardMode(null);
                  window.location.reload();
                }}
                onSkip={() => setWizardMode(null)}
              />
            </div>
          ) : (
            <>
              <div className={styles.messages}>
                {timeline.length === 0 ? (
                  <p className={styles.placeholder}>Pergunte qualquer coisa sobre seus pets 🐾</p>
                ) : (
                  timeline.map((item) => (
                    <Flex key={item.id} vertical gap={4} className={styles.msg}>
                      <Space size={6}>
                        <Avatar
                          size="small"
                          icon={item.author === "user" ? <UserOutlined /> : <RobotOutlined />}
                        />
                        <Text strong style={{ fontSize: 12 }}>
                          {item.author === "user" ? "Você" : "IA"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {dayjs(item.timestamp).format("HH:mm")}
                        </Text>
                        {item.action && <Tag style={{ fontSize: 10 }}>{formatAction(item.action)}</Tag>}
                      </Space>
                      <Paragraph style={{ margin: 0, fontSize: 13 }}>{item.content}</Paragraph>
                    </Flex>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <Form<ChatFormValues>
                form={form}
                onFinish={({ prompt }) => {
                  if (!prompt.trim()) return;
                  const newMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    author: "user",
                    content: prompt,
                    timestamp: new Date().toISOString(),
                  };
                  const updated = [...messages, newMsg];
                  setMessages(updated);
                  mutation.mutate({ prompt, history: updated });
                }}
                className={styles.form}
              >
                <Form.Item name="prompt" style={{ margin: 0, flex: 1 }}>
                  <TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    placeholder="Ex: cadastre vacina do Rex..."
                    disabled={mutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        form.submit();
                      }
                    }}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={mutation.isPending} icon={<SendOutlined />} />
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
