/** PRNG determinístico (mulberry32) para geração reproduzível dos itens. */

export type Rng = () => number;

export function criarRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function inteiro(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function escolher<T>(rng: Rng, lista: readonly T[]): T {
  if (lista.length === 0) throw new Error('escolher() em lista vazia');
  return lista[Math.floor(rng() * lista.length)];
}

export function embaralhar<T>(rng: Rng, lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Amostra sem reposição; se n >= lista.length, devolve tudo embaralhado. */
export function amostrar<T>(rng: Rng, lista: readonly T[], n: number): T[] {
  return embaralhar(rng, lista).slice(0, n);
}
