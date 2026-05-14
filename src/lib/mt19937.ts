export class MT19937 {
  private readonly mt = new Uint32Array(624);
  private idx = 624;

  constructor(seed: number) {
    this.seed(seed);
  }

  seed(seed: number): void {
    this.mt[0] = seed >>> 0;
    for (let i = 1; i < 624; i += 1) {
      const x = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (Math.imul(1812433253, x) + i) >>> 0;
    }
    this.idx = 624;
  }

  private generate(): void {
    for (let i = 0; i < 624; i += 1) {
      const y =
        ((this.mt[i] & 0x80000000) +
          (this.mt[(i + 1) % 624] & 0x7fffffff)) >>>
        0;
      this.mt[i] = (this.mt[(i + 397) % 624] ^ (y >>> 1)) >>> 0;
      if (y & 1) {
        this.mt[i] = (this.mt[i] ^ 0x9908b0df) >>> 0;
      }
    }
    this.idx = 0;
  }

  nextUint32(): number {
    if (this.idx >= 624) this.generate();
    let y = this.mt[this.idx];
    this.idx += 1;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  next(): number {
    return this.nextUint32() / 4294967296;
  }
}

export function djb2Seed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}
