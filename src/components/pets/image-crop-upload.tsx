"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Modal, Space, Typography, Slider } from "antd";
import { PictureOutlined, CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";

const { Text } = Typography;

type ImageCropUploadProps = {
  value?: string; // base64 image
  onChange?: (base64: string | null) => void;
  onRemove?: () => void;
};

function ImageCropUpload({ value, onChange, onRemove }: ImageCropUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 500; // Tamanho máximo da imagem comprimida
  const QUALITY = 0.8; // Qualidade de compressão JPEG

  // Inicializar com valor existente
  useEffect(() => {
    if (value && !previewUrl && !selectedFile) {
      setPreviewUrl(value);
    }
  }, [value]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setSelectedFile(file);
        
        // Calcular área de crop inicial (quadrado central)
        const minSize = Math.min(img.width, img.height);
        const initialCrop = {
          x: (img.width - minSize) / 2,
          y: (img.height - minSize) / 2,
          size: minSize,
        };
        setCropArea(initialCrop);
        
        // Calcular escala para caber no container
        const containerSize = 400;
        const imgScale = containerSize / Math.max(img.width, img.height);
        setScale(imgScale);
        
        setPreviewUrl(e.target?.result as string);
        setIsModalOpen(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;
    
    // Verificar se clicou dentro da área de crop
    if (
      mouseX >= cropArea.x &&
      mouseX <= cropArea.x + cropArea.size &&
      mouseY >= cropArea.y &&
      mouseY <= cropArea.y + cropArea.size
    ) {
      setIsDragging(true);
      setDragStart({ 
        x: mouseX - cropArea.x, 
        y: mouseY - cropArea.y 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;
    
    const newX = mouseX - dragStart.x;
    const newY = mouseY - dragStart.y;
    
    const newCropX = Math.max(0, Math.min(imageRef.current.width - cropArea.size, newX));
    const newCropY = Math.max(0, Math.min(imageRef.current.height - cropArea.size, newY));
    
    setCropArea({ ...cropArea, x: newCropX, y: newCropY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSizeChange = (newSize: number) => {
    if (!imageRef.current) return;
    
    const maxSize = Math.min(imageRef.current.width, imageRef.current.height);
    const clampedSize = Math.min(maxSize, Math.max(100, newSize));
    
    // Ajustar posição para manter dentro da imagem
    const newX = Math.min(imageRef.current.width - clampedSize, Math.max(0, cropArea.x));
    const newY = Math.min(imageRef.current.height - clampedSize, Math.max(0, cropArea.y));
    
    setCropArea({ x: newX, y: newY, size: clampedSize });
  };

  const cropAndCompress = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!imageRef.current || !canvasRef.current) {
        resolve("");
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }

      // Definir tamanho do canvas (quadrado)
      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;

      // Desenhar a área recortada redimensionada
      ctx.drawImage(
        imageRef.current,
        cropArea.x,
        cropArea.y,
        cropArea.size,
        cropArea.size,
        0,
        0,
        MAX_SIZE,
        MAX_SIZE
      );

      // Converter para base64 JPEG comprimido
      const base64 = canvas.toDataURL("image/jpeg", QUALITY);
      resolve(base64);
    });
  };

  const handleConfirm = async () => {
    const croppedBase64 = await cropAndCompress();
    onChange?.(croppedBase64);
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(croppedBase64);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onChange?.(null);
    onRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!previewUrl) {
    return (
      <div>
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
          icon={<PictureOutlined />}
          onClick={() => fileInputRef.current?.click()}
          style={{ height: 60, fontSize: 18 }}
        >
          <PictureOutlined style={{ marginRight: 8 }} />
          Adicionar Foto
        </Button>
      </div>
    );
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%", textAlign: "center" }}>
      <div style={{ display: "inline-block", position: "relative" }}>
        <img
          src={previewUrl}
          alt="Preview"
          style={{
            width: 200,
            height: 200,
            objectFit: "cover",
            borderRadius: 10,
            border: "3px solid #667eea",
          }}
        />
        <Button
          type="primary"
          danger
          size="small"
          icon={<CloseOutlined />}
          onClick={handleRemove}
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            borderRadius: "50%",
            width: 32,
            height: 32,
          }}
        />
      </div>

      <Button
        type="default"
        size="large"
        icon={<EditOutlined />}
        onClick={() => {
          if (previewUrl) {
            // Se já tem foto, reabrir o crop
            const img = new Image();
            img.onload = () => {
              imageRef.current = img;
              const minSize = Math.min(img.width, img.height);
              setCropArea({
                x: (img.width - minSize) / 2,
                y: (img.height - minSize) / 2,
                size: minSize,
              });
              const containerSize = 400;
              setScale(containerSize / Math.max(img.width, img.height));
              setIsModalOpen(true);
            };
            img.src = previewUrl;
          } else {
            fileInputRef.current?.click();
          }
        }}
      >
        Editar Foto
      </Button>

      <Modal
        title="Recortar Foto"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={
          <Space>
            <Button onClick={handleCancel}>Cancelar</Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm}>
              Confirmar
            </Button>
          </Space>
        }
        width={600}
        destroyOnClose
      >
        {previewUrl && imageRef.current && (
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: 400,
                height: 400,
                margin: "0 auto",
                border: "2px solid #d9d9d9",
                borderRadius: 8,
                overflow: "hidden",
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  position: "absolute",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <img
                  src={previewUrl}
                  alt="Crop"
                  style={{
                    display: "block",
                    maxWidth: "none",
                  }}
                />
                {/* Overlay de crop */}
                <div
                  style={{
                    position: "absolute",
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.size,
                    height: cropArea.size,
                    border: "3px solid #1677ff",
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                    cursor: "move",
                  }}
                />
                {/* Pontos de controle */}
                <div
                  style={{
                    position: "absolute",
                    left: cropArea.x + cropArea.size - 8,
                    top: cropArea.y + cropArea.size - 8,
                    width: 16,
                    height: 16,
                    background: "#1677ff",
                    border: "2px solid white",
                    borderRadius: "50%",
                    cursor: "nwse-resize",
                  }}
                />
              </div>
            </div>

            <div style={{ padding: "0 20px" }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Tamanho do recorte: {Math.round(cropArea.size)}px
              </Text>
              <Slider
                min={100}
                max={Math.min(imageRef.current.width, imageRef.current.height)}
                value={cropArea.size}
                onChange={handleSizeChange}
                step={10}
              />
            </div>

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
            <Button onClick={() => fileInputRef.current?.click()}>Trocar Imagem</Button>
          </Space>
        )}
      </Modal>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Space>
  );
}

export { ImageCropUpload };
export default ImageCropUpload;
