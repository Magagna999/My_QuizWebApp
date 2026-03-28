# ⚔️ QuizDuello

Webapp di duelli di conoscenza asincroni su materie universitarie e concorsi per la PA.

## Tech Stack

- **Next.js 14** (App Router) — Frontend + API routes
- **Supabase** — Auth, PostgreSQL, Realtime
- **Tailwind CSS** — Styling
- **TypeScript** — Type safety

## Setup (passo per passo)

### 1. Prerequisiti

Assicurati di avere installato:
- **Node.js** 18+ → [nodejs.org](https://nodejs.org/)
- **npm** (viene con Node.js)

Verifica con:
```bash
node --version   # deve mostrare v18.x.x o superiore
npm --version    # deve mostrare 9.x.x o superiore
```

### 2. Installa le dipendenze

```bash
cd quizduello
npm install
```

Questo scarica tutte le librerie elencate in `package.json` nella cartella `node_modules/`.

### 3. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com/) e crea un account gratuito
2. Clicca **New Project**
3. Scegli un nome (es. "quizduello") e una password per il database
4. Aspetta che il progetto venga creato (~2 minuti)
5. Vai su **Settings → API** e copia:
   - `Project URL` (es. `https://abc123.supabase.co`)
   - `anon public` key (la chiave lunga che inizia con `eyJ...`)
   - `service_role` key (⚠️ questa è segreta!)

### 4. Configura le variabili ambiente

```bash
cp .env.example .env.local
```

Apri `.env.local` e incolla i valori di Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...la-tua-chiave-anon
SUPABASE_SERVICE_ROLE_KEY=eyJ...la-tua-chiave-service-role
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Crea le tabelle nel database

Vai nel **SQL Editor** del tuo progetto Supabase ed esegui i file SQL **in questo ordine**:

1. `supabase/migrations/001_create_profiles.sql`
2. `supabase/migrations/002_create_categories.sql`
3. `supabase/migrations/003_create_questions.sql`
4. `supabase/migrations/004_create_duels.sql`
5. `supabase/migrations/005_rls_policies.sql`
6. `supabase/migrations/006_rpc_functions.sql`
7. `supabase/seed.sql` (dati di esempio)

⚠️ L'ordine è importante! Ogni tabella dipende dalla precedente.

### 6. (Opzionale) Disabilita la conferma email per sviluppo

Nel dashboard Supabase:
- **Authentication → Settings → Email Auth**
- Disattiva "Confirm email"

Così puoi registrarti e loggarti subito senza verificare l'email.

### 7. Avvia l'app

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

### 8. Crea il tuo utente admin

1. Registrati dall'app (http://localhost:3000/register)
2. Vai nel **SQL Editor** di Supabase ed esegui:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'TUO_USERNAME';
```

3. Ora puoi accedere al pannello admin su http://localhost:3000/admin

## Struttura del progetto

```
quizduello/
├── src/
│   ├── app/                    ← Pagine e route (Next.js App Router)
│   │   ├── page.tsx            ← Landing page (/)
│   │   ├── (auth)/             ← Login, Register, Callback
│   │   ├── (protected)/        ← Dashboard, Duello, Classifica, Profilo
│   │   ├── admin/              ← Pannello admin
│   │   └── api/                ← API Routes (duels, leaderboard, matchmaking)
│   ├── components/             ← Componenti React riusabili
│   │   ├── auth/               ← LoginForm, RegisterForm
│   │   ├── game/               ← QuestionCard, TimerCircle, GamePlay, ecc.
│   │   ├── admin/              ← CategoryForm, QuestionForm
│   │   └── layout/             ← Navbar
│   ├── hooks/                  ← Custom hooks (useTimer)
│   ├── lib/                    ← Logica core
│   │   ├── supabase/           ← Client browser + server
│   │   ├── duel-engine.ts      ← Logica duello (creazione, turni, completamento)
│   │   ├── elo.ts              ← Algoritmo ELO
│   │   ├── scoring.ts          ← Calcolo punti + bonus velocità
│   │   └── question-picker.ts  ← Selezione domande casuali
│   └── types/                  ← Tipi TypeScript
├── supabase/
│   ├── migrations/             ← 6 file SQL per creare le tabelle
│   └── seed.sql                ← Dati di esempio
└── file di configurazione      ← package.json, tailwind, tsconfig, ecc.
```

## Come funziona il gioco

1. **Sfida**: Un giocatore sfida un avversario (per username o casuale)
2. **5 round da 3 domande**: Ogni round ha una categoria, scelta a turno
3. **Timer 20 secondi**: Rispondi veloce per il bonus velocità (+5 punti max)
4. **Turni asincroni**: Gioca quando vuoi, l'avversario ha 48 ore per rispondere
5. **ELO**: Ogni vittoria/sconfitta aggiorna il rating. Battere i più forti vale di più.
