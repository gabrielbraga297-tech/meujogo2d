// Palavras que o Passarinho NÃO pode usar (ele é genérico: nenhuma espécie, raça ou ave com nome próprio entra em texto nem em skin). Usado por tests/honesty.test.js (README, docs, perfil e catálogo)
// e por tests/bird-art.test.js (nomes e frases das 12 skins do passarinho), para as duas conferências usarem a MESMA lista.
// Cada palavra casa inteira (com ou sem "s" no fim, com ou sem acento onde há as duas grafias); nomes em inglês e científicos entram porque a pesquisa em literatura usa esses nomes.
const SPECIES = [
  "sabiá", "sabia", "bem-te-vi", "pardal", "canário", "canario", "beija-flor", "andorinha", "pombo", "pomba", "papagaio", "periquito", "tucano", "coruja", "falcão", "falcao", "harpia", "carcará", "carcara",
  "joão-de-barro", "tico-tico", "rolinha", "gaivota", "sanhaço", "cardeal", "azulão", "azulao", "colibri", "águia", "aguia", "corvo", "gralha", "quero-quero", "arara", "pato", "curió", "curio", "pica-pau", "pinguim",
  "passer", "columba", "sparrow\\w*", "robin", "pigeon", "finch", "blackbird", "wren", "starling", "swallow", "hummingbird", "parrot", "owl", "falcon", "kestrel", "eagle", "great tit", "blue tit",
];
// "raça" e "breed" ficam à parte: a frase "nenhuma espécie, nenhuma raça" é permitida (ver tests/honesty.test.js)
const BREED = ["raça", "breed"];
const wordRe = (words, flags = "giu") => new RegExp(`(?<!\\p{L})(${words.map((w) => (/\\w\*$/.test(w) ? w : w + "s?")).join("|")})(?!\\p{L})`, flags);
module.exports = { SPECIES, BREED, speciesRe: (flags) => wordRe(SPECIES, flags), speciesOrBreedRe: (flags) => wordRe([...SPECIES, ...BREED], flags) };
