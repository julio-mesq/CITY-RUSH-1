// Efeitos visuais: explosões (foguete / carro) e fumaça de carro danificado.
import * as THREE from 'three';
const lista = [], esf = new THREE.SphereGeometry(1, 8, 6); let cena;
export const iniciar = s => { cena = s; };
function novo(p, cor, op, e, d, sobe, y) {
  if(lista.length>120)return;
  const m = new THREE.Mesh(esf, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op }));
  m.position.copy(p); m.position.y += y; cena.add(m); lista.push({ m, t: 0, d, e, sobe, op });
}
export const explodir = (p, r = 6) => novo(p, 0xff8c00, .9, r, .6, 0, 1);
export const fumaca = p => novo(p, 0x444444, .6, 1.5, 1.2, 2, 1.5);
export function impacto(p, sangue=false) {
  for(let i=0;i<6;i++) {
    if(lista.length>120)break;
    novo(p,sangue?0x9d2032:0xffd58e,.9,.12,.35+Math.random()*.2,0,0);
    const o=lista[lista.length-1];o.v=new THREE.Vector3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3);o.m.scale.setScalar(.045);
  }
}
export function atualizar(dt) {
  for (let i = lista.length - 1; i >= 0; i--) {
    const o = lista[i]; o.t += dt; const k = o.t / o.d;
    o.m.scale.setScalar(o.v ? .035+o.e*k : .4 + o.e * k); o.m.position.y += o.sobe * dt; o.m.material.opacity = o.op * (1 - k);
    if(o.v){o.v.y-=7*dt;o.m.position.addScaledVector(o.v,dt);}
    if (k >= 1) { cena.remove(o.m); o.m.material.dispose(); lista.splice(i, 1); }
  }
}
