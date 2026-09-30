// Veículos com marcas, modelos, formatos e desempenho diferentes.
// Quando o modelo tem um .glb associado (campo "glb"), a carroceria/rodas/interior
// vêm prontos do arquivo 3D. Sem "glb", desenha a carroceria procedural de sempre
// (vidros, faróis, lanternas, retrovisores, interior) — é o caso de reserva também
// enquanto os modelos ainda não terminaram de carregar.
import * as THREE from 'three';
import { teclas } from './player.js';
import { colide } from './world.js';
import * as Assets from './assets.js';
import { passoDrift } from './mechanics.js';

export const MODELOS = [
  { marca: 'City', nome: 'Hatch Compacto', cor: 0xd9d9d9, w: 1.7, h: 1.4, l: 3.9, cab: .55, vmax: 30, acel: 12, preco: 9000, glb: 'carroCompacto' },
  { marca: 'City', nome: 'Sedã Urbano', cor: 0x1e3a8a, w: 1.8, h: 1.45, l: 4.5, cab: .5, vmax: 34, acel: 14, preco: 18000, glb: 'carroUrbano' },
  { marca: 'City', nome: 'SUV 4x4', cor: 0x2f4f2f, w: 1.9, h: 1.7, l: 4.4, cab: .62, vmax: 32, acel: 14, preco: 32000, glb: 'suv' },
  { marca: 'Sport', nome: 'Coupé Esportivo', cor: 0xd40000, w: 1.95, h: 1.15, l: 4.5, cab: .4, vmax: 55, acel: 26, preco: 250000, glb: 'esportivoPack' },
  { marca: 'Utility', nome: 'Picape Cabine Dupla', cor: 0x333333, w: 2.2, h: 2.3, l: 6, cab: .35, vmax: 24, acel: 9, roda: .55, preco: 60000, glb: 'pickup' },
  { marca: 'Utility', nome: 'Van de Carga', cor: 0xf2f2f2, w: 2, h: 2.5, l: 5.6, cab: .8, vmax: 27, acel: 10, roda: .45, preco: 45000, glb: 'van' },
  { marca: 'Táxi', nome: 'Sedã Amarelo', cor: 0xffc400, w: 1.8, h: 1.45, l: 4.5, cab: .5, vmax: 33, acel: 13, preco: 15000, glb: 'carroUrbano' },
  { marca: 'Polícia', nome: 'Viatura Urbana', cor: 0x1e3a8a, teto: 0xffffff, w: 1.9, h: 1.5, l: 4.7, cab: .5, vmax: 40, acel: 18, preco: 70000, glb: 'policial' },
  // Novos, a partir dos modelos 3D enviados:
  // Estes arquivos foram exportados olhando para -Z, ao contrário do City Kit.
  // rotY: 0 é intencional: Math.PI repetia a rotação padrão e os fazia andar de ré.
  { marca: 'Rolls-Royce', nome: 'Phantom', cor: 0x101010, w: 2, h: 1.5, l: 5.6, cab: .5, vmax: 42, acel: 16, preco: 600000, glb: 'rollsroyce', rotY: 0 },
  { marca: 'Dodge', nome: 'Charger', cor: 0x8b0000, w: 1.95, h: 1.4, l: 5.1, cab: .45, vmax: 50, acel: 22, preco: 180000, glb: 'dodge', rotY: 0 },
  { marca: 'Mazda', nome: 'RX-7', cor: 0x1e88e5, w: 1.8, h: 1.2, l: 4.3, cab: .4, vmax: 52, acel: 24, preco: 150000, glb: 'rx7', rotY: 0 },
  { marca: 'Clássico', nome: 'Cupê Antigo', cor: 0x555555, w: 1.75, h: 1.4, l: 4.3, cab: .5, vmax: 26, acel: 11, preco: 12000, glb: 'antigo', rotY: 0 },
  { marca: 'Moto', nome: 'Esportiva', cor: 0x222222, w: .8, h: 1.1, l: 2.1, cab: .4, vmax: 48, acel: 28, preco: 8000, glb: 'moto', rotY: 0 },
  // Novos, a partir do "City Pack":
  { marca: 'Sport', nome: 'Supercarro', cor: 0xffb400, w: 1.9, h: 1.1, l: 4.5, cab: .4, vmax: 56, acel: 27, preco: 380000, glb: 'lambo' },
  { marca: 'Utility', nome: 'Van Urbana', cor: 0xe8e2d0, w: 1.9, h: 2, l: 4.3, cab: .7, vmax: 24, acel: 9, preco: 22000, glb: 'van' },
  { marca: 'Utility', nome: 'Picape Utilitária', cor: 0x2f2f2f, w: 2, h: 1.8, l: 5.3, cab: .5, vmax: 30, acel: 12, roda: .5, preco: 48000, glb: 'pickup' },
  { marca: 'Transporte', nome: 'Ônibus Urbano', cor: 0xffffff, w: 2.5, h: 3, l: 10, cab: .8, vmax: 22, acel: 6, roda: .5, preco: 150000, glb: 'onibus' },
  { marca: 'Moto', nome: 'Trail', cor: 0x8b0000, w: .8, h: 1.2, l: 2.1, cab: .4, vmax: 44, acel: 24, preco: 7000, glb: 'moto2', rotY: 0 },
  { marca: 'Bicicleta', nome: 'Urbana', cor: 0x1e88e5, w: .6, h: 1.1, l: 1.7, cab: .4, vmax: 13, acel: 8, preco: 400, glb: 'bike' },
];

export class Carro {
  constructor(scene, x, z, mod, yaw) {
    const m = this.m = mod, mt = c => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .25 });
    this.nome = m.marca + ' ' + m.nome; this.obj = new THREE.Group();
    this.duasRodas = ['moto', 'moto2', 'bike'].includes(m.glb);
    this.vmaxBase = m.vmax; this.acelBase = m.acel; this.partesPintura = []; this.partesRoda = [];
    this.tuning = { motor: 0, pintura: m.cor, aerofolio: 0, rodas: 0, suspensao: 1, turbo: false, neon:0 };
    this.volante = 0; this.marcha = 'N'; this.rpm = 800; this.farolLigado = false; this.lateral=0; this.impactoCd=0;
    const modelo3d = m.glb && Assets.clonarCena(m.glb);
    if (modelo3d) {
      // Enquadra o modelo pelo tamanho real (bounding box) e o recoloca:
      // recentralizado em x/z, "pés" (base) em y=0, comprimento igual ao "l" do MODELOS.
      const caixa = new THREE.Box3().setFromObject(modelo3d), centro = new THREE.Vector3(); caixa.getCenter(centro);
      const tamX = caixa.max.x - caixa.min.x, tamZ = caixa.max.z - caixa.min.z, comprimento = Math.max(tamX, tamZ) || 1;
      const wrapper = new THREE.Group();
      modelo3d.position.set(-centro.x, -caixa.min.y, -centro.z); // unidades originais (sem escala/rotação ainda)
      wrapper.add(modelo3d);
      wrapper.scale.setScalar(m.l / comprimento);
      // Se o "comprido" do modelo estava no eixo X, gira 90° para alinhar com o eixo Z (frente/trás do jogo).
      wrapper.rotation.y = (tamX > tamZ ? Math.PI / 2 : 0) + (m.rotY ?? Math.PI); // modelos do City Pack apontam para +Z; o jogo anda para -Z
      wrapper.traverse(n => {
        if (!n.isMesh) return;
        if (Array.isArray(n.material)) n.material = n.material.map(mat => mat.clone());
        else if (n.material) n.material = n.material.clone();
        n.castShadow = n.receiveShadow = true; n.frustumCulled = false;
        const materiais = Array.isArray(n.material) ? n.material : [n.material];
        materiais.forEach(mat => {
          if (!mat || mat.userData?.cityRushVeiculo) return;
          mat.userData.cityRushVeiculo = true;
          const nome = (n.name + ' ' + (mat.name || '')).toLowerCase();
          if ('envMapIntensity' in mat) mat.envMapIntensity = /glass|window|vidro/.test(nome) ? 1.08 : .68;
          if ('roughness' in mat) mat.roughness = /tire|tyre|pneu/.test(nome) ? .9 : /glass|window|vidro/.test(nome) ? .08 : Math.min(.48, mat.roughness ?? .4);
          if ('metalness' in mat && !/tire|tyre|pneu/.test(nome)) mat.metalness = Math.max(.28, mat.metalness ?? 0);
          if (/headlight|lamp|farol|light/.test(nome) && 'emissive' in mat) { mat.emissive.copy(mat.color); mat.emissiveIntensity = 1.25; }
          if (/wheel|roda|rim|aro/.test(nome) && 'color' in mat) this.partesRoda.push(mat);
          if (!/glass|window|vidro|tire|tyre|pneu|wheel|roda|light|lamp|farol|interior|seat|banco/.test(nome) && 'color' in mat) this.partesPintura.push(mat);
          if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 8; }
          mat.needsUpdate = true;
        });
      });
      this.exterior = wrapper; this.obj.add(wrapper);
    } else {
      // ---- carroceria procedural (usada quando o modelo não tem .glb ou ainda não carregou) ----
      const hb = m.h * .5, hc = m.h * .38, r = m.roda || .38, ilum = (c, i = 1.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: .4 });
      const y0 = .35, yTopoCarr = y0 + hb, yTopoCabine = yTopoCarr + hc; // alturas de referência: chassi → carroceria → cabine
      const b = new THREE.Mesh(new THREE.BoxGeometry(m.w, hb, m.l), mt(m.cor)); b.position.y = y0 + hb / 2; b.castShadow = b.receiveShadow = true; // carroceria (children[0])
      const vidro = new THREE.Mesh(new THREE.BoxGeometry(m.w * .92, hc, m.l * m.cab), new THREE.MeshPhysicalMaterial({ color: 0x0e1c26, transparent: true, opacity: .45, roughness: .1, metalness: .2, envMapIntensity: 1 }));
      vidro.position.set(0, yTopoCarr + hc / 2, m.l * .05);
      const teto = new THREE.Mesh(new THREE.BoxGeometry(m.w * .94, .05, m.l * m.cab * 1.03), mt(m.teto || m.cor)); teto.position.set(0, yTopoCabine + .03, m.l * .05); teto.castShadow = true;
      this.obj.add(b, vidro, teto);
      this.exterior = new THREE.Group();
      [b, vidro, teto].forEach(o => { this.obj.remove(o); this.exterior.add(o); });
      this.obj.add(this.exterior); this.partesPintura.push(b.material, teto.material);
      const parac = z0 => { const p = new THREE.Mesh(new THREE.BoxGeometry(m.w * .92, .22, .14), mt(0x151515)); p.position.set(0, y0 + .18, z0); return p; };
      this.exterior.add(parac(-m.l / 2 - .05), parac(m.l / 2 + .05));
      for (const sx of [-1, 1]) {
        const far = new THREE.Mesh(new THREE.BoxGeometry(.22, .14, .06), ilum(0xfff6d0, 1.4)); far.position.set(sx * m.w * .32, y0 + hb * .55, -m.l / 2 - .02); this.exterior.add(far);
        const lan = new THREE.Mesh(new THREE.BoxGeometry(.18, .13, .06), ilum(0xff2222, 1.1)); lan.position.set(sx * m.w * .34, y0 + hb * .6, m.l / 2 + .02); this.exterior.add(lan);
        const esp = new THREE.Mesh(new THREE.BoxGeometry(.06, .1, .18), mt(0x1a1a1a)); esp.position.set(sx * (m.w / 2 + .1), yTopoCarr + hc * .55, -m.l * .12); this.exterior.add(esp);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const pneu = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .3, 14), mt(0x0c0c0c)); pneu.rotation.z = Math.PI / 2; pneu.position.set(sx * m.w / 2, r, sz * m.l * .32); pneu.castShadow = true;
        const aro = new THREE.Mesh(new THREE.CylinderGeometry(r * .55, r * .55, .32, 8), mt(0xb8b8b8)); aro.rotation.z = Math.PI / 2; aro.position.copy(pneu.position); this.partesRoda.push(aro.material);
        this.exterior.add(pneu, aro);
      }
      const zPainel = -m.l * .28, zBanco = m.l * .04, yBanco = y0 + hb * .32, yPainel = y0 + hb * .82;
      const painel = new THREE.Mesh(new THREE.BoxGeometry(m.w * .82, .16, .32), mt(0x1c1c1c)); painel.position.set(0, yPainel, zPainel);
      const volante = new THREE.Mesh(new THREE.TorusGeometry(.15, .022, 8, 16), mt(0x141414)); volante.position.set(-m.w * .16, yPainel + .16, zPainel + .16); volante.rotation.x = 1.25;
      const cuboVol = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .05, 8), mt(0x2a2a2a)); cuboVol.rotation.x = 1.25; cuboVol.position.copy(volante.position);
      this.exterior.add(painel, volante, cuboVol);
      for (const sx of [-1, 1]) {
        const banco = new THREE.Mesh(new THREE.BoxGeometry(m.w * .34, .5, .5), mt(0x262626)); banco.position.set(sx * m.w * .22, yBanco, zBanco);
        const encosto = new THREE.Mesh(new THREE.BoxGeometry(m.w * .34, .55, .1), mt(0x262626)); encosto.position.set(sx * m.w * .22, yBanco + .38, zBanco + .22);
        this.exterior.add(banco, encosto);
      }
    }
    // Cabine própria para a câmera interna. Ela evita que a câmera atravesse a
    // lataria dos GLBs e dá a todos os automóveis painel, volante e acabamento.
    this.cabine = new THREE.Group(); this.cabine.visible = false;
    if (!this.duasRodas) {
      const escuro = mt(0x171b1f), painelMat = mt(0x262d32), couro = mt(0x2b2522), detalhe = mt(0x9aa4aa);
      const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); this.cabine.add(o); return o; };
      add(new THREE.BoxGeometry(m.w * .94, .08, m.l * .62), escuro, 0, .36, .08);
      add(new THREE.BoxGeometry(m.w * .92, .3, .42), painelMat, 0, .82, -m.l * .2);
      add(new THREE.BoxGeometry(m.w * .05, .72, m.l * .56), escuro, -m.w * .47, .72, .02);
      add(new THREE.BoxGeometry(m.w * .05, .72, m.l * .56), escuro, m.w * .47, .72, .02);
      add(new THREE.BoxGeometry(.2, .38, .55), painelMat, 0, .58, -.02);
      const vol = add(new THREE.TorusGeometry(.17, .022, 8, 18), escuro, -m.w * .22, .95, -m.l * .11, 1.18);
      add(new THREE.CylinderGeometry(.032, .032, .08, 8), detalhe, vol.position.x, vol.position.y, vol.position.z, 1.18);
      for (const sx of [-1, 1]) {
        add(new THREE.BoxGeometry(m.w * .34, .18, .48), couro, sx * m.w * .22, .46, .2);
        add(new THREE.BoxGeometry(m.w * .34, .55, .1), couro, sx * m.w * .22, .75, .42, -.08);
      }
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.055, .62, .06), detalhe, sx * m.w * .43, 1.02, -m.l * .22, 0, 0, sx * .18);
      this.obj.add(this.cabine);
    }
    this.aerofolio = new THREE.Group(); this.aerofolio.visible = false;
    if (!this.duasRodas) {
      const asa = new THREE.Mesh(new THREE.BoxGeometry(m.w * .72, .07, .28), mt(0x15191c)); asa.position.set(0, m.h * .72, m.l * .42);
      const pes = [-1, 1].map(s => { const o = new THREE.Mesh(new THREE.BoxGeometry(.07, .25, .08), mt(0x15191c)); o.position.set(s * m.w * .24, m.h * .61, m.l * .4); return o; });
      this.aerofolio.add(asa, ...pes); this.obj.add(this.aerofolio);
    }
    // Faróis reais são ativados apenas no veículo dirigido, evitando custo nos
    // veículos estacionados e no trânsito. A luz acompanha curvas e interiores.
    this.farois = new THREE.Group(); this.farois.visible = false;
    const foco = new THREE.SpotLight(0xd9edff, 28, 42, .46, .68, 1.45);
    foco.position.set(0, Math.max(.48, m.h * .42), -m.l * .43);
    foco.target.position.set(0, 0, -18); this.farois.add(foco, foco.target);
    for (const x of [-m.w * .29, m.w * .29]) {
      const lampada = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.12, m.w * .13), .1, .055), new THREE.MeshBasicMaterial({ color: 0xe8f7ff }));
      lampada.position.set(x, Math.max(.45, m.h * .43), -m.l * .5 - .035); this.farois.add(lampada);
    }
    this.obj.add(this.farois);
    this.neon=new THREE.Group();const neonMat=new THREE.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:.78,depthWrite:false});
    for(const x0 of [-m.w*.38,m.w*.38]){const faixa=new THREE.Mesh(new THREE.BoxGeometry(.07,.025,m.l*.72),neonMat);faixa.position.set(x0,.08,0);this.neon.add(faixa);}
    this.neonLuz=new THREE.PointLight(0x00e5ff,0,5.5,2);this.neonLuz.position.y=.18;this.neon.add(this.neonLuz);this.neon.visible=false;this.obj.add(this.neon);
    this.obj.position.set(x, 0, z); this.yaw = yaw; this.v = 0; this.hp = 100; scene.add(this.obj);
  }
  definirFarol(on) { on = !!on; if (on === this.farolLigado) return; this.farolLigado = on; this.farois.visible = on; }
  definirCameraInterna(on) {
    if (this.duasRodas) return;
    this.exterior.visible = !on; this.cabine.visible = on; this.aerofolio.visible = !on && this.tuning.aerofolio > 0;
  }
  aplicarCustomizacao(cfg = {}) {
    Object.assign(this.tuning, cfg);
    const cor = new THREE.Color(this.tuning.pintura ?? this.m.cor);
    this.partesPintura.forEach(mat => { mat.color.copy(cor); mat.needsUpdate = true; });
    const corRoda = [0xaeb6bd, 0x15191d, 0xb46b24][this.tuning.rodas] || 0xaeb6bd;
    this.partesRoda.forEach(mat => { mat.color.setHex(corRoda); mat.metalness = this.tuning.rodas === 1 ? .82 : .48; mat.roughness = this.tuning.rodas === 2 ? .52 : .26; mat.needsUpdate = true; });
    const altura = [-.12, 0, .14][this.tuning.suspensao] ?? 0; this.exterior.position.y = altura; this.aerofolio.position.y = altura;
    this.aerofolio.visible = !this.duasRodas && this.tuning.aerofolio > 0;
    if (this.aerofolio.children[0]) {
      const asa = this.aerofolio.children[0];
      asa.scale.set(this.tuning.aerofolio === 2 ? 1.18 : 1, this.tuning.aerofolio === 2 ? 1.3 : 1, this.tuning.aerofolio === 2 ? 1.45 : 1);
    }
    const neon=Number(this.tuning.neon)||0;this.neon.visible=!!neon;this.neonLuz.intensity=neon?2.2:0;this.neon.traverse(n=>{if(n.isMesh)n.material.color.setHex(neon||0x00e5ff);});this.neonLuz.color.setHex(neon||0x00e5ff);
  }
  dadosCustomizacao() { return { ...this.tuning }; }
  atualizar(dt, dirigindo) {
    if(this.hp<=0 || this.destruido || this.guardado)return;
    this.impactoCd=Math.max(0,this.impactoCd-dt);
    if (dirigindo) {
      const a = (teclas.KeyW ? 1 : 0) - (teclas.KeyS ? 1 : 0);
      const motor = 1 + this.tuning.motor * .13 + (this.tuning.turbo ? .15 : 0);
      const freandoSentido = a && a * this.v < -.5;
      this.v += a * (freandoSentido ? 34 : this.acelBase * motor) * dt;
      if (teclas.Space) this.v *= Math.exp(-(Math.abs(this.v)>8?1.8:6) * dt);
      const dirAlvo = (teclas.KeyA ? 1 : 0) - (teclas.KeyD ? 1 : 0);
      this.volante += (dirAlvo - this.volante) * (1 - Math.exp(-9 * dt));
      const aderencia = [1, 1.08, 1.16][this.tuning.rodas] || 1;
      const velocidade = Math.abs(this.v), resposta = .48 + .62 * (1 - Math.min(1, velocidade / Math.max(1, this.vmaxBase)));
      this.yaw += this.volante * dt * 1.85 * resposta * aderencia * Math.max(-1, Math.min(1, this.v / 5.5));
    } else this.volante *= Math.exp(-8 * dt);
    const vmax = this.vmaxBase * (1 + this.tuning.motor * .1 + (this.tuning.turbo ? .13 : 0));
    const acelerando = dirigindo && (teclas.KeyW || teclas.KeyS);
    this.v *= Math.exp(-(acelerando ? .14 : .46) * dt);
    this.v = Math.max(-9, Math.min(vmax, this.v)); if (Math.abs(this.v) < .025) this.v = 0;
    const kmh = Math.abs(this.v) * 3.6;
    this.marcha = this.v < -.6 ? 'R' : kmh < 2 ? 'N' : String(Math.min(6, Math.max(1, Math.ceil(kmh / Math.max(18, vmax * 3.6 / 6)))));
    const faixa = this.marcha === 'N' || this.marcha === 'R' ? .18 : (kmh % Math.max(18, vmax * 3.6 / 6)) / Math.max(18, vmax * 3.6 / 6);
    this.rpm += ((900 + faixa * 6100 + (acelerando ? 650 : 0)) - this.rpm) * (1 - Math.exp(-7 * dt));
    this.lateral=passoDrift(this.lateral,this.v,this.volante,dirigindo&&teclas.Space&&!this.duasRodas,1+this.tuning.rodas*.15,dt);
    const p = this.obj.position, dx = (-Math.sin(this.yaw)*this.v+Math.cos(this.yaw)*this.lateral)*dt, dz = (-Math.cos(this.yaw)*this.v-Math.sin(this.yaw)*this.lateral)*dt;
    if (colide(p.x + dx, p.z + dz, this.duasRodas?.45:Math.max(.85,this.m.w*.48))) { if(!this.impactoCd){this.hp=Math.max(0,this.hp-Math.abs(this.v)*.75);this.impactoCd=.3;} this.v *= -.22;this.lateral*=.3; }
    else { p.x += dx; p.z += dz; }
    this.obj.rotation.y = this.yaw;
    const inclinacao = this.duasRodas ? -this.volante * Math.min(1, Math.abs(this.v) / 10) * .24 : 0;
    this.obj.rotation.z += (inclinacao - this.obj.rotation.z) * (1 - Math.exp(-7 * dt));
  }
}
