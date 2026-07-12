/** Limitador simples de concorrência (N promessas simultâneas por provedor). */

export type Limitador = <T>(fn: () => Promise<T>) => Promise<T>;

export function criarLimitador(max: number): Limitador {
  let ativos = 0;
  const fila: Array<() => void> = [];

  const proximo = () => {
    ativos--;
    fila.shift()?.();
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (ativos >= max) await new Promise<void>((resolve) => fila.push(resolve));
    ativos++;
    try {
      return await fn();
    } finally {
      proximo();
    }
  };
}
