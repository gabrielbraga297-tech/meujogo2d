// O CATÁLOGO ÚNICO DA LOJINHA (0.19.0): todas as skins de todos os jogos, em categorias ("slots"), cada uma liberada pela fase que o jogador JÁ ALCANÇOU naquele jogo.
// Uso: window.Skins (navegador) ou require("./js/skins.js") (Node). Não desenha nada: quem desenha é o jogo (js/game.js, js/cat-art.js), lendo os campos visuais da skin em uso.
//
// Categoria (slot): { id, game, name, singular, from, player? }
//   id        de 2 a 12 letras minúsculas, sem números nem hífen ("agent", "ration"...): é o que records.js exige (/^[a-z]{2,12}$/). É também a chave da skin em uso na carteira (records.js: `eq` para "dog", `eqa[slot]` para as outras).
//   game      o jogo (bichinho) onde o objeto aparece: "dog" | "cat" (| "bird" no futuro). A skin só aparece desenhada nesse jogo.
//   from      a fase mais baixa, DAQUELE jogo, em que o objeto aparece (e, portanto, a partir da qual a categoria pode ser comprada). Um teste confere com os mapas do jogo.
//   player    true nas categorias do próprio bichinho ("dog", "cat"): a skin de quem você joga.
// Skin: { id, name, text, price, from?, ...campos visuais }
//   id        "" é a skin padrão de cada categoria (grátis, sempre de todos); as outras: /^[a-z0-9-]{1,24}$/ e únicas na categoria.
//   price     petscoin (inteiro de MIN_PRICE = 10 a MAX_PRICE = 99999, o saldo máximo de um jogador); a padrão custa 0.
//   from      (opcional) uma fase ainda mais alta que a da categoria; nunca mais baixa.
//   outros    campos livres e só visuais (cores, acessórios...): a categoria define quais existem; nenhuma skin muda regra, velocidade, alcance ou pontos.
// A carteira guarda o que cada skin é com a chave `${slot}:${id}` (o Cachorrinho mantém o id puro, como sempre; o Gatinho é `cat:${id}`).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Skins = api;
})(typeof self !== "undefined" ? self : this, function () {
  const MIN_PRICE = 10, MAX_PRICE = 99999; // (MAX_PRICE = records.js MAX_TREATS: uma skin mais cara que o maior saldo possível nunca poderia ser comprada)
  const GAMES = [
    { id: "dog", name: "Cachorrinho", ready: true },
    { id: "cat", name: "Gatinho", ready: true },
    { id: "bird", name: "Passarinho", ready: true },
  ];
  const SLOTS = [
    // ----- jogo do Cachorrinho -----
    { id: "dog", game: "dog", name: "Cachorrinho", singular: "o cachorrinho", from: 1, player: true },
    { id: "agent", game: "dog", name: "Agentes da carrocinha", singular: "os agentes da carrocinha", from: 1 },
    { id: "ration", game: "dog", name: "Rações", singular: "as rações", from: 1 },
    { id: "exit", game: "dog", name: "Saída", singular: "a saída", from: 1 },
    { id: "postman", game: "dog", name: "Carteiros", singular: "os carteiros", from: 2 },
    { id: "bone", game: "dog", name: "Ossos", singular: "os ossos", from: 2 },
    { id: "ball", game: "dog", name: "Bolinhas", singular: "as bolinhas", from: 2 },
    { id: "block", game: "dog", name: "Blocos e paredes", singular: "os blocos e as paredes que se movem", from: 3 },
    { id: "van", game: "dog", name: "Vans da carrocinha", singular: "as vans da carrocinha", from: 4 },
    { id: "foecat", game: "dog", name: "Gatos", singular: "os gatos", from: 11 },
    // ----- jogo do Gatinho -----
    { id: "cat", game: "cat", name: "Gatinho", singular: "o gatinho", from: 1, player: true },
    { id: "guard", game: "cat", name: "Cães de guarda", singular: "os cães de guarda", from: 1 },
    { id: "mouse", game: "cat", name: "Ratinhos", singular: "os ratinhos", from: 1 },
    { id: "catexit", game: "cat", name: "Saída", singular: "a saída", from: 1 },
    { id: "yarn", game: "cat", name: "Novelos", singular: "os novelos", from: 2 },
    { id: "agile", game: "cat", name: "Camundongos ágeis", singular: "os camundongos ágeis", from: 2 },
    { id: "perch", game: "cat", name: "Lugares altos", singular: "os lugares altos", from: 3 },
    { id: "tracker", game: "cat", name: "Cães rastreadores", singular: "os cães rastreadores", from: 11 },
    // ----- jogo do Passarinho (0.20.0) -----
    { id: "bird", game: "bird", name: "Passarinho", singular: "o passarinho", from: 1, player: true },
    { id: "seed", game: "bird", name: "Sementes", singular: "as sementes", from: 1 },
    { id: "stray", game: "bird", name: "Gatos de jardim", singular: "os gatos de jardim", from: 1 },
    { id: "birdexit", game: "bird", name: "Ninho (saída)", singular: "o ninho da saída", from: 1 },
    { id: "berry", game: "bird", name: "Frutos", singular: "os frutos", from: 2 },
    { id: "bug", game: "bird", name: "Minhocas", singular: "as minhocas", from: 2 },
    { id: "roost", game: "bird", name: "Poleiros", singular: "os poleiros", from: 3 },
    { id: "gust", game: "bird", name: "Ventos", singular: "os ventos", from: 3 },
    { id: "hawk", game: "bird", name: "Gaviões", singular: "os gaviões", from: 11 },
  ];
  const slotOf = Object.create(null);
  for (const s of SLOTS) slotOf[s.id] = Object.freeze(s);
  const items = Object.create(null); // slot -> lista de skins (sem a padrão)
  const bases = Object.create(null); // slot -> a skin padrão (id "", preço 0), com o nome e a frase da categoria
  const isId = (id) => typeof id === "string" && /^[a-z0-9-]{1,24}$/.test(id);
  const DEFAULT_TEXT = "o visual de sempre (grátis)";

  const slot = (id) => slotOf[id] || null;
  const slotsOf = (game) => SLOTS.filter((s) => s.game === game);

  // registra as skins (sem a padrão) de uma categoria; erra alto se algo estiver fora do contrato (os testes dependem disso)
  // `base` (opcional): o nome e a frase da skin padrão da categoria, p. ex. { name: "Caramelo", text: "o cachorrinho de sempre (grátis)" }; sem ele ela se chama "Padrão"
  function register(slotId, list, base) {
    const s = slotOf[slotId];
    if (!s) throw new Error(`categoria desconhecida: ${slotId}`);
    if (!Array.isArray(list)) throw new Error(`${slotId}: a lista de skins precisa ser um array`);
    if (items[slotId]) throw new Error(`${slotId}: categoria já registrada`);
    const seen = new Set([""]);
    const out = list.map((k) => {
      if (!k || typeof k !== "object") throw new Error(`${slotId}: skin inválida`);
      if (!isId(k.id)) throw new Error(`${slotId}: id inválido (${String(k.id)})`);
      if (seen.has(k.id)) throw new Error(`${slotId}: id repetido (${k.id})`);
      seen.add(k.id);
      if (typeof k.name !== "string" || !k.name.trim()) throw new Error(`${slotId}/${k.id}: sem nome`);
      if (typeof k.text !== "string" || !k.text.trim()) throw new Error(`${slotId}/${k.id}: sem frase`);
      if (!Number.isInteger(k.price) || k.price < MIN_PRICE) throw new Error(`${slotId}/${k.id}: o preço mínimo é ${MIN_PRICE} petscoin`);
      if (k.price > MAX_PRICE) throw new Error(`${slotId}/${k.id}: o preço máximo é ${MAX_PRICE} petscoin (o saldo máximo de um jogador)`);
      if (k.from !== undefined && (!Number.isInteger(k.from) || k.from < s.from || k.from > 20)) throw new Error(`${slotId}/${k.id}: "from" precisa ser inteiro entre ${s.from} e 20`);
      return Object.freeze({ ...k });
    });
    if (base !== undefined && (!base || typeof base !== "object" || (base.name !== undefined && typeof base.name !== "string") || (base.text !== undefined && typeof base.text !== "string"))) throw new Error(`${slotId}: skin padrão inválida`);
    items[slotId] = Object.freeze(out);
    bases[slotId] = Object.freeze({ ...(base || {}), id: "", name: (base && base.name) || "Padrão", text: (base && base.text) || DEFAULT_TEXT, price: 0 });
    return items[slotId];
  }

  const defaultSkin = (slotId) => bases[slotId] || Object.freeze({ id: "", name: "Padrão", text: DEFAULT_TEXT, price: 0 });
  // todas as skins da categoria, a padrão primeiro; [] se a categoria não existe
  const list = (slotId) => (slotOf[slotId] ? [defaultSkin(slotId), ...(items[slotId] || [])] : []);
  // a skin da categoria pelo id ("" ou desconhecido = a padrão)
  const get = (slotId, id) => (items[slotId] || []).find((k) => k.id === id) || defaultSkin(slotId);
  const has = (slotId, id) => id === "" || (items[slotId] || []).some((k) => k.id === id);
  // a fase mais baixa em que a skin pode ser comprada: a da categoria, ou a da própria skin se for maior
  const fromOf = (slotId, id) => {
    const s = slotOf[slotId];
    if (!s) return 99;
    const k = (items[slotId] || []).find((x) => x.id === id);
    return k && k.from ? Math.max(s.from, k.from) : s.from;
  };
  // `reached` = a fase mais alta que o jogador alcançou NAQUELE jogo (a próxima depois da última concluída); true se a skin já pode ser comprada.
  // É a regra que a tela da lojinha (js/game.js) usa; o armazenamento (records.js, gateOf) faz a mesma comparação por conta própria, porque a trava também vale sem a tela.
  const unlocked = (slotId, id, reached) => Number.isInteger(reached) && reached >= fromOf(slotId, id);

  return { MIN_PRICE, MAX_PRICE, GAMES, SLOTS, slot, slotsOf, register, list, get, has, fromOf, unlocked, count: (slotId) => (items[slotId] || []).length };
});
