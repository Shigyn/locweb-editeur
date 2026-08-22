// Phase 3 — à remplacer par les vraies valeurs du projet Supabase "locweb-clients".
// L'anon key est publique par construction (RLS protège les données), donc sans risque
// de la committer dans ce repo, contrairement à la clé service_role qui ne doit
// JAMAIS apparaître ici.
export const SUPABASE_URL = 'https://ibqawtgnucakzdldnitj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_rpLrUo4Cqnfl8zSohDqO0A_Q5Vkj2Hk';

// Le Client ID OAuth n'est pas un secret — il apparait forcement dans
// l'URL de consentement que voit l'utilisateur, contrairement au Client
// Secret qui ne doit JAMAIS figurer dans un fichier servi au navigateur
// (voir supabase-functions/supabase/functions/oauth-google-echange).
export const GOOGLE_OAUTH_CLIENT_ID = '503802251793-baihl9p7jb4eq55t94uivkkcj3kqv7a0.apps.googleusercontent.com';
