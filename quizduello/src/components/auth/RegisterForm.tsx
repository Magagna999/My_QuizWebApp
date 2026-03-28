"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, UserPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * REGISTER FORM — Form di registrazione con validazione.
 *
 * Questo form ha PIÙ logica del login perché:
 * 1. Ha un campo in più (username)
 * 2. Ha validazione della password in tempo reale
 * 3. Dopo la registrazione, crea anche il profilo utente
 *
 * FLUSSO DI REGISTRAZIONE:
 *
 * 1. L'utente compila username, email, password
 * 2. Validazione client-side (password forte, campi completi)
 * 3. supabase.auth.signUp() crea l'utente in auth.users
 * 4. Un trigger nel database crea automaticamente la riga
 *    in `profiles` con username e ELO iniziale 1000
 *    (lo configureremo nella fase database)
 * 5. Redirect alla dashboard (o pagina di conferma email)
 */

/*
 * REGOLE DI VALIDAZIONE PASSWORD
 *
 * Definite come array di oggetti, ognuno con:
 * - label: testo mostrato all'utente
 * - test: funzione che riceve la password e restituisce true/false
 *
 * Perché un array? Così possiamo mapparlo nel JSX e mostrare
 * una checklist visiva di requisiti soddisfatti/non soddisfatti.
 */
const PASSWORD_RULES = [
  { label: "Almeno 8 caratteri", test: (pw: string) => pw.length >= 8 },
  { label: "Una lettera maiuscola", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Un numero", test: (pw: string) => /[0-9]/.test(pw) },
];

export default function RegisterForm() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /*
   * SUCCESS STATE
   *
   * Dopo la registrazione, se il progetto Supabase richiede
   * la conferma email, mostriamo un messaggio di successo
   * invece di redirectare direttamente alla dashboard.
   */
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  }

  /*
   * VALIDAZIONE USERNAME
   *
   * Regole:
   * - Solo lettere, numeri, underscore
   * - Tra 3 e 20 caratteri
   * - Niente spazi o caratteri speciali
   *
   * Il regex ^[a-zA-Z0-9_]{3,20}$ controlla tutto in una volta:
   * ^ = inizio stringa
   * [a-zA-Z0-9_] = set di caratteri ammessi
   * {3,20} = ripetuto da 3 a 20 volte
   * $ = fine stringa
   */
  function isUsernameValid(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  }

  /*
   * VALIDAZIONE PASSWORD
   *
   * Controlla che TUTTE le regole siano soddisfatte.
   * .every() restituisce true solo se la funzione test
   * restituisce true per OGNI elemento dell'array.
   */
  function isPasswordValid(password: string): boolean {
    return PASSWORD_RULES.every((rule) => rule.test(password));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validazione client-side PRIMA di chiamare Supabase
    if (!isUsernameValid(form.username)) {
      setError(
        "Username non valido: usa solo lettere, numeri e underscore (3-20 caratteri)."
      );
      return;
    }

    if (!isPasswordValid(form.password)) {
      setError("La password non soddisfa tutti i requisiti.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      /*
       * SIGN UP CON METADATA
       *
       * Il campo `data` in options permette di passare dati extra
       * che verranno salvati in auth.users.raw_user_meta_data.
       *
       * Il trigger database (che creeremo dopo) leggerà lo username
       * da qui per creare la riga in `profiles`.
       *
       * Perché non facciamo un INSERT diretto in profiles?
       * Perché l'utente non ha ancora una sessione! Solo dopo
       * il signUp Supabase crea la riga in auth.users e genera
       * il JWT. Il trigger si attiva DOPO e crea il profilo.
       */
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            username: form.username,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("Questa email è già registrata. Prova ad accedere.");
        } else {
          setError(authError.message);
        }
        return;
      }

      /*
       * REGISTRAZIONE RIUSCITA!
       *
       * Due scenari possibili (dipende da come configuri Supabase):
       *
       * A) Conferma email ABILITATA (default)
       *    → Mostriamo il messaggio di successo
       *    → L'utente deve cliccare il link nell'email
       *
       * B) Conferma email DISABILITATA (per sviluppo)
       *    → L'utente è già loggato
       *    → Redirect diretto alla dashboard
       *
       * Per semplicità, mostriamo sempre il messaggio di successo.
       * In fase di sviluppo puoi disabilitare la conferma email
       * dal dashboard Supabase → Authentication → Settings.
       */
      setSuccess(true);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  // Schermata di successo (post-registrazione)
  if (success) {
    return (
      <div className="card text-center py-10">
        <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-5">
          <Check size={32} className="text-success-600" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Registrazione completata!
        </h2>
        <p className="text-text-secondary mb-6 max-w-sm mx-auto">
          Ti abbiamo inviato un&apos;email di conferma. Clicca il link
          nell&apos;email per attivare il tuo account.
        </p>
        <Link href="/login" className="btn-primary">
          Vai al login
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Crea il tuo account
        </h1>
        <p className="text-text-secondary">
          Unisciti a QuizDuello e sfida i tuoi amici
        </p>
      </div>

      {/* Errore */}
      {error && (
        <div
          role="alert"
          className="mb-6 p-3 rounded-md bg-danger-50 text-danger-800 text-sm animate-fade-in"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="Il tuo nome in gioco"
            value={form.username}
            onChange={handleChange}
            className={cn(
              "w-full px-4 py-2.5 rounded-md border bg-surface-elevated text-text-primary placeholder:text-text-muted outline-none transition-all",
              form.username && !isUsernameValid(form.username)
                ? "border-danger-600 focus:ring-2 focus:ring-danger-600/20"
                : "border-border focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            )}
          />
          {/*
           * FEEDBACK INLINE
           *
           * Mostra un messaggio sotto il campo SOLO se l'utente
           * ha iniziato a scrivere e lo username non è valido.
           *
           * Non lo mostriamo se il campo è vuoto → evita
           * errori fastidiosi prima ancora che l'utente scriva.
           */}
          {form.username && !isUsernameValid(form.username) && (
            <p className="mt-1.5 text-xs text-danger-600">
              Solo lettere, numeri e underscore (3-20 caratteri)
            </p>
          )}
        </div>

        {/* Campo Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Email
          </label>
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
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Crea una password sicura"
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

          {/*
           * CHECKLIST REQUISITI PASSWORD
           *
           * Mostra i requisiti con icone colorate:
           * ✓ verde = soddisfatto
           * ✗ grigio = non ancora soddisfatto
           *
           * Si mostra SOLO quando l'utente ha iniziato a scrivere
           * la password (form.password.length > 0).
           *
           * PASSWORD_RULES.map() itera sulle regole e genera
           * un elemento per ognuna, con il colore che dipende
           * dal risultato di rule.test(password).
           */}
          {form.password.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(form.password);
                return (
                  <div
                    key={rule.label}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-colors",
                      passed ? "text-success-600" : "text-text-muted"
                    )}
                  >
                    {passed ? <Check size={14} /> : <X size={14} />}
                    {rule.label}
                  </div>
                );
              })}
            </div>
          )}
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
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <UserPlus size={18} className="mr-2" />
              Crea account
            </>
          )}
        </button>
      </form>

      {/* Link al login */}
      <p className="mt-6 text-center text-sm text-text-secondary">
        Hai già un account?{" "}
        <Link
          href="/login"
          className="text-brand-600 font-medium hover:text-brand-800 transition-colors"
        >
          Accedi
        </Link>
      </p>
    </div>
  );
}
