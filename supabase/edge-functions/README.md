# Edge Functions

Este diretório concentra as edge functions que serão publicadas no projeto Supabase.

## `chatbot-command`

Recebe comandos estruturados do orquestrador/LLM e executa ações controladas (criar pets, registrar tratamentos, etc.). Espera payloads JSON no formato:

```json
{
  "action": "create_pet",
  "payload": {
    "userId": "<uuid do usuário>",
    "name": "Luna",
    "species": "cat",
    "birthdate": "2022-08-10"
  }
}
```

### Variáveis obrigatórias

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CHATBOT_SERVICE_SECRET` (opcional, mas recomendado para validar chamadas)

### Deploy

```
supabase functions deploy chatbot-command --project-ref wloyrmzstrhnmdbhdkxt
```

Para testar localmente:

```
supabase functions serve chatbot-command --env-file ../../.env
```

Lembre de criar `.env` na raiz com as chaves corretas antes de rodar o `serve`.

