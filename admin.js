// Phase 3 — squelette de l'interface d'administration centralisée.
// Schéma réel (vérifié dans Supabase le 2026-07-15) :
//   clients(id, nom_site, domaine, auth_user_id, date_creation)
//   contenu_site(id, client_id, cle_bloc, valeur, type, date_maj)   -- type: 'texte' | 'image'
//   produits(id, client_id, nom, prix, description, image_url, stock, categorie)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { MANIFEST, GROUP_ORDER } from './manifest.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('login-form');
const errorEl = document.getElementById('error');
const app = document.getElementById('app');
const statusEl = document.getElementById('status');

let clientId = null;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = 'Identifiants incorrects.';
    return;
  }
  await afterLogin();
});

document.getElementById('logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

document.querySelectorAll('nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.panel}`).classList.add('active');
  });
});

async function afterLogin() {
  const { data: { user } } = await supabase.auth.getUser();

  // RLS restreint déjà cette lecture au client du user connecté ; le filtre
  // ci-dessous n'est qu'une précision de la requête, pas la barrière de sécurité.
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, nom_site')
    .eq('auth_user_id', user.id)
    .single();

  if (clientError || !client) {
    errorEl.textContent = "Aucun client associé à ce compte.";
    return;
  }

  clientId = client.id;
  loginForm.style.display = 'none';
  app.style.display = 'block';

  await loadTextes();
  await loadImages();
  await loadProduits();
}

async function loadTextes() {
  const { data, error } = await supabase
    .from('contenu_site')
    .select('id, cle_bloc, valeur')
    .eq('client_id', clientId)
    .eq('type', 'texte');

  const container = document.getElementById('textes-list');
  container.innerHTML = '';

  if (error) {
    container.textContent = 'Erreur de chargement du contenu.';
    return;
  }

  if (data.length === 0) {
    container.textContent = 'Aucun texte balisé pour ce site.';
    return;
  }

  // Regroupe par section du manifeste (purement cosmétique, voir manifest.js)
  const groupes = new Map();
  data.forEach((item) => {
    const meta = MANIFEST[item.cle_bloc];
    const groupe = meta?.groupe ?? 'Autres';
    if (!groupes.has(groupe)) groupes.set(groupe, []);
    groupes.get(groupe).push({ ...item, label: meta?.label ?? item.cle_bloc });
  });

  const groupesTries = [...groupes.keys()].sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  );

  groupesTries.forEach((groupe, i) => {
    const details = document.createElement('details');
    details.className = 'groupe';
    details.open = i === 0;
    details.innerHTML = `<summary>${groupe}</summary>`;
    const body = document.createElement('div');
    body.className = 'groupe-body';

    groupes.get(groupe).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'row';
      const long = (item.valeur ?? '').length > 60 || (item.valeur ?? '').includes('\n');
      row.innerHTML = `
        <label>${item.label}</label>
        ${long
          ? `<textarea rows="3" data-id="${item.id}">${item.valeur ?? ''}</textarea>`
          : `<input type="text" value="${item.valeur ?? ''}" data-id="${item.id}">`}
      `;
      const field = row.querySelector('textarea, input');
      field.addEventListener('change', () => saveContenu(item.id, field.value));
      body.appendChild(row);
    });

    details.appendChild(body);
    container.appendChild(details);
  });
}

async function loadImages() {
  const { data, error } = await supabase
    .from('contenu_site')
    .select('id, cle_bloc, valeur')
    .eq('client_id', clientId)
    .eq('type', 'image');

  const container = document.getElementById('images-list');
  container.innerHTML = '';

  if (error) {
    container.textContent = 'Erreur de chargement des images.';
    return;
  }

  if (data.length === 0) {
    container.textContent = "Aucune zone image balisée pour ce site.";
    return;
  }

  data.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <label>${item.cle_bloc}</label>
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <img src="${item.valeur ?? ''}" alt="" style="height:44px;width:44px;object-fit:cover;border-radius:8px;background:#eee;border:1px solid var(--border);">
        <input type="file" accept="image/*" data-id="${item.id}">
      </div>
    `;
    const fileInput = row.querySelector('input[type=file]');
    const preview = row.querySelector('img');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const url = await uploadImage(file);
      if (url) {
        preview.src = url;
        await saveContenu(item.id, url);
      }
    });
    container.appendChild(row);
  });
}

async function uploadImage(file) {
  const path = `${clientId}/${Date.now()}_${file.name}`;
  statusEl.textContent = 'Envoi de l\'image…';
  const { error } = await supabase.storage.from('site-images').upload(path, file, { upsert: true });
  if (error) {
    statusEl.textContent = "Erreur lors de l'envoi de l'image.";
    return null;
  }
  const { data } = supabase.storage.from('site-images').getPublicUrl(path);
  return data.publicUrl;
}

async function saveContenu(id, valeur) {
  statusEl.textContent = 'Enregistrement…';
  const { error } = await supabase
    .from('contenu_site')
    .update({ valeur })
    .eq('id', id);
  statusEl.textContent = error ? 'Erreur lors de l\'enregistrement.' : 'Enregistré.';
}

async function loadProduits() {
  const { data, error } = await supabase
    .from('produits')
    .select('id, nom, prix, description, image_url, stock, categorie, disponible')
    .eq('client_id', clientId);

  const body = document.getElementById('produits-body');
  body.innerHTML = '';

  if (error) return;

  data.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${p.nom ?? ''}" data-field="nom" data-id="${p.id}"></td>
      <td><input type="number" step="0.01" value="${p.prix ?? ''}" data-field="prix" data-id="${p.id}"></td>
      <td><input type="text" value="${p.categorie ?? ''}" data-field="categorie" data-id="${p.id}"></td>
      <td><input type="number" value="${p.stock ?? ''}" data-field="stock" data-id="${p.id}"></td>
      <td>
        <img src="${p.image_url ?? ''}" alt="" style="height:32px;width:32px;object-fit:cover;border-radius:4px;background:#eee;vertical-align:middle;">
        <input type="file" accept="image/*" data-id="${p.id}" style="width:110px;">
      </td>
      <td><input type="text" value="${p.description ?? ''}" data-field="description" data-id="${p.id}"></td>
      <td style="text-align:center;"><input type="checkbox" data-field="disponible" data-id="${p.id}" ${p.disponible ? 'checked' : ''}></td>
      <td><button data-delete="${p.id}">Supprimer</button></td>
    `;
    body.appendChild(tr);

    const fileInput = tr.querySelector('input[type=file]');
    const preview = tr.querySelector('img');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const url = await uploadImage(file);
      if (url) {
        preview.src = url;
        statusEl.textContent = 'Enregistrement…';
        const { error } = await supabase.from('produits').update({ image_url: url }).eq('id', p.id);
        statusEl.textContent = error ? 'Erreur lors de l\'enregistrement.' : 'Enregistré.';
      }
    });
  });

  body.querySelectorAll('input[data-field]').forEach((input) => {
    input.addEventListener('change', () => saveProduit(input));
  });
  body.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteProduit(btn.dataset.delete));
  });
}

async function saveProduit(input) {
  const id = input.dataset.id;
  const field = input.dataset.field;
  const value = input.type === 'checkbox' ? input.checked : input.value;
  statusEl.textContent = 'Enregistrement…';
  const { error } = await supabase.from('produits').update({ [field]: value }).eq('id', id);
  statusEl.textContent = error ? 'Erreur lors de l\'enregistrement.' : 'Enregistré.';
}

async function deleteProduit(id) {
  await supabase.from('produits').delete().eq('id', id);
  await loadProduits();
}

document.getElementById('add-produit').addEventListener('click', async () => {
  await supabase.from('produits').insert({ client_id: clientId, nom: 'Nouveau produit', prix: 0 });
  await loadProduits();
});

// Reprend une session déjà active (évite de redemander le login à chaque rechargement)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) afterLogin();
});
