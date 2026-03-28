import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

/*
 * LOGIN PAGE — /login
 *
 * Questa pagina è un Server Component (niente "use client").
 * Il suo unico lavoro è:
 * 1. Esportare i metadata per la SEO
 * 2. Renderizzare il LoginForm (che è un Client Component)
 *
 * PERCHÉ SEPARARE PAGE E FORM?
 *
 * La page è un Server Component → può esportare `metadata`
 * (i Client Components non possono).
 *
 * Il form è un Client Component → può usare useState, gestire
 * eventi, chiamare Supabase dal browser.
 *
 * Questa separazione è un pattern fondamentale di Next.js 14:
 * "Server Component sottile che wrappa un Client Component grasso."
 *
 * Il vantaggio: i metadata vengono generati sul server (SEO),
 * ma l'interattività funziona nel browser.
 */

export const metadata: Metadata = {
  title: "Accedi",
};

export default function LoginPage() {
  return <LoginForm />;
}
