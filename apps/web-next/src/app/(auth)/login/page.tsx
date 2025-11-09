"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Input, Typography } from "antd";

import { useAuth } from "@/providers/auth-provider";

type LoginForm = {
  email: string;
  password: string;
};

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm<LoginForm>();
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const { message } = App.useApp();

  const handleSubmit = async (values: LoginForm) => {
    try {
      await signIn(values);
      message.success("Login realizado com sucesso!");
      router.replace("/dashboard");
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: 24,
      }}
    >
      <Card style={{ width: 380, maxWidth: "100%" }}>
        <Title level={3} style={{ textAlign: "center" }}>
          PetCuida
        </Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          Entre para gerenciar seus pets
        </Text>
        <Form<LoginForm> layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item
            label="E-mail"
            name="email"
            rules={[
              { required: true, message: "Informe o e-mail" },
              { type: "email", message: "Informe um e-mail válido" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="seu-email@exemplo.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="Senha"
            name="password"
            rules={[{ required: true, message: "Informe a senha" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block htmlType="submit" loading={isLoading}>
              Entrar
            </Button>
          </Form.Item>
        </Form>

        <Text style={{ display: "block", textAlign: "center" }}>
          Ainda não tem conta? <Link href="/register">Cadastre-se</Link>
        </Text>
      </Card>
    </div>
  );
}

