"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * LOGIN FORM — Form di accesso con email e password.
 *
 * "use client" perché:
 * - useState per gestire i campi del form e gli errori
 * - useRouter per navigare dopo il login
 * - Event handlers (onSubmit, onChange)
 *
 * FLUSSO DI AUTENTICAZIONE:
 *
 * 1. L'utente compila email e password
 * 2. Al submit, chiamiamo supabase.auth.signInWithPassword()
 * 3. Supabase verifica le credenziali
 * 4. Se OK → Supabase salva un JWT nei cookies
 *    Se errore → mostriamo il messaggio di errore
 * 5. Dopo il login, router.push("/dashboard") porta alla dashboard
 * 6. router.refresh() forza Next.js a ri-renderizzare
 *    i Server Components con la nuova sessione
 */

export default function LoginForm() {
  /*
   * STATE DEL FORM
   *
   * In React, i form possono essere "controllati" o "non controllati":
   *
   * Controllato: ogni campo ha il suo useState, il valore è sempre
   * sincronizzato con lo state React → pieno controllo, ma verboso.
   *
   * Non controllato: React non traccia il valore, lo leggi al submit
   * con FormData → meno codice, ma meno controllo.
   *
   * Qui usiamo un approccio ibrido: un singolo oggetto `form` per
   * raggruppare tutti i campi. È un buon compromesso tra controllo
   * e semplicità.
   */
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  /*
   * HANDLER: Aggiorna un campo del form.
   *
   * Quando l'utente scrive nell'input email, React chiama:
   *   onChange → handleChange → setForm({ ...form, email: "nuovo valore" })
   *
   * Il "..." (spread operator) copia tutti i campi esistenti
   * e sovrascrive SOLO quello che è cambiato.
   *
   * Senza spread: setForm({ email: "abc" }) cancellerebbe password!
   * Con spread: setForm({ ...form, email: "abc" }) mantiene password.
   */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Resetta l'errore quando l'utente ricomincia a scrivere
    if (error) setError(null);
  }

  /*
   * HANDLER: Submit del form.
   *
   * async perché supabase.auth.signInWithPassword() è una
   * Promise (chiamata di rete al server Supabase).
   *
   * e.preventDefault() impedisce al browser di ricaricare
   * la pagina (comportamento default dei form HTML).
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        /*
         * TRADUZIONE ERRORI
         *
         * Supabase restituisce errori in inglese.
         * Li traduciamo in italiano per l'utente.
         * Gestiamo i casi più comuni; per il resto,
         * mostriamo il messaggio originale.
         */
        if (authError.message === "Invalid login credentials") {
          setError("Email o password non corretti.");
        } else if (authError.message === "Email not confirmed") {
          setError("Devi confermare la tua email prima di accedere. Controlla la casella di posta.");
        } else {
          setError(authError.message);
        }
        return;
      }

      /*
       * LOGIN RIUSCITO!
       *
       * router.refresh() → forza Next.js a ri-eseguire i Server
       * Components. Senza questo, i componenti server vedrebbero
       * ancora la sessione vecchia (non loggata) perché sono cachati.
       *
       * router.push("/dashboard") → naviga alla dashboard.
       */
      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      /*
       * FINALLY esegue SEMPRE, sia in caso di successo che errore.
       * Rimettiamo loading a false per riabilitare il bottone.
       */
      setLoading(false);
    }
  }

  return (
    <div className="card">
      {/* Header del form */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Bentornato
        </h1>
        <p className="text-text-secondary">
          Accedi per continuare i tuoi duelli
        </p>
      </div>

      {/*
       * MESSAGGIO DI ERRORE
       *
       * Appare solo se `error` non è null.
       * Sfondo rosso chiaro + testo rosso scuro → feedback visivo
       * chiaro senza essere aggressivo.
       *
       * role="alert" → dice agli screen reader che questo è
       * un messaggio importante che deve essere letto subito.
       */}
      {error && (
        <div
          role="alert"
          className="mb-6 p-3 rounded-md bg-danger-50 text-danger-800 text-sm animate-fade-in"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/*
         * SPACE-Y-5
         *
         * Aggiunge 20px di spazio verticale tra ogni figlio diretto.
         * È come mettere mb-5 su ogni elemento, ma più pulito.
         * Funziona con il "lobotomized owl" selector: * + * { margin-top }.
         */}

        {/* Campo Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Email
          </label>
          {/*
           * HTMLFOR + ID
           *
           * Il `htmlFor` sulla label e l'`id` sull'input li collegano.
           * Cliccando sulla label "Email", il browser mette il focus
           * sull'input → migliore UX, specialmente su mobile.
           */}
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="mario@esempio.it"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-md border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
          />
        </div>

        {/* Campo Password */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-text-secondary"
            >
              Password
            </label>
            <a
              href="#"
              className="text-xs text-brand-600 hover:text-brand-800 transition-colors"
            >
              Password dimenticata?
            </a>
          </div>
          {/*
           * CAMPO PASSWORD CON TOGGLE VISIBILITÀ
           *
           * Il div `relative` contiene l'input e il bottone occhio.
           * Il bottone è posizionato in `absolute` dentro il div,
           * così si sovrappone all'input a destra.
           *
           * type={showPassword ? "text" : "password"}
           * → alterna tra nascondere e mostrare la password.
           *
           * pr-11 sull'input → padding right extra per fare spazio
           * al bottone occhio senza che il testo finisca sotto.
           */}
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="La tua password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 pr-11 rounded-md border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Bottone Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "btn-primary w-full text-base py-3",
            loading && "opacity-70 cursor-not-allowed"
          )}
        >
          {/*
           * STATO DI LOADING
           *
           * Quando il form è in invio:
           * - Il bottone mostra uno spinner (Loader2 con animate-spin)
           * - Il bottone è disabilitato (disabled={loading})
           * - Opacità ridotta per feedback visivo
           *
           * Senza loading state, l'utente potrebbe cliccare
           * più volte e inviare richieste duplicate.
           */}
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <LogIn size={18} className="mr-2" />
              Accedi
            </>
          )}
        </button>
      </form>

      {/* Link alla registrazione */}
      <p className="mt-6 text-center text-sm text-text-secondary">
        Non hai un account?{" "}
        <Link
          href="/register"
          className="text-brand-600 font-medium hover:text-brand-800 transition-colors"
        >
          Registrati
        </Link>
      </p>
    </div>
  );
}
