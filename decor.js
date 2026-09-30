// Cenário urbano: espalha pela cidade os objetos estáticos do "City Pack" (bancos,
// hidrantes, lixeiras, placas, cercas, prédios-vitrine etc). Cada modelo é normalizado
// pelo tamanho real (bounding box), igual ao que vehicles.js/player.js já fazem para
// carros e armas — assim funciona bem independente da escala original do arquivo .glb.
import * as THREE from 'three';
import * as Assets from './assets.js';
import { LUGARES, PREDIOS_PACK } from './world.js';

const R = (a, b) => a + Math.random() * (b - a);

// Instancia "chave" (de Assets.DECOR), com o maior lado redimensionado para "alvoTam"
// metros, base encostada no chão (y=0) e centralizada em (x,z). ry = rotação em Y.
function por(scene, chave, x, z, alvoTam, ry = 0) {
  const modelo = Assets.clonarCena(chave);
  if (!modelo) { console.warn('[decor] modelo não encontrado no cache (não carregou?):', chave); return null; }
  const caixa = new THREE.Box3().setFromObject(modelo), centro = new THREE.Vector3();
  caixa.getCenter(centro);
  const tam = Math.max(caixa.max.x - caixa.min.x, caixa.max.y - caixa.min.y, caixa.max.z - caixa.min.z) || 1;
  const wrapper = new THREE.Group();
  modelo.position.set(-centro.x, -caixa.min.y, -centro.z);
  wrapper.add(modelo);
  wrapper.scale.setScalar(alvoTam / tam);
  wrapper.rotation.y = ry;
  wrapper.position.set(x, 0, z);
  wrapper.traverse(n => {
    if (!n.isMesh) return;
    n.castShadow = false; n.receiveShadow = true;
    const materiais = Array.isArray(n.material) ? n.material : [n.material];
    materiais.forEach(m => {
      if (!m || m.userData?.cityRushAjustado) return;
      m.userData.cityRushAjustado = true;
      if ('roughness' in m) m.roughness = /glass|vidro|window/i.test(n.name) ? .16 : Math.min(.86, Math.max(.28, m.roughness ?? .65));
      if ('metalness' in m) m.metalness = /metal|car|rail|window|glass/i.test(n.name) ? Math.max(.28, m.metalness ?? 0) : Math.min(.18, m.metalness ?? 0);
      if ('envMapIntensity' in m) m.envMapIntensity = /glass|vidro|window/i.test(n.name) ? 1.02 : .46;
      if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; }
      m.needsUpdate = true;
    });
  });
  scene.add(wrapper);
  return wrapper;
}

// fraco: mesma detecção de dispositivo fraco do main.js — reduz a quantidade de
// objetos (cada um é um draw call à parte, sem InstancedMesh) pra não pesar no celular.
export function criarDecoracoes(scene, fraco) {
  let total = 0, falhas = 0;
  const objetos = [];
  const p = (...args) => { const r = por(...args); if (r) { total++; objetos.push(r); } else falhas++; return r; };
  // Mobiliário urbano na pracinha livre no meio de cada quarteirão (entre os 4 lotes).
  const miudezas = fraco
    ? [['banco', 1.6], ['hidrante', .8], ['lixeira', .9], ['vaso', .7], ['cone', .7]]
    : [['banco', 1.6], ['hidrante', .8], ['correio', 1.1], ['lixeira', .9], ['vaso', .7], ['bueiro', .8], ['cone', .7], ['papel', .3], ['cacamba', 1.8]];
  const chanceBloco = fraco ? .8 : .5, passo = fraco ? 2 : 1; // fraco: 1 a cada ~5 quarteirões (pula de 2 em 2 + 80% de chance de nada)
  for (let bx = -10; bx < 10; bx += passo) for (let bz = -10; bz < 10; bz += passo) {
    if (Math.random() < chanceBloco) continue; // nem todo quarteirão recebe algo, pra não poluir
    const cx = bx * 100 + 50, cz = bz * 100 + 50, n = !fraco && Math.random() < .35 ? 2 : 1;
    for (let i = 0; i < n; i++) { const [chave, tam] = miudezas[R(0, miudezas.length) | 0]; p(scene, chave, cx + R(-3.5, 3.5), cz + R(-3.5, 3.5), tam, R(0, Math.PI * 2)); }
  }
  // Placas de "PARE" e pontos de ônibus na calçada — usando o mesmo ponto de
  // referência das árvores/postes já existentes em world.js (x/z = quarteirão+9),
  // que é a faixa de calçada livre entre a rua e os lotes dos prédios.
  const pPare = fraco ? 4 : 2, pOnibus = fraco ? 8 : 4;
  for (let bx = -10; bx <= 10; bx += pPare) for (let bz = -10; bz <= 10; bz += pPare) p(scene, 'pare', bx * 100 + 9, bz * 100 + 9, 2.2, Math.PI / 2);
  for (let bx = -9; bx < 10; bx += pOnibus) for (let bz = -9; bz < 10; bz += pOnibus) p(scene, 'pontoOnibus', bx * 100 + 9, bz * 100 + 20, 3.4, Math.PI / 2);
  // Outdoors espalhados perto de algumas ruas principais.
  for (let i = 0; i < (fraco ? 4 : 12); i++) p(scene, 'outdoor', Math.round(R(-9, 9)) * 100 + 9, Math.round(R(-9, 9)) * 100 + 50, 6, Math.PI / 2);
  // Caixas eletrônicas em frente a mercados/postos; cercas ao redor das casas.
  LUGARES.forEach(l => {
    if (l.tipo === 'mercado' || l.tipo === 'posto') p(scene, 'caixaEletronico', l.x + 8, l.z - 8, 1.6, R(0, Math.PI * 2));
    if (l.tipo === 'casa') {
      // Laterais e fundo cercados; a frente fica dividida para não bloquear a entrada.
      for (const [dx, dz, ry, tam] of [[-15, 0, 0, 8], [15, 0, 0, 8], [0, -15, Math.PI / 2, 8], [-10.5, 15, Math.PI / 2, 4.6], [10.5, 15, Math.PI / 2, 4.6]]) p(scene, 'cerca', l.x + dx, l.z + dz, tam, ry);
    }
  });
  // Novos pontos do pack: detalhes de rua e fachadas, com quantidade limitada para manter desempenho.
  const detalhes = [
    ['arvore', 3.5, 11, 35], ['canteiro', 2.6, 13, 48],
    ['vasoFlorido', 1.2, 14, 58], ['pizza', 4.5, 16, 72],
    ['quadroEletrico', 1.5, 12, 78], ['caixa', 1, 18, 52],
    ['sacoLixo', .8, 17, 60], ['placaPonto', 2.6, 10, 22],
    ['pecaCerca', 2.5, 20, 48], ['cartaz', 1.3, 17, 36],
    ['luzTransito', 3.3, 9, 9], ['escadaIncendio', 6, 24, 70],
    ['saidaTelhado', 2, 25, 77], ['arCondicionado', 1, 24, 62],
    ['varal', 3.5, 24, 56], ['buraco', 1.3, 19, 39],
  ];
  const detalhesAtivos = fraco ? detalhes.filter(([chave]) => ['arvore', 'canteiro', 'vasoFlorido', 'placaPonto', 'luzTransito', 'arCondicionado'].includes(chave)) : detalhes;
  detalhesAtivos.forEach(([chave, tamanho, ox, oz], i) => {
    const bx = ((i * 7) % 18 - 9) * 100, bz = ((i * 11) % 18 - 9) * 100;
    p(scene, chave, bx + ox, bz + oz, tamanho, i % 2 ? Math.PI / 2 : 0);
  });
  // Edifícios de verdade ocupam lotes centrais; os cubos desses lotes foram retirados em world.js.
  // Os arquivos do City Kit são leves; todas as seis variações de cada família
  // ficam disponíveis também no celular. O culling abaixo limita o que é desenhado.
  const kitTorres = ['kitTorre1', 'kitTorre2', 'kitTorre3', 'kitTorre4', 'kitTorre5', 'kitTorre6'];
  const kitGrandes = ['kitGrande1', 'kitGrande2', 'kitGrande3', 'kitGrande4', 'kitGrande5', 'kitGrande6'];
  const kitBaixos = ['kitBaixo1', 'kitBaixo2', 'kitBaixo3', 'kitBaixo4', 'kitBaixo5', 'kitBaixo6'];
  const kitCasas = ['kitCasa1', 'kitCasa2', 'kitCasa3', 'kitCasa4', 'kitCasa5', 'kitCasa6'];
  const medievais = fraco ? ['medCasa', 'medTaverna'] : ['medCasa', 'medCasa2', 'medTaverna', 'medTorre', 'medMoinho'];
  const usados = { torre: 0, grande: 0, baixo: 0, casa: 0 };
  PREDIOS_PACK.forEach((l, i) => {
    let modelo, tamanho;
    if (l.medieval) { modelo = medievais[i % medievais.length]; tamanho = modelo === 'medTorre' ? 25 : 19; }
    else if (l.casa || l.familia === 'casa') { modelo = kitCasas[usados.casa++ % kitCasas.length]; tamanho = l.casa ? 16 : 19; }
    else {
      const chave = l.familia === 'torre' ? 'torre' : l.familia === 'grande' ? 'grande' : 'baixo';
      const familia = chave === 'torre' ? kitTorres : chave === 'grande' ? kitGrandes : kitBaixos;
      modelo = familia[usados[chave]++ % familia.length]; tamanho = chave === 'torre' ? 42 : chave === 'grande' ? 33 : 25;
    }
    p(scene, modelo, l.x, l.z, tamanho, (i % 4) * Math.PI / 2);
    if (l.medieval) {
      p(scene, i % 3 ? 'medBanco' : 'medCarroca', l.x - 5, l.z + 13, 2.8);
      if (i % 4 === 0) p(scene, 'medPoco', l.x + 5, l.z + 13, 2);
      if (i % 5 === 0) p(scene, 'medMercado', l.x + 5, l.z + 13, 3);
    } else {
      p(scene, 'vasoFlorido', l.x - 4, l.z + 14, 1.1);
      p(scene, 'canteiro', l.x + 4, l.z + 14, 2.1);
      if (!l.casa && i % 3 === 0) p(scene, 'arCondicionado', l.x + 7, l.z + 12, 1.1);
    }
  });
  console.log(`[decor] ${total} objetos de cenário criados, ${falhas} falharam (modelo ausente no cache).`);
  let ultimoX = Infinity, ultimoZ = Infinity;
  return { atualizar(alvo) {
    if (Math.hypot(alvo.x - ultimoX, alvo.z - ultimoZ) < 25) return;
    ultimoX = alvo.x; ultimoZ = alvo.z;
    const limite2 = (fraco ? 210 : 360) ** 2;
    objetos.forEach(o => { const dx = o.position.x - alvo.x, dz = o.position.z - alvo.z; o.visible = dx * dx + dz * dz < limite2; });
  } };
}
