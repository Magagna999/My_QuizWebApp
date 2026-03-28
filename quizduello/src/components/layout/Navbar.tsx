"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/*
 * NAVBAR
 *
 * La barra di navigazione in alto nella landing page.
 *
 * Comportamento responsive:
 * - Desktop (md+): logo a sinistra, link al centro, bottoni a destra
 * - Mobile: logo a sinistra, hamburger a destra, menu a comparsa
 *
 * "use client" è necessario perché usiamo useState per il menu mobile.
 * In Next.js 14, i componenti sono Server Components di default.
 * Quando serve interattività (click, state), aggiungi "use client".
 */
export default function Navbar() {
  // Stato per aprire/chiudere il menu mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <Link href="/" className="font-display font-bold text-xl text-gray-900">
            Quiz<span className="text-brand-600">Duello</span>
          </Link>

          {/* LINK NAVIGAZIONE - visibili solo da md in su */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#come-funziona" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Come funziona
            </a>
            <a href="#categorie" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Categorie
            </a>
            <a href="#classifica" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Classifica
            </a>
          </div>

          {/* BOTTONI AUTH - visibili solo da md in su */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-800 transition-colors"
            >
              Registrati
            </Link>
          </div>

          {/* HAMBURGER MOBILE - visibile solo sotto md */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* MENU MOBILE ESPANDIBILE */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4 space-y-3">
            <a href="#come-funziona" className="block text-sm text-gray-600 py-2">
              Come funziona
            </a>
            <a href="#categorie" className="block text-sm text-gray-600 py-2">
              Categorie
            </a>
            <a href="#classifica" className="block text-sm text-gray-600 py-2">
              Classifica
            </a>
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="btn-secondary text-sm flex-1 text-center">
                Accedi
              </Link>
              <Link href="/register" className="btn-primary text-sm flex-1 text-center">
                Registrati
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
