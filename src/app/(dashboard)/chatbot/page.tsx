"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import { App, Avatar, Button, Card, Empty, Flex, Form, Input, Space, Tag, Typography } from "antd";

import { useAuth } from "@/providers/auth-provider";
import { ChatbotWizard } from "@/components/chatbot/wizard";
import { BRAND_NAME } from "@/lib/brand";

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
  const [showWizard, setShowWizard] = useState(true);
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

      // Debug: mostrar histórico sendo enviado
      console.log("Histórico sendo enviado:", {
        totalMensagens: history.length,
        historico: historyPayload,
        novaMensagem: prompt,
      });

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
      let content = "Ação executada com sucesso.";
      
      if (result.error) {
        content = `Ocorreu um erro: ${result.error}`;
      } else if (result.data) {
        // Melhorar a resposta com base na ação e dados retornados
        const data = result.data as Record<string, unknown>;
        switch (result.action) {
          case "create_pet":
            content = `Pet "${data.name}" cadastrado com sucesso!`;
            break;
          case "create_pet_treatment":
            content = `Tratamento "${data.title}" criado com sucesso para o pet!`;
            break;
          case "log_treatment":
            content = `Aplicação do tratamento registrada com sucesso!`;
            break;
          default:
            content = "Ação executada com sucesso.";
        }
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: "assistant",
          content,
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
    
    // Debug: mostrar histórico atual antes de enviar
      console.log("Histórico atual no frontend:", {
      totalMensagens: updatedMessages.length,
      mensagens: updatedMessages.map((m) => ({
        autor: m.author,
        conteudo: m.content.substring(0, 50) + "...",
        timestamp: m.timestamp,
      })),
    });
    
    mutation.mutate({ prompt, history: updatedMessages });
  };

  const timeline = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages],
  );

  // Mostrar wizard apenas quando não há mensagens e o usuário ainda não pulou
  const shouldShowWizard = showWizard && timeline.length === 0;

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      {shouldShowWizard ? (
        <ChatbotWizard
          onComplete={() => {
            setShowWizard(false);
            // Recarregar a página para atualizar a lista de pets
            window.location.reload();
          }}
          onSkip={() => setShowWizard(false)}
        />
      ) : null}

      <Card
        title={`Assistente ${BRAND_NAME}`}
        extra={
          <Space>
            {!shouldShowWizard && timeline.length === 0 && (
              <Button type="text" onClick={() => setShowWizard(true)}>
                Mostrar Wizard
              </Button>
            )}
            <Typography.Text type="secondary">
              Converse com o assistente para cadastrar pets, cuidados e registrar aplicações.
            </Typography.Text>
          </Space>
        }
      >
        {timeline.length === 0 && !shouldShowWizard ? (
          <Empty description="Envie uma mensagem para começar ou use o wizard acima." />
        ) : (
          <Flex vertical gap="middle">
            {timeline.map((item) => (
              <Flex key={item.id} gap="small" align="flex-start">
                <Avatar>{item.author === "user" ? "U" : "AI"}</Avatar>
                <Flex vertical style={{ flex: 1 }}>
                  <Space>
                    <Typography.Text strong>
                      {item.author === "user" ? "Você" : "Assistente"}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {dayjs(item.timestamp).format("DD/MM/YYYY HH:mm")}
                    </Typography.Text>
                    {item.action ? <Tag color="blue">{formatAction(item.action)}</Tag> : null}
                  </Space>
                  <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                    {item.content}
                  </Typography.Paragraph>
                </Flex>
              </Flex>
            ))}
          </Flex>
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

