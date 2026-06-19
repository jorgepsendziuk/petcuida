"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import {
  App,
  Avatar,
  Button,
  Drawer,
  Flex,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  Divider,
} from "antd";
import {
  MessageOutlined,
  PlusOutlined,
  MedicineBoxOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { ChatbotWizard } from "@/components/chatbot/wizard";
import { BRAND_NAME } from "@/lib/brand";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

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
    create_pets: "Cadastro de múltiplos pets",
    create_pet_treatments: "Cadastro de tratamentos em lote",
    update_pet: "Atualização de pet",
    update_pets: "Atualização em lote",
    log_treatment: "Registro de aplicação",
  };
  return translations[action] ?? action;
};

type MutationInput = {
  prompt: string;
  history: ChatMessage[];
};

export function FloatingAssistant() {
  const { session } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<ChatFormValues>();
  const [open, setOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"pet" | "treatment" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { message } = App.useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      let content = "Ação executada com sucesso.";
      
      if (result.error) {
        content = `Ocorreu um erro: ${result.error}`;
      } else if (result.data) {
        const data = result.data as Record<string, unknown>;
        switch (result.action) {
          case "create_pet":
            content = `Pet "${data.name}" cadastrado com sucesso!`;
            break;
          case "create_pets":
            const petsData = result.data as { count?: number; pets?: Array<{ name: string }> };
            content = `${petsData.count || 0} pet(s) cadastrado(s) com sucesso!`;
            break;
          case "create_pet_treatment":
            content = `Tratamento "${data.title}" criado com sucesso para o pet!`;
            break;
          case "create_pet_treatments":
            const treatmentsData = result.data as { count?: number };
            content = `${treatmentsData.count || 0} tratamento(s) criado(s) com sucesso!`;
            break;
          case "update_pet":
            content = `Pet atualizado com sucesso!`;
            break;
          case "update_pets":
            const updateData = result.data as { count?: number };
            content = `${updateData.count || 0} pet(s) atualizado(s) com sucesso!`;
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
      // Scroll para a última mensagem
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.submit();
    }
  };

  const timeline = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages],
  );

  // Scroll automático quando novas mensagens chegarem
  useEffect(() => {
    if (timeline.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [timeline.length]);

  const handleWizardComplete = () => {
    setWizardMode(null);
    // Recarregar para atualizar dados
    window.location.reload();
  };

  return (
    <>
      {/* Botão flutuante */}
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<MessageOutlined style={{ fontSize: 24 }} />}
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          zIndex: 1000,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
        }}
      />

      {/* Drawer com assistente */}
      <Drawer
        title={
          <Space>
            <RobotOutlined style={{ fontSize: 20 }} />
            <Text strong>Assistente {BRAND_NAME}</Text>
          </Space>
        }
        placement="right"
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Botões rápidos de ação */}
          {wizardMode === null && (
            <div style={{ padding: 16, borderBottom: "1px solid #f0f0f0" }}>
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                <Text strong style={{ fontSize: 14, color: "#262626" }}>
                  Ações rápidas:
                </Text>
                <Space wrap style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => {
                      setWizardMode("pet");
                      setOpen(true);
                    }}
                    style={{ height: 48, fontSize: 15 }}
                  >
                    Cadastrar Pet
                  </Button>
                  <Button
                    type="default"
                    icon={<MedicineBoxOutlined />}
                    size="large"
                    onClick={() => {
                      setWizardMode("treatment");
                      setOpen(true);
                    }}
                    style={{ height: 48, fontSize: 15 }}
                  >
                    Cadastrar Tratamento
                  </Button>
                </Space>
              </Space>
            </div>
          )}

          {/* Wizard ou Chat */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {wizardMode === "pet" ? (
              <div style={{ padding: 16, overflowY: "auto", height: "100%" }}>
                <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong style={{ fontSize: 16 }}>
                      Cadastrar Pet
                    </Text>
                    <Button type="text" size="small" onClick={() => setWizardMode(null)}>
                      Voltar
                    </Button>
                  </div>
                  <ChatbotWizard
                    initialAction="pet"
                    onComplete={handleWizardComplete}
                    onSkip={() => setWizardMode(null)}
                  />
                </Space>
              </div>
            ) : wizardMode === "treatment" ? (
              <div style={{ padding: 16, overflowY: "auto", height: "100%" }}>
                <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong style={{ fontSize: 16 }}>
                      Cadastrar Tratamento
                    </Text>
                    <Button type="text" size="small" onClick={() => setWizardMode(null)}>
                      Voltar
                    </Button>
                  </div>
                  <ChatbotWizard
                    initialAction="treatment"
                    onComplete={handleWizardComplete}
                    onSkip={() => setWizardMode(null)}
                  />
                </Space>
              </div>
            ) : (
              <>
                {/* Histórico de mensagens */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                  {timeline.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <RobotOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                      <Text type="secondary" style={{ display: "block", fontSize: 14 }}>
                        Olá! Sou o Assistente {BRAND_NAME}.
                      </Text>
                      <Text type="secondary" style={{ display: "block", fontSize: 14, marginTop: 8 }}>
                        Use os botões acima para ações rápidas ou digite uma mensagem abaixo.
                      </Text>
                    </div>
                  ) : (
                    <Flex vertical gap="small">
                      {timeline.map((item) => (
                        <Flex
                          key={item.id}
                          vertical
                          gap="small"
                          style={{
                            padding: "12px 0",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          <Space>
                            <Avatar
                              size="small"
                              icon={item.author === "user" ? <UserOutlined /> : <RobotOutlined />}
                              style={{
                                backgroundColor: item.author === "user" ? "#1890ff" : "#52c41a",
                              }}
                            />
                            <Text strong style={{ fontSize: 13 }}>
                              {item.author === "user" ? "Você" : "Assistente"}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(item.timestamp).format("HH:mm")}
                            </Text>
                            {item.action && (
                              <Tag color="blue" style={{ fontSize: 11 }}>
                                {formatAction(item.action)}
                              </Tag>
                            )}
                          </Space>
                          <Paragraph
                            style={{
                              margin: 0,
                              fontSize: 14,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {item.content}
                          </Paragraph>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <Divider style={{ margin: 0 }} />

                {/* Campo de entrada */}
                <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
                  <Form<ChatFormValues>
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                    style={{ marginBottom: 0 }}
                  >
                    <Form.Item
                      name="prompt"
                      rules={[{ required: true, message: "Digite sua mensagem" }]}
                      style={{ marginBottom: 12 }}
                    >
                      <TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="Ex: cadastre um pet chamado Bolt, cachorro macho nascido em 2020..."
                        onKeyPress={handleKeyPress}
                        disabled={mutation.isPending}
                        style={{ fontSize: 14 }}
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Pressione Enter para enviar, Shift+Enter para nova linha
                        </Text>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={mutation.isPending}
                          icon={<SendOutlined />}
                          style={{ height: 40 }}
                        >
                          Enviar
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </div>
              </>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
