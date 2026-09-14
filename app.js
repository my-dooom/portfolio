/* Portfolio loader: curated data/projects.json + live GitHub API. No build step. */

const LANG_COLORS = {
  "C++": "#f34b7d", C: "#555555", Rust: "#dea584", Python: "#3572A5",
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Java: "#b07219", Lua: "#000080",
  Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", Go: "#00ADD8"
};

const $ = (sel) => document.querySelector(sel);

async function loadJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function fetchAllRepos(user) {
  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await loadJSON(
      `https://api.github.com/users/${user}/repos?per_page=100&page=${page}&sort=updated`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function renderCard(repo, curated) {
  const node = $("#card-tpl").content.firstElementChild.cloneNode(true);
  const link = node.querySelector(".card-link");
  link.textContent = repo.name;
  link.href = repo.html_url;
  node.querySelector(".desc").textContent =
    curated?.blurb || repo.description || "No description yet.";

  const tags = node.querySelector(".tags");
  const tagList = curated?.tags || repo.topics || [];
  tagList.forEach((t) => { const li = document.createElement("li"); li.textContent = t; tags.append(li); });
  if (!tagList.length) tags.remove();

  const lang = repo.language || "—";
  node.querySelector(".lang-name").textContent = lang;
  node.querySelector(".dot").style.background = LANG_COLORS[lang] || "var(--muted)";
  node.querySelector(".star-count").textContent = repo.stargazers_count ?? 0;
  node.querySelector(".updated").textContent = repo.pushed_at ? `updated ${timeAgo(repo.pushed_at)}` : "";
  if (repo.fork) node.classList.add("fork");
  node.dataset.lang = lang;
  node.dataset.search = `${repo.name} ${node.querySelector(".desc").textContent} ${tagList.join(" ")}`.toLowerCase();
  return node;
}

function renderProfile(profile, gh) {
  $("#name").textContent = profile.name || gh?.name || profile.username;
  $("#tagline").textContent = profile.tagline || gh?.bio || "";
  $("#bio").textContent = profile.bio || "";
  $("#location").textContent = profile.location || gh?.location || "";
  if (gh?.avatar_url) $("#avatar").src = gh.avatar_url;

  const links = $("#links");
  links.replaceChildren();
  for (const [label, href] of Object.entries(profile.links || {})) {
    const a = document.createElement("a");
    a.href = href; a.textContent = label; a.target = "_blank"; a.rel = "noopener";
    links.append(a);
  }
}

function renderStats(repos, gh) {
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((n, r) => n + (r.stargazers_count || 0), 0);
  const langs = new Set(own.map((r) => r.language).filter(Boolean));
  const items = [
    ["Public repos", own.length],
    ["Stars", stars],
    ["Languages", langs.size],
    ["Followers", gh?.followers ?? "—"]
  ];
  $("#stats").replaceChildren(...items.map(([k, v]) => {
    const d = document.createElement("div");
    const b = document.createElement("b"); b.textContent = v;
    d.append(b, k);
    return d;
  }));
}

function setupFilters() {
  const filter = $("#filter"), search = $("#search"), others = $("#others"), empty = $("#empty");
  const cards = [...others.children];
  const langs = [...new Set(cards.map((c) => c.dataset.lang))].sort();
  for (const l of langs) {
    const o = document.createElement("option"); o.value = l; o.textContent = l; filter.append(o);
  }
  const apply = () => {
    const q = search.value.trim().toLowerCase(), l = filter.value;
    let shown = 0;
    for (const c of cards) {
      const ok = (!l || c.dataset.lang === l) && (!q || c.dataset.search.includes(q));
      c.hidden = !ok; if (ok) shown++;
    }
    empty.hidden = shown > 0;
  };
  filter.addEventListener("change", apply);
  search.addEventListener("input", apply);
}

async function main() {
  const data = await loadJSON("data/projects.json");
  const user = data.profile.username;
  const hidden = new Set(data.hidden || []);
  const curatedByName = new Map(data.featured.map((f) => [f.repo, f]));

  let gh = null, repos = [];
  try {
    [gh, repos] = await Promise.all([loadJSON(`https://api.github.com/users/${user}`), fetchAllRepos(user)]);
    $("#status").textContent = `Live data from GitHub · ${new Date().toLocaleDateString()}`;
  } catch (err) {
    console.warn("GitHub API unavailable, using curated data only", err);
    $("#status").textContent = "GitHub API unavailable (rate limit?) — showing curated data only.";
    repos = data.featured.map((f) => ({
      name: f.repo, html_url: `https://github.com/${user}/${f.repo}`, description: f.blurb, topics: f.tags
    }));
  }

  renderProfile(data.profile, gh);
  renderStats(repos, gh);

  const byName = new Map(repos.map((r) => [r.name, r]));
  const featured = data.featured
    .map((f) => byName.get(f.repo) && renderCard(byName.get(f.repo), f))
    .filter(Boolean);
  $("#featured").replaceChildren(...featured);

  const others = repos
    .filter((r) => !curatedByName.has(r.name) && !hidden.has(r.name))
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || new Date(b.pushed_at) - new Date(a.pushed_at))
    .map((r) => renderCard(r));
  $("#others").replaceChildren(...others);
  if (!others.length) $("#all").hidden = true;
  setupFilters();
}

main().catch((err) => {
  console.error(err);
  $("#status").textContent = `Failed to load portfolio: ${err.message}`;
});
