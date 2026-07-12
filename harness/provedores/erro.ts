export class ErroProvedor extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
  /** 429 e 5xx merecem retry com backoff; o resto é erro de verdade. */
  get transitorio(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}
