# Prompt — Claude no Chrome (extensão): atualizar emails no Supabase Auth

> Cole o texto abaixo na extensão "Claude for Chrome" depois de abrir a aba do
> Supabase Dashboard (https://supabase.com/dashboard).
> O Claude vai navegar e editar os usuários pra você. Antes de salvar
> cada alteração, ele vai pedir confirmação.

---

## Prompt (copia daqui pra baixo)

Você tem acesso à aba ativa do Chrome no Supabase Dashboard
(https://supabase.com/dashboard). Preciso atualizar o **email de login** de 2
funcionários no projeto IdeMaq (URL: https://yfbbruxqfzgetapbvrgd.supabase.co).

**Funcionários a atualizar**:

| Apelido (provável) | Papel       | Novo email                          |
|---|---|---|
| Alessandro         | logistica   | `alessandrosilvamelo19@gmail.com`   |
| Guilherme          | oficina     | `guilhermecover56@gmail.com`        |

**Passos que quero que você execute**:

1. Garanta que o projeto **idemaq** (URL `yfbbruxqfzgetapbvrgd`) está
   selecionado. Se não estiver, troque pra ele.
2. Vá para **Authentication → Users** na sidebar.
3. Localize o usuário do **Alessandro** (provavelmente o email atual contém
   "alessandro" ou tem `raw_user_meta_data` indicando isso — me confirme antes
   de prosseguir caso a identificação não seja óbvia).
4. Abra o usuário, vá em **Edit user** (ou equivalente — pode ser o menu "⋯"),
   substitua o campo **Email** por `alessandrosilvamelo19@gmail.com` e
   **PARE** — me mostre o que vai salvar antes de clicar em Save. Aguarde meu
   "ok".
5. Repita pro **Guilherme** com email `guilhermecover56@gmail.com`.

**Regras importantes**:

- **Nunca apague nada nem use a opção "Delete user"**. Só editar email.
- Se a UI pedir confirmação por senha, me avise — eu autentico do meu lado.
- Se a UI mostrar 2 botões parecidos ("Send password recovery", "Send magic
  link", "Edit user"), **escolha "Edit user"**. Os outros enviam emails pro
  usuário, mas não trocam o endereço.
- Se aparecer "Auto-confirm new email?" ou similar, **marcar SIM**
  (auto-confirm) — esses funcionários não vão clicar em link de confirmação;
  é login interno.
- Se a UI fizer logout/login dos funcionários ao trocar email, tudo bem —
  eles vão usar o email novo na próxima entrada.

**Quando terminar**, me mande:
1. Print/screenshot dos 2 usuários com os emails novos visíveis em
   Authentication → Users.
2. Confirmação se algum email auto-confirm ficou pendente.

Não rode nenhum SQL — a parte SQL da tabela `usuarios` eu vou rodar
separadamente pelo SQL Editor.

---

## Por que isso é necessário

O Supabase mantém o email do login em `auth.users` (gerenciado pelo serviço
de Auth, não acessível pelo SQL comum) e a tabela do app `usuarios` no schema
público (essa eu atualizo via SQL em `sql/12-atualizar-emails-funcionarios.sql`).
Os 2 precisam ficar sincronizados pra o funcionário entrar com o email novo
**e** o sistema reconhecer o `id` certo.

## Fallback (se a extensão Claude não estiver disponível)

Fazer manualmente:

1. Abrir https://supabase.com/dashboard/project/yfbbruxqfzgetapbvrgd/auth/users
2. Procurar Alessandro → "⋯" → Edit user → Email = `alessandrosilvamelo19@gmail.com` → Save
3. Procurar Guilherme → "⋯" → Edit user → Email = `guilhermecover56@gmail.com` → Save
4. Marcar "Auto-confirm" se aparecer.

Depois, rodar `sql/12-atualizar-emails-funcionarios.sql` no SQL Editor.
