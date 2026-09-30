// Interiores jogáveis e detalhados. Eles ficam em uma área separada do mapa;
// somente o prédio atual é exibido para manter o desempenho no celular.
import * as THREE from 'three';
import { INT } from './world.js';
import { criarHumano } from './player.js';
import * as Assets from './assets.js';

export function criarInterior(scene) {
  const raiz = new THREE.Group();
  raiz.position.set(INT.x, 0, INT.z); scene.add(raiz);
  const mat = (c, metalness = 0, roughness = .75, emissive = 0) => new THREE.MeshStandardMaterial({ color: c, metalness, roughness, emissive, emissiveIntensity: emissive ? .65 : 0 });
  const B = (pai, w, h, d, c, x, y, z, metal = 0, rough = .75, emissive = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, metal, rough, emissive));
    o.position.set(x, y, z); o.castShadow = h > .3; o.receiveShadow = true; pai.add(o); return o;
  };
  const C = (pai, raio, h, c, x, y, z, ry = 0, metal = 0, deitado = false) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, h, 20), mat(c, metal, .55));
    o.position.set(x, y, z); o.rotation.set(deitado ? Math.PI / 2 : 0, ry, 0); o.castShadow = true; o.receiveShadow = true; pai.add(o); return o;
  };
  const mob = (pai, chave, x, z, tamanho, ry = 0) => {
    const o = Assets.clonarCena(chave); if (!o) return null;
    const box = new THREE.Box3().setFromObject(o), centro = new THREE.Vector3(); box.getCenter(centro);
    const tam = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) || 1;
    const base = new THREE.Group(); o.position.set(-centro.x, -box.min.y, -centro.z); base.add(o);
    base.scale.setScalar(tamanho / tam); base.position.set(x, .12, z); base.rotation.y = ry;
    base.traverse(n => { if (n.isMesh) { n.receiveShadow = true; n.castShadow = true; } }); pai.add(base); return base;
  };
  const texto = (pai, msg, x, y, z, w, h, cor = '#fff', fundo = '#111d', ry = 0) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const ctx = cv.getContext('2d');
    ctx.fillStyle = fundo; ctx.fillRect(0, 0, 512, 128); ctx.strokeStyle = cor; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = cor; ctx.font = '900 58px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg, 256, 68);
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide }));
    o.position.set(x, y, z); o.rotation.y = ry; pai.add(o); return o;
  };
  const luz = (pai, x, y, z, intensidade = 1.5, distancia = 10) => {
    B(pai, 2.4, .06, .34, 0xffffff, x, y, z, .1, .2, 0xffffff);
    const l = new THREE.PointLight(0xfff3d5, intensidade, distancia, 1.4); l.position.set(x, y - .18, z); pai.add(l);
  };
  const janela = (pai, x, y, z, w, h, ry = 0) => {
    const moldura = new THREE.Group(); moldura.position.set(x, y, z); moldura.rotation.y = ry; pai.add(moldura);
    B(moldura, w, .1, .09, 0x303942, 0, h / 2, 0); B(moldura, w, .1, .09, 0x303942, 0, -h / 2, 0);
    B(moldura, .1, h, .09, 0x303942, -w / 2, 0, 0); B(moldura, .1, h, .09, 0x303942, w / 2, 0, 0);
    B(moldura, .06, h, .08, 0x303942, 0, 0, 0);
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(w - .14, h - .14), new THREE.MeshPhysicalMaterial({ color: 0x8ac7e8, transparent: true, opacity: .45, roughness: .12, metalness: .05, side: THREE.DoubleSide }));
    vidro.position.z = .015; moldura.add(vidro);
  };
  const ambiente = (w, d, piso, parede, abertura = 0, altura = 4.2) => {
    const g = new THREE.Group(); raiz.add(g);
    const pisoObj = B(g, w, .18, d, piso, 0, 0, 0);
    B(g, w, altura, .25, parede, 0, altura / 2, -d / 2);
    B(g, .25, altura, d, parede, -w / 2, altura / 2, 0); B(g, .25, altura, d, parede, w / 2, altura / 2, 0);
    if (abertura > 0) {
      const lateral = (w - abertura) / 2;
      B(g, lateral, altura, .25, parede, -(abertura + lateral) / 2, altura / 2, d / 2);
      B(g, lateral, altura, .25, parede, (abertura + lateral) / 2, altura / 2, d / 2);
      B(g, abertura, .7, .25, parede, 0, altura - .35, d / 2);
    } else B(g, w, altura, .25, parede, 0, altura / 2, d / 2);
    B(g, w, .16, d, 0xf4f0e8, 0, altura, 0);
    // Rodapés deixam a ligação entre parede e piso mais natural.
    B(g, w - .3, .14, .09, 0x7b7065, 0, .16, -d / 2 + .15);
    B(g, .09, .14, d - .3, 0x7b7065, -w / 2 + .15, .16, 0); B(g, .09, .14, d - .3, 0x7b7065, w / 2 - .15, .16, 0);
    g.userData.piso = pisoObj; return g;
  };
  const paredeX = (pai, x, z, d, c = 0xd7d1c7, h = 3.75) => B(pai, .16, h, d, c, x, h / 2, z);
  const paredeZ = (pai, x, z, w, c = 0xd7d1c7, h = 3.75) => B(pai, w, h, .16, c, x, h / 2, z);

  // Mercado/posto: corredores organizados, caixa, geladeira e área de espera.
  const loja = ambiente(16, 12, 0x7e878d, 0xe7e3da, 3.2);
  B(loja, 15.4, .035, 1.1, 0xcfd5d7, 0, .11, 0);
  for (const x of [-5.5, -2.5, .5, 3.5]) mob(loja, 'mobEstante', x, -.9, 2.15, Math.PI / 2);
  mob(loja, 'mobBalcao', 0, -4.5, 3.1); mob(loja, 'mobComputador', -.8, -4.45, .62); mob(loja, 'mobCadeira', 1.65, -4.25, 1.05);
  mob(loja, 'mobGeladeira', -6.35, 3.25, 2.15); mob(loja, 'mobPlanta', 6.2, 3.9, 1.3); mob(loja, 'mobSofa', 4.7, 4.1, 2.2, Math.PI);
  const placaLoja = B(loja, 6, 1, .1, 0x0b6b2e, 0, 3.3, -5.82);
  luz(loja, -4.2, 3.9, 0, 1.15, 9); luz(loja, 4.2, 3.9, 0, 1.15, 9);
  const caixa = criarHumano(0xffffff, 0xc68642); caixa.position.set(0, 0, -5.35); caixa.rotation.y = Math.PI; loja.add(caixa);

  // Casa completa: garagem, quarto, banheiro, cozinha, jantar e sala.
  // Frente aberta o suficiente para a garagem à esquerda e a porta social ao centro.
  const casa = ambiente(24, 18, 0x845f42, 0xe8e3d9, 18); casa.visible = false;
  B(casa, 1.7, 4.2, .25, 0xe8e3d9, -1.9, 2.1, 9);B(casa, 7.4, 4.2, .25, 0xe8e3d9, 5.3, 2.1, 9);
  B(casa, 6.4, .35, .35, 0x3d464c, -6.3, 3.85, 8.86,.5,.35);for(const x of [-9.35,-3.25])B(casa,.35,3.9,.35,0x3d464c,x,1.95,8.86,.5,.35);
  const pisoCasa = casa.userData.piso;
  B(casa, 9.6, .035, 8.6, 0x343b41, -7.05, .11, -4.55, .25, .58);       // garagem
  B(casa, 9.6, .038, 8.55, 0x956f50, -7.05, .115, 4.55);                // quarto/escritório
  B(casa, 12.8, .04, 7.25, 0xd5d0c4, 4.55, .12, -5.25);                // cozinha/jantar
  B(casa, 12.8, .04, 10.25, 0x9c7454, 4.55, .12, 3.9);                 // sala
  // Paredes internas com vãos reais para circular entre os cômodos.
  paredeX(casa, -2.15, -6.1, 5.6); paredeX(casa, -2.15, 1.3, 5.6); paredeX(casa, -2.15, 7.25, 3.2);
  paredeZ(casa, -10.15, .2, 3.45); paredeZ(casa, -4.35, .2, 4.25);
  paredeZ(casa, 2.25, .25, 5.6); paredeZ(casa, 9.1, .25, 5.6);
  // Portas abertas e batentes mostram claramente os caminhos.
  for (const [x, z, ry] of [[-2.05, -2.55, Math.PI / 2], [-2.05, 4.35, Math.PI / 2], [-6.2, .12, 0], [5.65, .16, 0]]) {
    B(casa, 1.2, 2.85, .1, 0x6e4d34, x, 1.48, z, 0, .7).rotation.y = ry + .85;
  }
  janela(casa, 5.4, 2.25, -8.84, 4.4, 1.45); janela(casa, 7.2, 2.25, 8.84, 4, 1.45, Math.PI);
  janela(casa, -11.84, 2.25, 4.7, 3.3, 1.35, Math.PI / 2);

  // Sala: sofá, tapete, mesa de centro, painel, TV, estante e decoração.
  B(casa, 7.1, .045, 4.3, 0x31566c, 5.35, .14, 4.15);
  mob(casa, 'mobSofa', 5.2, 5.8, 3.15, Math.PI); mob(casa, 'mobMesa', 5.2, 3.75, 1.25);
  mob(casa, 'mobPlanta', 10.25, 6.75, 1.35); mob(casa, 'mobEstanteBaixa', 5.2, 7.95, 3, Math.PI);
  B(casa, 4.7, 1.75, .12, 0x35291f, 5.2, 2.25, 8.56); B(casa, 3.15, 1.6, .08, 0x10151a, 5.2, 2.35, 8.48, .25, .2);
  for (const [x, c] of [[8.7, 0xb26b43], [9.55, 0x406d84]]) B(casa, .7, .9, .08, c, x, 2.35, 8.62);

  // Cozinha em L, eletrodomésticos e mesa posta.
  for (const x of [1.1, 3.2, 5.3, 7.4]) { B(casa, 1.9, .9, .72, 0x4d6570, x, .56, -8.25); B(casa, 1.9, .12, .85, 0xd6d3cb, x, 1.05, -8.25, 0, .35); }
  for (const z of [-7.1, -5.2, -3.3]) { B(casa, .72, .9, 1.7, 0x4d6570, 10.9, .56, z); B(casa, .84, .12, 1.7, 0xd6d3cb, 10.9, 1.05, z, 0, .35); }
  mob(casa, 'mobGeladeira', 9.85, -7.25, 2.15);
  B(casa, 1.55, .18, 1.15, 0x242a2d, 5.2, 1.18, -8.15, .55, .25); // fogão
  for (const x of [4.75, 5.65]) for (const z of [-8.5, -7.85]) C(casa, .16, .04, 0x0b0d0e, x, 1.3, z, 0, .3);
  B(casa, 1.25, .16, .68, 0x8ea6ad, 7.3, 1.2, -8.2, .65, .2); B(casa, .07, .62, .07, 0xbcc7ca, 7.65, 1.5, -8.2, .8, .2);
  B(casa, 4.8, .12, 2.25, 0x6e4930, 5.7, .88, -3.7); B(casa, .28, .78, .28, 0x463021, 4.1, .45, -4.35); B(casa, .28, .78, .28, 0x463021, 7.3, .45, -4.35);
  for (const [x, z, r] of [[3.9, -3.7, Math.PI / 2], [7.5, -3.7, -Math.PI / 2], [4.7, -2.25, Math.PI], [6.7, -2.25, Math.PI]]) mob(casa, 'mobCadeira', x, z, .95, r);

  // Quarto e escritório.
  B(casa, 5.3, .04, 6.2, 0x5c3030, -7.05, .14, 5.1);
  B(casa, 3.35, .45, 4.8, 0x6b4a36, -6.7, .42, 4.85); B(casa, 3.2, .5, 4.55, 0xf1eee8, -6.7, .78, 4.7);
  B(casa, 3.1, .13, 2.35, 0x2f5e7b, -6.7, 1.05, 5.65); B(casa, 3.05, .16, .75, 0xe9edf0, -6.7, 1.02, 2.9);
  B(casa, 3.4, 1.4, .22, 0x754f38, -6.7, 1.2, 7.15); B(casa, 2.45, 3.05, .72, 0x655244, -10.5, 1.65, 5.9);
  mob(casa, 'mobAbajur', -4.5, 6.05, .62); mob(casa, 'mobComputador', -9.4, 1.65, .72); mob(casa, 'mobCadeira', -8.45, 1.75, .95, -Math.PI / 2);
  B(casa, 3.5, .12, 1.05, 0x72523d, -9.6, .92, 1.55); B(casa, .15, .78, .15, 0x4c382d, -10.9, .48, 1.55); B(casa, .15, .78, .15, 0x4c382d, -8.3, .48, 1.55);

  // Banheiro compacto e funcional no canto do quarto.
  paredeX(casa, -10.1, -1.8, 3.7, 0xd3dadb); paredeZ(casa, -8.65, -3.65, 2.8, 0xd3dadb);
  B(casa, 2.3, .035, 3.2, 0xb8c4c6, -10.65, .14, -1.8);
  B(casa, 1.45, .18, 1.25, 0xffffff, -10.7, .35, -2.6); B(casa, 1.1, .42, .75, 0xffffff, -10.7, .66, -2.75);
  C(casa, .42, .72, 0xffffff, -9.25, .45, -2.55); B(casa, .72, .8, .45, 0xffffff, -9.25, .75, -2.9);
  const vidroBanho = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.45), new THREE.MeshPhysicalMaterial({ color: 0xa8d8ed, transparent: true, opacity: .34, roughness: .08, side: THREE.DoubleSide }));
  vidroBanho.position.set(-11.55, 1.35, -1.15); vidroBanho.rotation.y = Math.PI / 2; casa.add(vidroBanho);

  // Garagem doméstica: bancada, armários, pneus, ferramentas e marcação no piso.
  for (const x of [-9.7, -7.2, -4.7]) B(casa, 2.1, .035, 6.5, 0xd2a800, x, .145, -4.3);
  B(casa, 5.2, .95, .8, 0x444d52, -8.8, .58, -8); B(casa, 5.2, .85, .13, 0x93422d, -8.8, 1.55, -8.36);
  for (const x of [-10.4, -9.6, -8.8, -8, -7.2]) B(casa, .09, .65, .09, 0xc7cdd0, x, 1.55, -8.25, .7);
  for (const z of [-7.2, -6.25, -5.3]) C(casa, .52, .3, 0x17191b, -3.2, .55, z, Math.PI / 2, .1, true);
  mob(casa, 'mobEstante', -3.35, -7.35, 1.85, Math.PI / 2);
  texto(casa, 'GARAGEM', -6.8, 3.05, -8.68, 3.8, .85, '#ffd52a');
  luz(casa, -7.2, 3.92, -4.1, 1.35, 9); luz(casa, -7.2, 3.92, 4.6, 1.15, 9); luz(casa, 5.3, 3.92, -4.4, 1.25, 9); luz(casa, 5.3, 3.92, 4.4, 1.25, 9);
  casa.add(new THREE.HemisphereLight(0xfff1d0, 0x4b5360, .55));

  // Oficina ampla e dirigível: portão central aberto, boxes, elevadores e recepção.
  const oficina = ambiente(32, 24, 0x454c51, 0x2b343b, 13.5, 7.2); oficina.visible = false;
  // Epóxi e faixas que guiam o carro do portão ao elevador.
  B(oficina, 13.4, .035, 22.8, 0x252c31, 0, .115, 0, .15, .38);
  for (const x of [-5.9, 5.9]) B(oficina, .22, .045, 22, 0xe4b90b, x, .145, 0, .1, .3);
  B(oficina, 10.8, .05, 6.2, 0x1c2226, 0, .16, -2.1, .55, .28);
  // Elevador principal, com espaço suficiente para estacionar.
  for (const x of [-4.8, 4.8]) {
    B(oficina, .42, 3.8, .42, 0xe1aa00, x, 2, -2.1, .45, .28);
    B(oficina, 4.25, .14, .48, 0xe1aa00, x > 0 ? 2.7 : -2.7, .34, -3.55, .45, .28);
    B(oficina, 4.25, .14, .48, 0xe1aa00, x > 0 ? 2.7 : -2.7, .34, -.65, .45, .28);
  }
  B(oficina, 10.1, .1, .28, 0xe1aa00, 0, 4.02, -2.1, .45, .28);
  texto(oficina, 'BOX PRINCIPAL', 0, 5.6, -11.84, 7.4, 1.25, '#ffd11a');
  // Área de ferramentas à esquerda.
  for (const x of [-13.8, -11.4, -9]) {
    B(oficina, 2.05, 1.15, .78, 0x9d2d2d, x, .67, -10.9, .15, .42);
    for (let k = 0; k < 3; k++) B(oficina, 1.7, .04, .08, 0x252a2d, x, .48 + k * .27, -10.48, .2);
  }
  B(oficina, 7.8, 2.35, .14, 0x4c555a, -11.6, 2.6, -11.72, .25, .5);
  for (let x = -14.4; x <= -8.8; x += .7) B(oficina, .07, .72, .08, 0xbfc8cc, x, 2.7, -11.61, .72, .25);
  for (const z of [-8.4, -6.6, -4.8]) C(oficina, .64, .34, 0x121416, -14.5, .68, z, Math.PI / 2, .1, true);
  for (const z of [-8.4, -6.6, -4.8]) C(oficina, .34, .62, z === -6.6 ? 0xd83a2d : 0x2263a2, -12.9, .38, z, 0, .55);
  // Bancada de motor e guincho.
  B(oficina, 5.5, .92, 1.1, 0x596267, -11.5, .58, .8, .45, .35);
  B(oficina, .25, 3.3, .25, 0xd33a2f, -8.5, 1.78, 2.8, .5); B(oficina, 3.1, .25, .25, 0xd33a2f, -10, 3.32, 2.8, .5);
  B(oficina, .1, 1.85, .1, 0xc7cdd0, -11.5, 2.35, 2.8, .8); C(oficina, .68, .9, 0x30363a, -11.5, .72, 2.8, 0, .65);
  // Recepção e computador de customização.
  B(oficina, 6.4, 1.05, 1.05, 0x252d32, -11.6, .64, 9.7, .25, .52);
  B(oficina, 6.45, .13, 1.2, 0xb8b4aa, -11.6, 1.22, 9.7, 0, .3);
  mob(oficina, 'mobComputador', -12.2, 9.55, .7); mob(oficina, 'mobCadeira', -11.2, 8.45, 1, Math.PI);
  texto(oficina, 'CUSTOMIZAÇÃO', -11.6, 3.1, 11.82, 6.3, 1.05, '#5ee7ff', '#10252fee', Math.PI);
  // Estoque de peças à direita, sem bloquear a pista central.
  for (const z of [-8.9, -5.8, -2.7, .4, 3.5, 6.6]) mob(oficina, 'mobEstante', 14.25, z, 2.35, Math.PI / 2);
  for (const z of [-8.6, -6.75, -4.9]) C(oficina, .67, .34, 0x141617, 11.9, .7, z, Math.PI / 2, .1, true);
  for (const [x, z, c] of [[9.8, 8.7, 0xd74232], [11.2, 8.7, 0x2f65a3], [12.6, 8.7, 0xd9ac22]]) C(oficina, .45, .9, c, x, .58, z, 0, .55);
  // Escritório envidraçado no canto direito.
  B(oficina, 6.2, 3.2, .15, 0x556169, 12.5, 1.68, 11.25, .2, .45);
  B(oficina, .15, 3.2, 5.1, 0x556169, 9.35, 1.68, 8.75, .2, .45);
  janela(oficina, 9.27, 2.1, 8.75, 3.7, 1.6, Math.PI / 2);
  mob(oficina, 'mobSofa', 12.6, 9.6, 2.2, Math.PI); mob(oficina, 'mobPlanta', 14.6, 10.2, 1.3);
  // Estrutura do portão suspenso e luzes industriais.
  for (const x of [-6.9, 6.9]) B(oficina, .35, 6.4, .45, 0x58636a, x, 3.2, 11.65, .65, .3);
  B(oficina, 14.2, .42, .52, 0x58636a, 0, 6.35, 11.65, .65, .3);
  for (const x of [-10.5, -3.5, 3.5, 10.5]) { luz(oficina, x, 6.72, -5.7, 1.7, 13); luz(oficina, x, 6.72, 4.8, 1.7, 13); }
  oficina.add(new THREE.HemisphereLight(0xe9f5ff, 0x343b42, .7));

  const grupos = { mercado: loja, posto: loja, casa, oficina };
  const estilosCasa = [
    { piso: 0x845f42, parede: 0xe8e3d9 }, { piso: 0x8b735b, parede: 0xe3eadf }, { piso: 0x56616b, parede: 0xe6e9ee }
  ];
  function mostrar(tipo, idx = 0) {
    Object.values(grupos).forEach(g => { g.visible = false; });
    const atual = grupos[tipo] || loja; atual.visible = true;
    if (tipo === 'mercado' || tipo === 'posto') {
      INT.w = 16; INT.d = 12; placaLoja.material.color.setHex(tipo === 'mercado' ? 0x0b6b2e : 0xb00020);
    } else if (tipo === 'casa') {
      INT.w = 24; INT.d = 18; const s = estilosCasa[idx] || estilosCasa[0]; pisoCasa.material.color.setHex(s.piso);
      casa.children.filter(n => n.isMesh && n.geometry?.parameters?.height > 3).forEach(p => { if (p.material?.color) p.material.color.setHex(s.parede); });
    } else { INT.w = 32; INT.d = 24; }
    return atual;
  }
  mostrar('mercado');
  return {
    caixa: { x: INT.x, z: INT.z - 4.45 }, cama: { x: INT.x - 6.7, z: INT.z + 4.85 },
    oficina: { x: INT.x - 12.2, z: INT.z + 9.5 },
    casaGrupo:casa, mostrar, cor: tipo => mostrar(tipo)
  };
}
