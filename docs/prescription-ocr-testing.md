# Guia de Teste - Sistema de Receitas Médicas com OCR

## 📍 Onde está implementado

### 1. **Página de Criação de Tratamentos**
**Localização:** `/treatments/create`

**Arquivo:** `apps/web-next/src/app/(dashboard)/treatments/create/page.tsx`

**Como acessar:**
- Menu lateral → "Tratamentos" → Botão "Adicionar cuidado"
- Ou diretamente: `http://localhost:3000/treatments/create`

### 2. **Componente de Upload**
**Arquivo:** `apps/web-next/src/components/prescriptions/prescription-upload-ocr.tsx`

**Funcionalidades:**
- Upload de imagem de receita
- Processamento via OCR usando OpenAI Vision API
- Preview da imagem enviada
- Exibição dos dados extraídos
- Confirmação antes de salvar

### 3. **Edge Function (Backend)**
**Arquivo:** `supabase/functions/prescription-ocr/index.ts`

**Endpoint:** `https://wloyrmzstrhnmdbhdkxt.functions.supabase.co/prescription-ocr`

**O que faz:**
- Recebe imagem em base64
- Processa com OpenAI Vision API (GPT-4o)
- Extrai dados da receita
- Salva no banco de dados
- Cria tratamentos automáticos

## 🧪 Como Testar

### Passo 1: Acessar a página
1. Faça login no sistema
2. Vá para **Tratamentos** → **Adicionar cuidado**
3. Ou acesse diretamente: `/treatments/create`

### Passo 2: Selecionar um pet
1. No campo "Pet", selecione um pet da lista
2. Após selecionar, aparecerá a seção "Ou envie uma receita médica"

### Passo 3: Enviar receita
1. Clique no botão **"Enviar Receita (OCR)"**
2. Selecione uma imagem de receita veterinária (JPG, PNG, etc.)
3. Aguarde o processamento (pode levar alguns segundos)

### Passo 4: Revisar dados extraídos
1. Um modal abrirá mostrando:
   - Preview da imagem enviada
   - Dados extraídos (data, veterinário, medicamentos, etc.)
   - Lista de medicamentos encontrados
2. **Opcional**: Clique em **"Editar"** para modificar os medicamentos
   - Corrija erros da IA
   - Adicione ou remova medicamentos
   - Ajuste dosagens, frequências, vias de administração
3. Clique em **"Confirmar e Salvar"** (ou **"Salvar Alterações"** se editou)

### Passo 5: Verificar resultados
1. A receita será salva na tabela `pet_prescriptions`
2. Os medicamentos serão salvos na tabela `prescription_medications`
3. Tratamentos automáticos serão criados na tabela `pet_treatments`
4. Você será redirecionado para `/treatments`

## 🔍 Verificar no Banco de Dados

### Via Supabase Dashboard:
1. Acesse: https://supabase.com/dashboard/project/wloyrmzstrhnmdbhdkxt
2. Vá em **Table Editor**
3. Verifique as tabelas:
   - `pet_prescriptions` - receitas salvas
   - `prescription_medications` - medicamentos extraídos
   - `pet_treatments` - tratamentos criados automaticamente

### Via SQL:
```sql
-- Ver receitas cadastradas
SELECT * FROM pet_prescriptions ORDER BY created_at DESC;

-- Ver medicamentos de uma receita
SELECT * FROM prescription_medications 
WHERE prescription_id = '<id-da-receita>';

-- Ver tratamentos criados automaticamente
SELECT * FROM pet_treatments 
WHERE notes LIKE '%Receita%' 
ORDER BY created_at DESC;
```

## 📋 O que é extraído da receita

A IA extrai automaticamente:
- ✅ Data da receita
- ✅ Nome do veterinário
- ✅ CRMV do veterinário
- ✅ Nome da clínica
- ✅ Lista de medicamentos com:
  - Nome do medicamento
  - Dosagem (ex: "50mg", "1 comprimido")
  - Frequência (ex: "2x ao dia")
  - Duração em dias
  - Via de administração (Oral, Tópico, etc.)
  - Instruções adicionais
- ✅ Observações gerais

## ✏️ Editando os medicamentos encontrados

Após o processamento da imagem, você pode **editar todas as informações** antes de salvar:

### Como editar:
1. Clique no botão **"Editar"** ao lado de "Medicamentos Encontrados"
2. Os campos se tornam editáveis:
   - **Nome do medicamento**: Campo de texto
   - **Dosagem**: Campo de texto (ex: "10mg", "2 gotas")
   - **Frequência**: Campo de texto (ex: "2x ao dia", "a cada 8 horas")
   - **Duração**: Campo numérico em dias
   - **Via**: Seleção (Oral, Tópico, Injetável, etc.)
   - **Instruções**: Área de texto para detalhes adicionais

### Funcionalidades de edição:
- ✅ **Editar medicamentos existentes**: Clique em qualquer campo para modificá-lo
- ✅ **Adicionar medicamentos**: Botão "Adicionar Medicamento" para incluir novos
- ✅ **Remover medicamentos**: Botão "X" vermelho ao lado de cada medicamento (mantém pelo menos 1)
- ✅ **Cancelar edição**: Volta aos dados originais da IA
- ✅ **Salvar alterações**: Envia os dados editados para o sistema

### Dicas de edição:
- Corrija erros de reconhecimento da IA
- Adicione medicamentos que a IA não encontrou
- Ajuste dosagens, frequências ou instruções
- Selecione a via correta de administração
- Adicione instruções específicas de uso

## ⚠️ Requisitos para funcionar

1. **OpenAI API Key configurada:**
   - Variável `OPENAI_API_KEY` no Supabase
   - Edge function `prescription-ocr` deployada

2. **Migrações aplicadas:**
   - Tabelas `pet_prescriptions` e `prescription_medications` criadas

3. **Usuário autenticado:**
   - Precisa estar logado
   - O pet selecionado deve pertencer ao usuário

## 🐛 Troubleshooting

### Erro: "Erro ao processar receita"
- Verifique se a `OPENAI_API_KEY` está configurada no Supabase
- Verifique se a edge function está deployada
- Verifique os logs da edge function no Supabase Dashboard

### Erro: "Nenhum medicamento encontrado na receita"
- A imagem pode estar muito escura ou ilegível
- Tente com uma imagem de melhor qualidade
- Certifique-se de que a receita está em português brasileiro

### Erro: "Pet não encontrado ou não pertence ao usuário"
- Verifique se o pet selecionado pertence ao usuário logado
- Verifique se o `petId` está correto

## 📸 Exemplo de uso

1. Tire uma foto de uma receita veterinária
2. Acesse `/treatments/create`
3. Selecione o pet
4. Clique em "Enviar Receita (OCR)"
5. Selecione a foto
6. Aguarde o processamento
7. **Edite os medicamentos se necessário** (corrija erros da IA)
8. Revise e confirme
9. Pronto! Tratamentos criados automaticamente
