"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Input, Typography } from "antd";

import { useAuth } from "@/providers/auth-provider";

type RegisterForm = {
  fullName?: string;
  email: string;
  password: string;
};

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [form] = Form.useForm<RegisterForm>();
  const router = useRouter();
  const { signUp, isLoading } = useAuth();
  const { message } = App.useApp();

  const handleSubmit = async (values: RegisterForm) => {
    try {
      await signUp(values);
      message.success("Cadastro realizado! Confira seu e-mail para confirmar a conta.");
      router.replace("/login");
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
      <Card style={{ width: 420, maxWidth: "100%" }}>
        <Title level={3} style={{ textAlign: "center" }}>
          Criar conta
        </Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          Cadastre-se para começar a cuidar dos seus pets
        </Text>
        <Form<RegisterForm> layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item label="Nome completo" name="fullName">
            <Input prefix={<UserOutlined />} placeholder="Seu nome" autoComplete="name" />
          </Form.Item>

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
            rules={[
              { required: true, message: "Informe a senha" },
              { min: 6, message: "A senha deve ter no mínimo 6 caracteres" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Crie uma senha"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block htmlType="submit" loading={isLoading}>
              Cadastrar
            </Button>
          </Form.Item>
        </Form>

        <Text style={{ display: "block", textAlign: "center" }}>
          Já possui conta? <Link href="/login">Entrar</Link>
        </Text>
      </Card>
    </div>
  );
}

