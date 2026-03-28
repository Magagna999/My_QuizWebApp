/*
 * SEED — Dati iniziali per sviluppo e test.
 *
 * Inserisce:
 * - 5 categorie di materie per concorsi PA
 * - 2 domande di esempio per categoria (con 4 risposte ciascuna)
 *
 * In produzione, le domande verranno aggiunte dall'admin panel.
 * Queste servono per testare il gameplay durante lo sviluppo.
 *
 * COME ESEGUIRE:
 * 1. Dal dashboard Supabase → SQL Editor → incolla e esegui
 * 2. Oppure con la CLI: supabase db seed
 */

-- ====== CATEGORIE ======

INSERT INTO public.categories (id, name, slug, icon, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Diritto Civile', 'diritto-civile', '⚖️', 'Codice civile, obbligazioni, contratti, responsabilità'),
  ('a1000000-0000-0000-0000-000000000002', 'Diritto Costituzionale', 'diritto-costituzionale', '🏛️', 'Costituzione italiana, organi dello Stato, diritti fondamentali'),
  ('a1000000-0000-0000-0000-000000000003', 'Economia Politica', 'economia-politica', '📊', 'Microeconomia, macroeconomia, politica economica'),
  ('a1000000-0000-0000-0000-000000000004', 'Diritto Amministrativo', 'diritto-amministrativo', '📋', 'PA, procedimento amministrativo, atti e provvedimenti'),
  ('a1000000-0000-0000-0000-000000000005', 'Diritto Penale', 'diritto-penale', '🔒', 'Codice penale, reati, pene, procedura penale');

-- ====== DOMANDE DI ESEMPIO ======

-- Diritto Civile - Domanda 1
INSERT INTO public.questions (id, category_id, question_text, difficulty, explanation)
VALUES ('q1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
  'Quale articolo del Codice Civile disciplina la responsabilità extracontrattuale?',
  2, 'L''art. 2043 c.c. stabilisce: "Qualunque fatto doloso o colposo, che cagiona ad altri un danno ingiusto, obbliga colui che ha commesso il fatto a risarcire il danno."');

INSERT INTO public.answers (question_id, answer_text, is_correct, position) VALUES
  ('q1000000-0000-0000-0000-000000000001', 'Art. 1218', false, 1),
  ('q1000000-0000-0000-0000-000000000001', 'Art. 2043', true, 2),
  ('q1000000-0000-0000-0000-000000000001', 'Art. 1176', false, 3),
  ('q1000000-0000-0000-0000-000000000001', 'Art. 2059', false, 4);

-- Diritto Civile - Domanda 2
INSERT INTO public.questions (id, category_id, question_text, difficulty, explanation)
VALUES ('q1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
  'Qual è il termine di prescrizione ordinario secondo il Codice Civile?',
  1, 'L''art. 2946 c.c. stabilisce che il termine di prescrizione ordinario è di 10 anni, salvo che la legge disponga diversamente.');

INSERT INTO public.answers (question_id, answer_text, is_correct, position) VALUES
  ('q1000000-0000-0000-0000-000000000002', '5 anni', false, 1),
  ('q1000000-0000-0000-0000-000000000002', '10 anni', true, 2),
  ('q1000000-0000-0000-0000-000000000002', '15 anni', false, 3),
  ('q1000000-0000-0000-0000-000000000002', '20 anni', false, 4);

-- Diritto Costituzionale - Domanda 1
INSERT INTO public.questions (id, category_id, question_text, difficulty, explanation)
VALUES ('q1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002',
  'In quale anno è stata approvata la Costituzione della Repubblica Italiana?',
  1, 'La Costituzione fu approvata dall''Assemblea Costituente il 22 dicembre 1947 ed entrò in vigore il 1° gennaio 1948.');

INSERT INTO public.answers (question_id, answer_text, is_correct, position) VALUES
  ('q1000000-0000-0000-0000-000000000003', '1946', false, 1),
  ('q1000000-0000-0000-0000-000000000003', '1947', true, 2),
  ('q1000000-0000-0000-0000-000000000003', '1948', false, 3),
  ('q1000000-0000-0000-0000-000000000003', '1950', false, 4);

-- Diritto Costituzionale - Domanda 2
INSERT INTO public.questions (id, category_id, question_text, difficulty, explanation)
VALUES ('q1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002',
  'Quanti articoli contiene la Costituzione italiana?',
  2, 'La Costituzione contiene 139 articoli, divisi in: Principi Fondamentali (1-12), Parte I - Diritti e Doveri (13-54), Parte II - Ordinamento della Repubblica (55-139), più 18 Disposizioni transitorie e finali.');

INSERT INTO public.answers (question_id, answer_text, is_correct, position) VALUES
  ('q1000000-0000-0000-0000-000000000004', '120', false, 1),
  ('q1000000-0000-0000-0000-000000000004', '139', true, 2),
  ('q1000000-0000-0000-0000-000000000004', '150', false, 3),
  ('q1000000-0000-0000-0000-000000000004', '175', false, 4);

-- Economia Politica - Domanda 1
INSERT INTO public.questions (id, category_id, question_text, difficulty, explanation)
VALUES ('q1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003',
  'Cosa misura il PIL (Prodotto Interno Lordo)?',
  1, 'Il PIL misura il valore totale di tutti i beni e servizi finali prodotti all''interno di un Paese in un determinato periodo di tempo (generalmente un anno).');

INSERT INTO public.answers (question_id, answer_text, is_correct, position) VALUES
  ('q1000000-0000-0000-0000-000000000005', 'Il debito pubblico di un Paese', false, 1),
  ('q1000000-0000-0000-0000-000000000005', 'Il valore dei beni e servizi prodotti in un Paese', true, 2),
  ('q1000000-0000-0000-0000-000000000005', 'Il reddito medio dei cittadini', false, 3),
  ('q1000000-0000-0000-0000-000000000005', 'Il tasso di disoccupazione', false, 4);

-- Economia Politica - Domanda 2
INSERT INTO public.questions (id, category_id, question_text, difficulty, explanation)
VALUES ('q1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003',
  'Quale organo approva il bilancio dello Stato in Italia?',
  2, 'Secondo l''art. 81 della Costituzione, il Parlamento approva ogni anno i bilanci e il rendiconto consuntivo presentati dal Governo.');

INSERT INTO public.answers (question_id, answer_text, is_correct, position) VALUES
  ('q1000000-0000-0000-0000-000000000006', 'Il Presidente della Repubblica', false, 1),
  ('q1000000-0000-0000-0000-000000000006', 'Il Parlamento', true, 2),
  ('q1000000-0000-0000-0000-000000000006', 'La Corte dei Conti', false, 3),
  ('q1000000-0000-0000-0000-000000000006', 'Il Consiglio dei Ministri', false, 4);
