"use client";

import { useState, useRef } from "react";
import { Button, Upload, message, Modal, Space, Typography, Card, Tag, Spin, Flex, Input, InputNumber, Select, Form } from "antd";
import { FileTextOutlined, UploadOutlined, CheckCircleOutlined, CloseOutlined, EditOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";

const { Text, Title } = Typography;

type PrescriptionUploadOCRProps = {
  petId: string;
  ownerId?: string;
  clinicMode?: boolean;
  onSuccess?: (prescriptionId: string) => void;
};

type PrescriptionData = {
  prescription_date?: string;
  veterinarian_name?: string;
  veterinarian_crmv?: string;
  clinic_name?: string;
  medications: Array<{
    medication_name: string;
    dosage?: string;
    frequency?: string;
    duration_days?: number;
    route?: string;
    instructions?: string;
  }>;
  notes?: string;
};

export function PrescriptionUploadOCR({ petId, ownerId, clinicMode, onSuccess }: PrescriptionUploadOCRProps) {
  const { user } = useAuth();
  const prescriptionOwnerId = ownerId ?? user?.id;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<PrescriptionData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<PrescriptionData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ocrMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Construir URL da edge function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
        (supabaseUrl ? `${supabaseUrl.replace(/\.supabase\.co$/, '')}.functions.supabase.co` : `${supabaseUrl}/functions/v1`);

      const response = await fetch(`${functionsUrl}/prescription-ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          imageBase64,
          petId,
          userId: user.id,
          ownerId: prescriptionOwnerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar receita");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setOcrResult(data.prescription);
      setEditedData(data.prescription); // Inicializar dados editáveis
      setIsProcessing(false);
      message.success({
        content: `Receita processada com sucesso! ${data.medicationsCount} medicamento(s) encontrado(s).`,
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      message.error(`Erro ao processar receita: ${error.message}`);
    },
  });

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Por favor, selecione uma imagem");
      return;
    }

    setIsProcessing(true);
    setOcrResult(null);

    // Converter para base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);
      setIsModalOpen(true);
      
      // Processar OCR
      await ocrMutation.mutateAsync(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    if (!editedData || !user?.id) return;

    // Se estamos editando, precisamos reenviar para a edge function com os dados atualizados
    if (isEditing) {
      try {
        setIsProcessing(true);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ||
          (supabaseUrl ? `${supabaseUrl.replace(/\.supabase\.co$/, '')}.functions.supabase.co` : `${supabaseUrl}/functions/v1`);

        const response = await fetch(`${functionsUrl}/prescription-ocr`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            imageBase64: previewImage,
            petId,
            userId: user.id,
            ownerId: prescriptionOwnerId,
            editedData: editedData,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao salvar receita editada");
        }

        const result = await response.json();
        setIsProcessing(false);
        message.success("Dados atualizados com sucesso!");
        setIsModalOpen(false);
        setPreviewImage(null);
        setOcrResult(null);
        setEditedData(null);
        setIsEditing(false);

        if (result.prescription?.id) {
          onSuccess?.(result.prescription.id);
        }
      } catch (error) {
        setIsProcessing(false);
        message.error(`Erro ao salvar alterações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    } else {
      // A receita já foi salva pela edge function
      const prescriptionId = ocrMutation.data?.prescription?.id;

      setIsModalOpen(false);
      setPreviewImage(null);
      setOcrResult(null);
      setEditedData(null);

      if (prescriptionId) {
        onSuccess?.(prescriptionId);
      }
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPreviewImage(null);
    setOcrResult(null);
    setEditedData(null);
    setIsEditing(false);
    setIsProcessing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(ocrResult); // Resetar para dados originais
  };

  const updateEditedData = (field: keyof PrescriptionData, value: any) => {
    setEditedData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateMedication = (index: number, field: string, value: any) => {
    setEditedData(prev => {
      if (!prev) return null;
      const newMedications = [...prev.medications];
      newMedications[index] = { ...newMedications[index], [field]: value };
      return { ...prev, medications: newMedications };
    });
  };

  const addMedication = () => {
    setEditedData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        medications: [...prev.medications, {
          medication_name: "",
          dosage: "",
          frequency: "",
          duration_days: undefined,
          route: "",
          instructions: ""
        }]
      };
    });
  };

  const removeMedication = (index: number) => {
    setEditedData(prev => {
      if (!prev || prev.medications.length <= 1) return prev; // Manter pelo menos 1 medicamento
      const newMedications = prev.medications.filter((_, i) => i !== index);
      return { ...prev, medications: newMedications };
    });
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
        }}
      />
      <Button
        type="primary"
        size="large"
        icon={<UploadOutlined />}
        onClick={() => fileInputRef.current?.click()}
        style={clinicMode ? { width: "100%", height: 52, fontSize: 16, borderRadius: 16 } : { height: 60, fontSize: 18 }}
      >
        <FileTextOutlined style={{ marginRight: 8 }} />
        {clinicMode ? "📷 Enviar receita" : "Enviar Receita (OCR)"}
      </Button>

      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={800}
        title={
          <Flex align="center" gap="small">
            <FileTextOutlined />
            <Text strong>Análise da Receita</Text>
          </Flex>
        }
      >
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          {/* Preview da imagem */}
          {previewImage && (
            <Card title="Imagem da Receita" size="small">
              <div style={{ textAlign: "center" }}>
                <img
                  src={previewImage}
                  alt="Receita"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 400,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                  }}
                />
              </div>
            </Card>
          )}

          {/* Loading */}
          {isProcessing && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Processando receita com IA...</Text>
              </div>
            </div>
          )}

          {/* Resultado do OCR */}
          {ocrResult && !isProcessing && (
            <Card title="Informações Extraídas" size="small">
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                {/* Informações da receita */}
                <div>
                  <Text strong>Data da Receita: </Text>
                  <Text>{ocrResult.prescription_date || "Não informado"}</Text>
                </div>
                {ocrResult.veterinarian_name && (
                  <div>
                    <Text strong>Veterinário: </Text>
                    <Text>{ocrResult.veterinarian_name}</Text>
                    {ocrResult.veterinarian_crmv && (
                      <Text type="secondary"> (CRMV: {ocrResult.veterinarian_crmv})</Text>
                    )}
                  </div>
                )}
                {ocrResult.clinic_name && (
                  <div>
                    <Text strong>Clínica: </Text>
                    <Text>{ocrResult.clinic_name}</Text>
                  </div>
                )}

                {/* Medicamentos */}
                <div>
                  <Flex justify="space-between" align="center">
                    <Text strong style={{ fontSize: 16 }}>Medicamentos Encontrados:</Text>
                    {!isEditing && (
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={handleEdit}
                        size="small"
                      >
                        Editar
                      </Button>
                    )}
                  </Flex>
                  <Space orientation="vertical" size="small" style={{ width: "100%", marginTop: 12 }}>
                    {(editedData?.medications || ocrResult.medications).map((med, index) => (
                      <Card key={index} size="small" style={{ backgroundColor: isEditing ? "#fff" : "#f9f9f9" }}>
                        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                          <Flex justify="space-between" align="center">
                            <Flex align="center" gap="small">
                              <Tag color="blue">{index + 1}</Tag>
                              {isEditing ? (
                                <Input
                                  value={med.medication_name}
                                  onChange={(e) => updateMedication(index, 'medication_name', e.target.value)}
                                  placeholder="Nome do medicamento"
                                  style={{ fontSize: 15, fontWeight: 'bold' }}
                                />
                              ) : (
                                <Text strong style={{ fontSize: 15 }}>{med.medication_name}</Text>
                              )}
                            </Flex>
                            {isEditing && (editedData?.medications || []).length > 1 && (
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeMedication(index)}
                                size="small"
                              />
                            )}
                          </Flex>

                          <Space wrap style={{ width: "100%" }}>
                            <div style={{ minWidth: 200 }}>
                              <Text type="secondary">Dosagem: </Text>
                              {isEditing ? (
                                <Input
                                  value={med.dosage || ""}
                                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                  placeholder="ex: 10mg"
                                  size="small"
                                />
                              ) : (
                                <Text>{med.dosage || "Não informado"}</Text>
                              )}
                            </div>

                            <div style={{ minWidth: 200 }}>
                              <Text type="secondary">Frequência: </Text>
                              {isEditing ? (
                                <Input
                                  value={med.frequency || ""}
                                  onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                  placeholder="ex: 2x ao dia"
                                  size="small"
                                />
                              ) : (
                                <Text>{med.frequency || "Não informado"}</Text>
                              )}
                            </div>
                          </Space>

                          <Space wrap style={{ width: "100%" }}>
                            <div style={{ minWidth: 150 }}>
                              <Text type="secondary">Duração: </Text>
                              {isEditing ? (
                                <InputNumber
                                  value={med.duration_days}
                                  onChange={(value) => updateMedication(index, 'duration_days', value)}
                                  placeholder="dias"
                                  size="small"
                                  min={1}
                                />
                              ) : (
                                <Text>{med.duration_days ? `${med.duration_days} dias` : "Não informado"}</Text>
                              )}
                            </div>

                            <div style={{ minWidth: 150 }}>
                              <Text type="secondary">Via: </Text>
                              {isEditing ? (
                                <Select
                                  value={med.route || ""}
                                  onChange={(value) => updateMedication(index, 'route', value)}
                                  placeholder="Selecionar"
                                  size="small"
                                  style={{ width: 120 }}
                                >
                                  <Select.Option value="oral">Oral</Select.Option>
                                  <Select.Option value="tópico">Tópico</Select.Option>
                                  <Select.Option value="injetável">Injetável</Select.Option>
                                  <Select.Option value="oftálmico">Oftálmico</Select.Option>
                                  <Select.Option value="otológico">Otológico</Select.Option>
                                </Select>
                              ) : (
                                <Text>{med.route || "Não informado"}</Text>
                              )}
                            </div>
                          </Space>

                          <div>
                            <Text type="secondary">Instruções: </Text>
                            {isEditing ? (
                              <Input.TextArea
                                value={med.instructions || ""}
                                onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                                placeholder="Instruções adicionais de uso"
                                rows={2}
                                style={{ width: "100%", marginTop: 4 }}
                              />
                            ) : (
                              <Text style={{ display: "block", marginTop: 4 }}>
                                {med.instructions || "Não informado"}
                              </Text>
                            )}
                          </div>
                        </Space>
                      </Card>
                    ))}

                    {isEditing && (
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={addMedication}
                        block
                      >
                        Adicionar Medicamento
                      </Button>
                    )}
                  </Space>
                </div>

                {/* Observações */}
                {ocrResult.notes && (
                  <div>
                    <Text strong>Observações: </Text>
                    <Text>{ocrResult.notes}</Text>
                  </div>
                )}

                {/* Botões de ação */}
                <Flex justify="flex-end" gap="small" style={{ marginTop: 16 }}>
                  <Button onClick={handleCancel}>Cancelar</Button>
                  {isEditing && (
                    <>
                      <Button onClick={handleCancelEdit}>Cancelar Edição</Button>
                      <Button type="primary" icon={<SaveOutlined />} onClick={handleConfirm}>
                        Salvar Alterações
                      </Button>
                    </>
                  )}
                  {!isEditing && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleConfirm}>
                      Confirmar e Salvar
                    </Button>
                  )}
                </Flex>
              </Space>
            </Card>
          )}
        </Space>
      </Modal>
    </>
  );
}
