// Missão principal (7 etapas + final por karma) e missões dadas por telefone. Destino atual = GPS.
// O conteúdo das 7 etapas muda conforme o "tipo de pessoa" escolhido na criação do personagem.
import * as THREE from 'three';
import { LUGARES } from './world.js';
import { ganhar } from './choices.js';

const TRILHAS = {
  trabalhador: [
    { t: 'Primeiro bico: entregue uma encomenda no marcador', x: 200, z: -100, tipo: 'ir', r: 6, d: 300, k: 2 },
    { t: 'Pegue um carro emprestado e leve até o marcador', x: -300, z: 300, tipo: 'carro', r: 8, d: 500, k: 2 },
    { t: 'Defenda-se de assaltantes (elimine 5)', tipo: 'matar', n: 5, d: 800, k: 0 },
    { t: 'Vá ao mercado comprar suprimentos', lugar: 'mercado', tipo: 'ir', r: 28, d: 400, k: 2 },
    { t: 'Leve o carro da oficina até o posto', lugar: 'posto', tipo: 'carro', r: 28, d: 600, k: 2 },
    { t: 'Ajude a conter uma gangue (elimine 8)', tipo: 'matar', n: 8, d: 1200, k: 5 },
    { t: 'Prove seu valor sob pressão (2+ estrelas)', x: 0, z: -600, tipo: 'ir', r: 8, d: 2000, est: 2, k: 10 },
  ],
  criminoso: [
    { t: 'Vá roubar a van no marcador', x: 200, z: -100, tipo: 'ir', r: 6, d: 350, k: -2 },
    { t: 'Roube um carro e leve até o desmanche', x: -300, z: 300, tipo: 'carro', r: 8, d: 600, k: -3 },
    { t: 'Elimine 5 rivais de gangue', tipo: 'matar', n: 5, d: 900, k: -5 },
    { t: 'Assalte o mercado marcado no mapa', lugar: 'mercado', tipo: 'ir', r: 28, d: 500, k: -5 },
    { t: 'Leve o carro roubado até o posto (revenda)', lugar: 'posto', tipo: 'carro', r: 28, d: 700, k: -3 },
    { t: 'Elimine 8 inimigos que atravessaram no seu território', tipo: 'matar', n: 8, d: 1500, k: -8 },
    { t: 'Fuja com o roubo da sua vida (2+ estrelas)', x: 0, z: -600, tipo: 'ir', r: 8, d: 2500, est: 2, k: -10 },
  ],
  policial: [
    { t: 'Patrulhe até o marcador e verifique uma denúncia', x: 200, z: -100, tipo: 'ir', r: 6, d: 300, k: 3 },
    { t: 'Escolte um veículo suspeito até o marcador', x: -300, z: 300, tipo: 'carro', r: 8, d: 500, k: 3 },
    { t: 'Prenda 5 criminosos foragidos', tipo: 'matar', n: 5, d: 800, k: 4 },
    { t: 'Investigue o mercado por furtos', lugar: 'mercado', tipo: 'ir', r: 28, d: 400, k: 3 },
    { t: 'Leve a viatura até o posto para reabastecer', lugar: 'posto', tipo: 'carro', r: 28, d: 600, k: 3 },
    { t: 'Desmantele uma gangue armada (prenda 8)', tipo: 'matar', n: 8, d: 1200, k: 6 },
    { t: 'Contenha o motim mesmo sob risco (2+ estrelas)', x: 0, z: -600, tipo: 'ir', r: 8, d: 2000, est: 2, k: 12 },
  ],
  executivo: [
    { t: 'Vá até a reunião de negócios no marcador', x: 200, z: -100, tipo: 'ir', r: 6, d: 600, k: 0 },
    { t: 'Leve seu carro importado até o evento', x: -300, z: 300, tipo: 'carro', r: 8, d: 1000, k: 0 },
    { t: 'Afaste 5 arruaceiros que atrapalham os negócios', tipo: 'matar', n: 5, d: 1200, k: -2 },
    { t: 'Vá ao mercado inaugurar a nova filial', lugar: 'mercado', tipo: 'ir', r: 28, d: 700, k: 0 },
    { t: 'Leve o carro da empresa até o posto da frota', lugar: 'posto', tipo: 'carro', r: 28, d: 900, k: 0 },
    { t: 'Livre-se de 8 concorrentes hostis', tipo: 'matar', n: 8, d: 2000, k: -3 },
    { t: 'Feche o negócio da vida sob pressão da mídia (2+ estrelas)', x: 0, z: -600, tipo: 'ir', r: 8, d: 4000, est: 2, k: 0 },
  ],
};
const MULT = { trabalhador: 1, criminoso: 1.2, policial: 1.1, executivo: 1.4 };
let MISSOES = TRILHAS.trabalhador, mult = 1;
let i = 0, mortes = 0, extra = null, farol, hooks={},ativa=false,preparada='';
const FALAS={
  trabalhador:['Marcos: Comece pequeno. Faça a primeira entrega e mostre que é confiável.','Marcos: Agora preciso que leve o veículo inteiro até o cliente.','Lia: Há assaltantes seguindo você. Eles estão marcados como alvos.','Rita: A cidade depende de quem trabalha. Busque os suprimentos.','Marcos: Leve o carro revisado até o posto.','Lia: A gangue bloqueou a rota. Derrube somente os alvos marcados.','Chefe da gangue: Você chegou longe, mas a cidade termina aqui.'],
  criminoso:['Tony: A van está marcada. Chegue ao local sem chamar atenção.','Tony: O desmanche paga bem por um carro inteiro.','Tony: Quatro rivais estão vindo atrás de você.','Lia: O mercado guarda o próximo pagamento.','Tony: Entregue o carro no ponto de revenda.','Tony: Limpe nosso território dos alvos marcados.','Rei do Crime: Esta cidade só tem espaço para um nome.'],
  policial:['Central: Verifique a denúncia no ponto indicado.','Central: Escolte o veículo até a área segura.','Central: Os foragidos foram identificados e marcados.','Central: Investigue o mercado.','Central: Leve a viatura para revisão.','Central: A gangue armada apareceu. Contenha os alvos.','Comandante corrupto: Você descobriu demais.'],
  executivo:['Assistente: Sua primeira reunião está no GPS.','Assistente: Leve o veículo da empresa até o evento.','Segurança: Os invasores foram identificados.','Assistente: A filial espera sua presença.','Assistente: A frota precisa deste veículo no posto.','Segurança: Os concorrentes enviaram homens armados.','Magnata rival: O controle da cidade será decidido agora.']
};
let tipoAtual='trabalhador';
const dest = () => extra || MISSOES[i], rnd = () => Math.round((Math.random() * 2 - 1) * 8) * 100;
function posicionar() { const m = dest(); farol.visible = !!m && m.x !== undefined; if (farol.visible) farol.position.set(m.x, 40, m.z); }
function chave(m){return (m===extra?'extra:':'historia:')+(m?.t||'fim');}
function preparar(){
  const m=dest();if(!ativa||!m||preparada===chave(m))return;preparada=chave(m);m.mortes=0;
  if(m.tipo==='matar')hooks.spawnAlvos?.(m.n,false);else if(m.tipo==='chefe')hooks.spawnAlvos?.(1,true);
  const fala=m===extra?'Contato: '+m.t:(FALAS[tipoAtual]?.[i]||m.t);hooks.dialogo?.(fala);
}
export function iniciar(scene, tipo = 'trabalhador', callbacks={}) {
  tipoAtual=tipo;hooks=callbacks;MISSOES = TRILHAS[tipo] || TRILHAS.trabalhador; mult = MULT[tipo] || 1;
  // Recompensas acumulativas e confronto final real.
  MISSOES.forEach((m,n)=>{m.arma=n===2?1:n===5?2:undefined;m.carro=n===1?0:undefined;});
  Object.assign(MISSOES[6],{tipo:'chefe',n:1,arma:3,carro:13,est:undefined,x:undefined,z:undefined,r:undefined});
  for (const m of MISSOES) if (m.lugar) { const l = LUGARES.find(k => k.tipo === m.lugar); m.x = l.x; m.z = l.z; }
  farol = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 80, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: .35, side: THREE.DoubleSide }));
  scene.add(farol); posicionar();
}
export function ativar(){if(ativa)return;ativa=true;preparar();}
// Missão de um contato do telefone (retorna false se já houver uma)
export function dar(tipo) {
  if (extra) return false;
  const p = LUGARES.filter(l => l.tipo === 'posto')[0], mk = LUGARES.find(l => l.tipo === 'mercado');
  const T = { entrega: { t: 'Entrega: leve um carro até o ponto', tipo: 'carro', x: rnd(), z: rnd(), r: 10, d: 400 }, matar: { t: 'Cobrança: elimine 4 alvos', tipo: 'matar', n: 4, d: 700 },
    posto: { t: 'Encontre o informante no posto', tipo: 'ir', x: p.x, z: p.z, r: 28, d: 300 }, fuga: { t: 'Fuga: chegue ao ponto com 2+ estrelas', tipo: 'ir', x: rnd(), z: rnd(), r: 10, est: 2, d: 1200 },
    taxi: { t: 'Táxi: leve o passageiro (de carro) até o ponto', tipo: 'carro', x: rnd(), z: rnd(), r: 10, d: 350 }, mercado: { t: 'Encomenda: vá ao mercado', tipo: 'ir', x: mk.x, z: mk.z, r: 28, d: 250 } };
  extra = { ...T[tipo], d: Math.round(T[tipo].d * mult), mortes: 0 };preparada=''; posicionar();preparar(); return true;
}
export const matou = (alvoMissao=false,chefe=false) => {if(!alvoMissao)return;if(extra?.tipo==='matar')extra.mortes++;else if(!extra&&['matar','chefe'].includes(MISSOES[i]?.tipo)){if(MISSOES[i].tipo!=='chefe'||chefe)mortes++;}};
export const atual = dest;
export function texto(jog) {
  const m = dest(); if (!m) return 'Missão principal concluída';
  const p = jog.veiculo ? jog.veiculo.obj.position : jog.obj.position;
  return (m === extra ? '📞 ' : 'Missão: ') + m.t + (['matar','chefe'].includes(m.tipo) ? ` (${m === extra ? extra.mortes : mortes}/${m.n})` : '') + (m.x !== undefined ? ` — GPS: ${Math.round(Math.hypot(p.x - m.x, p.z - m.z))} m` : '');
}
export function atualizar(jog, est) {
  const m = dest(); if (!m) return null;
  const p = jog.veiculo ? jog.veiculo.obj.position : jog.obj.position, perto = m.x !== undefined && Math.hypot(p.x - m.x, p.z - m.z) < m.r;
  const ok = m.tipo === 'ir' ? perto && (!m.est || est >= m.est) : m.tipo === 'carro' ? perto && !!jog.veiculo : (m === extra ? extra.mortes : mortes) >= m.n;
  if (!ok) return null;
  jog.dinheiro += m.d; if (m.k) ganhar(m.k); const eraExtra = m === extra;
  if (eraExtra) extra = null; else { i++; mortes = 0; }
  preparada='';posicionar();const fim=!eraExtra&&!MISSOES[i];if(!fim)preparar();return { recompensa: m.d, arma:m.arma,carro:m.carro,fim,historia:!eraExtra };
}
export const indice = () => i;
export const definir = v => { i = Math.min(v, MISSOES.length);preparada=''; posicionar(); };
