// Carrega e armazena modelos .glb em duas etapas: veículos/personagens/móveis
// essenciais primeiro; prédios e detalhes depois, em segundo plano.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtilsNS from 'three/addons/utils/SkeletonUtils.js';
// Versões diferentes do three.js exportam esse módulo de formas diferentes
// (objeto nomeado "SkeletonUtils" ou funções soltas) — cobre os dois casos.
const SkeletonUtils = SkeletonUtilsNS.SkeletonUtils || SkeletonUtilsNS;

export const VEICULOS = {
  carroUrbano: 'assets/models/veiculos/carroUrbano.glb',
  carroCompacto: 'assets/models/veiculos/carroCompacto.glb',
  esportivoPack: 'assets/models/veiculos/esportivoPack.glb',
  suv: 'assets/models/veiculos/suv.glb',
  policial: 'assets/models/veiculos/policial.glb',
  rollsroyce: 'assets/models/veiculos/rollsroyce.glb',
  dodge: 'assets/models/veiculos/dodge.glb',
  rx7: 'assets/models/veiculos/rx7.glb',
  antigo: 'assets/models/veiculos/antigo.glb',
  moto: 'assets/models/veiculos/moto.glb',
  // Novos, a partir do "City Pack":
  lambo: 'assets/models/veiculos/lambo.glb',
  van: 'assets/models/veiculos/van.glb',
  pickup: 'assets/models/veiculos/pickup.glb',
  onibus: 'assets/models/veiculos/onibus.glb',
  moto2: 'assets/models/veiculos/moto2.glb',
  bike: 'assets/models/veiculos/bike.glb',
};
export const PERSONAGENS = {
  homemNegocios: 'assets/models/personagens/homem_negocios.glb',
  homem: 'assets/models/personagens/homem.glb',
  mulher: 'assets/models/personagens/mulher.glb',
  mulher2: 'assets/models/personagens/mulher2.glb',
  soldado: 'assets/models/personagens/soldado.glb',
};
export const ARMAS_3D = {
  pistola: 'assets/models/armas/pistola.glb',
  submetralhadora: 'assets/models/armas/submetralhadora.glb',
  rifle: 'assets/models/armas/rifle.glb',
  shotgun: 'assets/models/armas/shotgun.glb',
  sniper: 'assets/models/armas/sniper.glb',
};
// Cenário: objetos estáticos (sem animação) do "City Pack", espalhados pela cidade em decor.js.
export const DECOR = {
  banco: 'assets/models/decor/bench.glb',
  arCondicionado: 'assets/models/decor/arCondicionado.glb',
  caixa: 'assets/models/decor/caixa.glb',
  placaPonto: 'assets/models/decor/placaPonto.glb',
  pecaCerca: 'assets/models/decor/pecaCerca.glb',
  escadaIncendio: 'assets/models/decor/escadaIncendio.glb',
  buraco: 'assets/models/decor/buraco.glb',
  vasoFlorido: 'assets/models/decor/vasoFlorido.glb',
  canteiro: 'assets/models/decor/canteiro.glb',
  quadroEletrico: 'assets/models/decor/quadroEletrico.glb',
  pizza: 'assets/models/decor/pizza.glb',
  luzTransito: 'assets/models/decor/luzTransito.glb',
  arvore: 'assets/models/decor/arvore.glb',
  cartaz: 'assets/models/decor/cartaz.glb',
  saidaTelhado: 'assets/models/decor/saidaTelhado.glb',
  sacoLixo: 'assets/models/decor/sacoLixo.glb',
  varal: 'assets/models/decor/varal.glb',

  hidrante: 'assets/models/decor/hidrante.glb',
  correio: 'assets/models/decor/caixa_correio.glb',
  lixeira: 'assets/models/decor/lixeira.glb',
  pare: 'assets/models/decor/placa_pare.glb',
  pontoOnibus: 'assets/models/decor/ponto_onibus.glb',
  caixaEletronico: 'assets/models/decor/caixa_eletronico.glb',
  bueiro: 'assets/models/decor/bueiro.glb',
  vaso: 'assets/models/decor/vaso.glb',
  cacamba: 'assets/models/decor/cacamba.glb',
  cerca: 'assets/models/decor/cerca.glb',
  cercaPonta: 'assets/models/decor/cerca_ponta.glb',
  outdoor: 'assets/models/decor/outdoor.glb',
  papel: 'assets/models/decor/lixo_papel.glb',
  cone: 'assets/models/decor/cone.glb',
};


export const NOVOS = {
  kitTorre1: 'assets/models/cidade_nova/kitTorre1.glb',
  kitTorre2: 'assets/models/cidade_nova/kitTorre2.glb',
  kitTorre3: 'assets/models/cidade_nova/kitTorre3.glb',
  kitTorre4: 'assets/models/cidade_nova/kitTorre4.glb',
  kitTorre5: 'assets/models/cidade_nova/kitTorre5.glb',
  kitTorre6: 'assets/models/cidade_nova/kitTorre6.glb',
  kitGrande1: 'assets/models/cidade_nova/kitGrande1.glb',
  kitGrande2: 'assets/models/cidade_nova/kitGrande2.glb',
  kitGrande3: 'assets/models/cidade_nova/kitGrande3.glb',
  kitGrande4: 'assets/models/cidade_nova/kitGrande4.glb',
  kitGrande5: 'assets/models/cidade_nova/kitGrande5.glb',
  kitGrande6: 'assets/models/cidade_nova/kitGrande6.glb',
  kitBaixo1: 'assets/models/cidade_nova/kitBaixo1.glb',
  kitBaixo2: 'assets/models/cidade_nova/kitBaixo2.glb',
  kitBaixo3: 'assets/models/cidade_nova/kitBaixo3.glb',
  kitBaixo4: 'assets/models/cidade_nova/kitBaixo4.glb',
  kitBaixo5: 'assets/models/cidade_nova/kitBaixo5.glb',
  kitBaixo6: 'assets/models/cidade_nova/kitBaixo6.glb',
  kitCasa1: 'assets/models/cidade_nova/kitCasa1.glb',
  kitCasa2: 'assets/models/cidade_nova/kitCasa2.glb',
  kitCasa3: 'assets/models/cidade_nova/kitCasa3.glb',
  kitCasa4: 'assets/models/cidade_nova/kitCasa4.glb',
  kitCasa5: 'assets/models/cidade_nova/kitCasa5.glb',
  kitCasa6: 'assets/models/cidade_nova/kitCasa6.glb',
  mobEstante: 'assets/models/mobiliario/mobEstante.glb',
  mobEstanteBaixa: 'assets/models/mobiliario/mobEstanteBaixa.glb',
  mobBalcao: 'assets/models/mobiliario/mobBalcao.glb',
  mobCadeira: 'assets/models/mobiliario/mobCadeira.glb',
  mobSofa: 'assets/models/mobiliario/mobSofa.glb',
  mobMesa: 'assets/models/mobiliario/mobMesa.glb',
  mobPlanta: 'assets/models/mobiliario/mobPlanta.glb',
  mobGeladeira: 'assets/models/mobiliario/mobGeladeira.glb',
  mobCaixa: 'assets/models/mobiliario/mobCaixa.glb',
  mobAbajur: 'assets/models/mobiliario/mobAbajur.glb',
  mobComputador: 'assets/models/mobiliario/mobComputador.glb',
  medCasa: 'assets/models/cidade_nova/medCasa.glb',
  medCasa2: 'assets/models/cidade_nova/medCasa2.glb',
  medTaverna: 'assets/models/cidade_nova/medTaverna.glb',
  medTorre: 'assets/models/cidade_nova/medTorre.glb',
  medMoinho: 'assets/models/cidade_nova/medMoinho.glb',
  medMercado: 'assets/models/cidade_nova/medMercado.glb',
  medPoco: 'assets/models/cidade_nova/medPoco.glb',
  medCarroca: 'assets/models/cidade_nova/medCarroca.glb',
  medBanco: 'assets/models/cidade_nova/medBanco.glb',
};

const loader = new GLTFLoader();
const cache = {};
const emCarga = new Map();

function carregar1(chave, url) {
  if (cache[chave]) return Promise.resolve(true);
  if (emCarga.has(chave)) return emCarga.get(chave);
  const tarefa = new Promise(resolve => {
    loader.load(url, gltf => { cache[chave] = gltf; resolve(true); },
      undefined,
      erro => { console.warn('[assets] falha ao carregar "' + chave + '" (' + url + '):', erro); resolve(false); });
  }).finally(()=>emCarga.delete(chave));
  emCarga.set(chave,tarefa);return tarefa;
}

// No perfil leve, carrega menos variações decorativas para poupar memória no celular.
const EXTRAS_LEVES = new Set([
  'banco', 'hidrante', 'correio', 'lixeira', 'pare', 'pontoOnibus', 'caixaEletronico',
  'bueiro', 'vaso', 'cacamba', 'cerca', 'papel', 'cone', 'outdoor', 'arvore', 'canteiro',
  'vasoFlorido', 'placaPonto', 'luzTransito', 'arCondicionado',
  'kitTorre1', 'kitTorre2', 'kitTorre3', 'kitTorre4', 'kitTorre5', 'kitTorre6',
  'kitGrande1', 'kitGrande2', 'kitGrande3', 'kitGrande4', 'kitGrande5', 'kitGrande6',
  'kitBaixo1', 'kitBaixo2', 'kitBaixo3', 'kitBaixo4', 'kitBaixo5', 'kitBaixo6',
  'kitCasa1', 'kitCasa2', 'kitCasa3', 'kitCasa4', 'kitCasa5', 'kitCasa6',
  'medCasa', 'medTaverna', 'medMercado',
  'medPoco', 'medCarroca', 'medBanco', 'mobEstante', 'mobBalcao', 'mobCadeira',
  'mobSofa', 'mobMesa', 'mobPlanta', 'mobGeladeira', 'mobCaixa', 'mobAbajur', 'mobComputador'
]);
async function carregarLista(lista,aoProgredir){
  if(!lista.length){aoProgredir?.(1);return;}
  let feitos = 0;
  await Promise.all(lista.map(([chave, url]) => carregar1(chave, url).then(() => { feitos++; aoProgredir?.(feitos / lista.length); })));
}
export function carregarEssenciais(aoProgredir) {
  const moveis=Object.entries(NOVOS).filter(([chave])=>chave.startsWith('mob'));
  return carregarLista([...Object.entries(VEICULOS),...Object.entries(PERSONAGENS),...Object.entries(ARMAS_3D),...moveis],aoProgredir);
}
export function carregarExtras(aoProgredir, leve = false) {
  const lista=Object.entries({ ...DECOR, ...NOVOS }).filter(([chave]) => !chave.startsWith('mob')&&(!leve || EXTRAS_LEVES.has(chave)));
  return carregarLista(lista,aoProgredir);
}
export async function carregarTudo(aoProgredir, leve = false) {
  await carregarEssenciais(f=>aoProgredir?.(f*.6));
  await carregarExtras(f=>aoProgredir?.(.6+f*.4),leve);
}

// Devolve uma cópia nova e independente da cena (com clone do esqueleto, se houver), ou null se não carregou.
export function clonarCena(chave) {
  const g = cache[chave];
  return g ? SkeletonUtils.clone(g.scene) : null;
}
export function animacoesDe(chave) { return cache[chave]?.animations || []; }
export function temModelo(chave) { return !!cache[chave]; }
