import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

/*
 * REGISTER PAGE — /register
 *
 * Stessa struttura della login page:
 * Server Component sottile → metadata SEO + render del form.
 */

export const metadata: Metadata = {
  title: "Registrati",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
