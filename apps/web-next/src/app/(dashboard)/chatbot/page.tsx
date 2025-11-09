"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import { App, Avatar, Button, Card, Empty, Form, Input, List, Space, Tag, Typography } from "antd";

import { useAuth } from "@/providers/auth-provider";

type ChatMessage = {
  id: string;
  author: "user" | "assistant";
  content: string;
  action?: string;
  timestamp: string;
};

type ChatFormValues = {
  prompt: string;
};

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
    log_treatment: "Registro de aplicação",
  };
  return translations[action] ?? action;
};

type MutationInput = {
  prompt: string;
  history: ChatMessage[];
};

export default function ChatbotPage() {
  const { session } = useAuth();
  const [form] = Form.useForm<ChatFormValues>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { message } = App.useApp();

  const mutation = useMutation<
    { action?: string; data?: unknown; error?: string },
    Error,
    MutationInput
  >({
    mutationFn: async ({ prompt, history }) => {
      if (!functionsUrl) {
        throw new Error("URL das edge functions não configurada.");
      }
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!token || !userId) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const historyPayload =
        history.length > 0
          ? history.map((item) => ({
              role: item.author === "user" ? "user" : "assistant",
              content: item.content,
            }))
          : undefined;

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
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Falha ao chamar o assistente.");
      }

      return (await response.json()) as { action?: string; data?: unknown; error?: string };
    },
    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: "assistant",
          content: result.error
            ? `Ocorreu um erro: ${result.error}`
            : "Ação executada com sucesso.",
          action: result.action,
          timestamp: new Date().toISOString(),
        },
      ]);
      form.resetFields();
    },
    onError: (error: Error) => {
      message.error(error.message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: "assistant",
          content: `Não foi possível completar a solicitação: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
  });

  const handleSubmit = ({ prompt }: ChatFormValues) => {
    if (!prompt.trim()) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      author: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    mutation.mutate({ prompt, history: updatedMessages });
  };

  const timeline = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Assistente PetCuida"
        extra={
          <Typography.Text type="secondary">
            Converse com o assistente para cadastrar pets, cuidados e registrar aplicações.
          </Typography.Text>
        }
      >
        {timeline.length === 0 ? (
          <Empty description="Envie uma mensagem para começar." />
        ) : (
          <List<ChatMessage>
            dataSource={timeline}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <List.Item.Meta
                  avatar={
                    <Avatar>{item.author === "user" ? "U" : "AI"}</Avatar>
                  }
                  title={
                    <Space>
                      <Typography.Text strong>
                        {item.author === "user" ? "Você" : "Assistente"}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {dayjs(item.timestamp).format("DD/MM/YYYY HH:mm")}
                      </Typography.Text>
                      {item.action ? <Tag color="blue">{formatAction(item.action)}</Tag> : null}
                    </Space>
                  }
                  description={<Typography.Paragraph>{item.content}</Typography.Paragraph>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card>
        <Form<ChatFormValues> layout="inline" onFinish={handleSubmit} form={form} style={{ width: "100%" }}>
          <Form.Item
            name="prompt"
            rules={[{ required: true, message: "Descreva o que deseja fazer" }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Ex: cadastre um pet chamado Bolt, cachorro macho nascido em 2020..."
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Enviar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}

