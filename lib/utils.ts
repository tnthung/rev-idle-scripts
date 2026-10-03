import type { Planet, ZodiacSign, ZodiacStatType } from "./states.ts";


export async function pollFor(pred: () => boolean | Promise<boolean>, interval = 100, timeout = 5000) {
  while (!await pred() && timeout > 0) {
    await rev.sleep(interval);
    timeout -= interval;
  }

  return timeout > 0;
}


export function isStringNumeric(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  return !isNaN(Number(value)) && !isNaN(parseFloat(value));
}


const ZODIAC_LOADOUT_BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export class ZodiacLoadout {
  private name: string;
  private folded: boolean;
  private planets: Record<keyof typeof Planet, {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  }>;

  constructor(name = "") {
    this.name = name;
    this.folded = false;
    this.planets = {
      Sun: { sign: "Undefined", stats: [] },
      Moon: { sign: "Undefined", stats: [] },
      Mercury: { sign: "Undefined", stats: [] },
      Venus: { sign: "Undefined", stats: [] },
      Mars: { sign: "Undefined", stats: [] },
      Jupiter: { sign: "Undefined", stats: [] },
      Saturn: { sign: "Undefined", stats: [] },
      Uranus: { sign: "Undefined", stats: [] },
      Neptune: { sign: "Undefined", stats: [] },
      Pluto: { sign: "Undefined", stats: [] },
      Chiron: { sign: "Undefined", stats: [] },
      Fortune: { sign: "Undefined", stats: [] }
    };
  }

  public getName(): string {
    return this.name;
  }

  public setName(name: string): void {
    this.name = name;
  }

  public getFolded(): boolean {
    return this.folded;
  }

  public setFolded(folded: boolean): void {
    this.folded = folded;
  }

  public getPlanet(planet: keyof typeof Planet): {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  } {
    return this.planets[planet];
  }

  public setPlanet(planet: keyof typeof Planet, sign: keyof typeof ZodiacSign | "Undefined", stats: (keyof typeof ZodiacStatType | "Undefined")[]): void {
    this.planets[planet] = { sign, stats };
  }

  public getPlanets(): Record<keyof typeof Planet, {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  }> {
    return this.planets;
  }

  public setPlanets(planets: Record<keyof typeof Planet, {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  }>): void {
    this.planets = planets;
  }

  public encode(): string {
    // The game uses a public key; QuickJS's random source supplies the IV.
    const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    for (const part of encodeURIComponent(JSON.stringify(this)).match(/%[0-9A-F]{2}|[^%]/g)!)
      bytes.push(part[0] === "%" ? parseInt(part.slice(1), 16) : part.charCodeAt(0));
    const padding = 16 - bytes.length % 16;
    for (let i = 0; i < padding; i++) bytes.push(padding);

    const encrypted = cryptZodiacLoadout(bytes, false);
    let encoded = "";
    for (let i = 0; i < encrypted.length; i += 3) {
      const word = (encrypted[i] << 16) | ((encrypted[i + 1] ?? 0) << 8) | (encrypted[i + 2] ?? 0);
      encoded += ZODIAC_LOADOUT_BASE64[word >>> 18] + ZODIAC_LOADOUT_BASE64[(word >>> 12) & 63]
        + (i + 1 < encrypted.length ? ZODIAC_LOADOUT_BASE64[(word >>> 6) & 63] : "=")
        + (i + 2 < encrypted.length ? ZODIAC_LOADOUT_BASE64[word & 63] : "=");
    }
    return encoded;
  }

  public static decode(encoded: string): ZodiacLoadout {
    encoded = encoded.replace(/\s/g, "");
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
      throw new Error("Invalid zodiac loadout Base64.");
    const bytes: number[] = [];
    for (let i = 0; i < encoded.length; i += 4) {
      const word = (ZODIAC_LOADOUT_BASE64.indexOf(encoded[i]) << 18)
        | (ZODIAC_LOADOUT_BASE64.indexOf(encoded[i + 1]) << 12)
        | ((encoded[i + 2] === "=" ? 0 : ZODIAC_LOADOUT_BASE64.indexOf(encoded[i + 2])) << 6)
        | (encoded[i + 3] === "=" ? 0 : ZODIAC_LOADOUT_BASE64.indexOf(encoded[i + 3]));
      bytes.push((word >>> 16) & 255);
      if (encoded[i + 2] !== "=") bytes.push((word >>> 8) & 255);
      if (encoded[i + 3] !== "=") bytes.push(word & 255);
    }
    if (bytes.length < 32 || bytes.length % 16 !== 0)
      throw new Error("Invalid zodiac loadout ciphertext length.");

    const decrypted = cryptZodiacLoadout(bytes, true);
    const padding = decrypted[decrypted.length - 1];
    if (padding < 1 || padding > 16 || decrypted.slice(-padding).some(byte => byte !== padding))
      throw new Error("Invalid zodiac loadout padding.");
    const result = JSON.parse(decodeURIComponent(decrypted.slice(16, -padding)
      .map(byte => `%${byte.toString(16).padStart(2, "0")}`).join("")));

    const zodiacLoadout = new ZodiacLoadout();
    Object.assign(zodiacLoadout, result);
    return zodiacLoadout;
  }
}

// AES-256-CBC, retaining the 16-byte IV prefix in both directions.
function cryptZodiacLoadout(bytes: number[], decrypt: boolean): number[] {
  const sbox = (
    "637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0"
    + "b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275"
    + "09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cf"
    + "d0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2"
    + "cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdb"
    + "e0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08"
    + "ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9e"
    + "e1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16"
  ).match(/../g)!.map(byte => parseInt(byte, 16));
  const inverse: number[] = [];
  if (decrypt) sbox.forEach((byte, i) => inverse[byte] = i);
  const key = Array.from("6uV8O+L(XpXr((,N)!tk7SJMd!kea.!3", char => char.charCodeAt(0));
  let rcon = 1;
  for (let i = 32; i < 240; i += 4) {
    const word = key.slice(i - 4, i);
    if (i % 32 === 0) {
      word.push(word.shift()!);
      for (let j = 0; j < 4; j++) word[j] = sbox[word[j]];
      word[0] ^= rcon;
      rcon = (rcon << 1) ^ (rcon & 128 ? 0x11b : 0);
    } else if (i % 32 === 16) {
      for (let j = 0; j < 4; j++) word[j] = sbox[word[j]];
    }
    for (let j = 0; j < 4; j++) key.push(key[i - 32 + j] ^ word[j]);
  }

  const result = bytes.slice(0, 16);
  for (let offset = 16; offset < bytes.length; offset += 16) {
    let state = bytes.slice(offset, offset + 16);
    for (let i = 0; i < 16; i++)
      state[i] ^= key[(decrypt ? 224 : 0) + i] ^ (decrypt ? 0 : result[offset - 16 + i]);
    for (let round = 1; round <= 14; round++) {
      state = state.map((_, i) => decrypt
        ? inverse[state[(i + 16 - (i % 4) * 4) % 16]]
        : sbox[state[(i + (i % 4) * 4) % 16]]);
      if (decrypt)
        for (let i = 0; i < 16; i++) state[i] ^= key[(14 - round) * 16 + i];
      if (round < 14) {
        for (let i = 0; i < 16; i += 4) {
          let [a, b, c, d] = state.slice(i, i + 4);
          if (decrypt) {
            let u = a ^ c, v = b ^ d;
            for (let j = 0; j < 2; j++) {
              u = (u << 1) ^ (u & 128 ? 0x11b : 0);
              v = (v << 1) ^ (v & 128 ? 0x11b : 0);
            }
            a ^= u; c ^= u;
            b ^= v; d ^= v;
          }
          const sum = a ^ b ^ c ^ d;
          state[i]     = a ^ sum ^ ((a ^ b) << 1) ^ ((a ^ b) & 128 ? 0x11b : 0);
          state[i + 1] = b ^ sum ^ ((b ^ c) << 1) ^ ((b ^ c) & 128 ? 0x11b : 0);
          state[i + 2] = c ^ sum ^ ((c ^ d) << 1) ^ ((c ^ d) & 128 ? 0x11b : 0);
          state[i + 3] = d ^ sum ^ ((d ^ a) << 1) ^ ((d ^ a) & 128 ? 0x11b : 0);
        }
      }
      if (!decrypt)
        for (let i = 0; i < 16; i++) state[i] ^= key[round * 16 + i];
    }
    if (decrypt)
      for (let i = 0; i < 16; i++) state[i] ^= bytes[offset - 16 + i];
    result.push(...state);
  }
  return result;
}


declare global {
  interface ObjectConstructor {
    map<T, U>(
      obj: Record<string, T>,
      fn: (key: string, value: T) => [string, U] | null | undefined,
    ): Record<string, U>;
  }

  interface Object {
    dbg<T>(this: T, message?: string): T;
  }
}

Object.map = function(obj, fn) {
  return Object.fromEntries(Object.entries(obj)
    .map(([key, value]) => fn(key, value))
    .filter(entry => entry != null));
};

Object.prototype.dbg = function(message?: string) {
  if (message) console.log(`${message}:`, stringify(this, 2));
  else         console.log(stringify(this, 2));
  return this;
};


export class BigNum {
  static NEGLIGIBLE_THRESHOLD = 15;


  private man: bigint = 0n;
  private exp: bigint = 0n;

  static ZERO = new this(0);
  static ONE  = new this(1);

  constructor(value: number | string | bigint | BigNum) {
    if (value instanceof BigNum) {
      this.man = value.man;
      this.exp = value.exp;
      return;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error(`Invalid mantissa: ${value}`);
      return new BigNum(value.toString());
    }

    if (typeof value === "bigint") {
      return new BigNum(value.toString());
    }

    if (typeof value === "string") {
      let [man, exp="0", ...rest1] = value.split("e").map(part => part.trim());
      if ((rest1 != null && rest1.length > 0)
        || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(man)
        || !/^[+-]?\d+$/.test(exp))
        throw new Error(`Invalid number format: ${value}`);

      const neg = man[0] === "-";
      if (neg || man[0] === "+") man = man.slice(1);
      const [d, f=""] = man.split(".");
      const digits = (d + f).replace(/^0+/, "");
      if (digits === "") return;
      this.exp = BigInt(exp) + BigInt(d.length - (d + f).search(/[1-9]/) - 1);
      const significant = digits.slice(0, 16);
      this.man = BigInt(significant) * 10n ** BigInt(16 - significant.length);
      if (neg) this.man = -this.man;
      return;
    }

    throw new Error(`Invalid type for BigNum: ${value} (${typeof value})`);
  }

  private normalize() {
    if (this.man === 0n) {
      this.exp = 0n;
      return;
    }

    const negative = this.man < 0n;
    let digits = (negative ? -this.man : this.man).toString();
    if (digits.length > 16) {
      this.exp += BigInt(digits.length - 16);
      digits = digits.slice(0, 16);
    } else if (digits.length < 16) {
      this.exp -= BigInt(16 - digits.length);
      digits = digits.padEnd(16, "0");
    }
    this.man = BigInt(digits) * (negative ? -1n : 1n);
  }

  private fromParts(man: bigint, exp: bigint) {
    const ret = new BigNum(0);
    ret.man = man;
    ret.exp = exp;
    ret.normalize();
    return ret;
  }

  get mantissa(): number  {
    const digits = (this.man < 0n ? -this.man : this.man).toString().padStart(16, "0");
    return Number(`${this.man < 0n ? "-" : ""}${digits[0]}.${digits.slice(1)}`);
  }
  get exponent(): bigint  { return this.exp; }
  get isZero():   boolean { return this.man === 0n; }
  get isNeg():    boolean { return this.man < 0n; }
  get isPos():    boolean { return !this.isNeg; }

  cmp(other: BigNum | number | bigint): -1 | 0 | 1 {
    other = new BigNum(other);

    if (this.isZero || other.isZero || this.isNeg !== other.isNeg)
      return this.man < other.man ? -1 : this.man > other.man ? 1 : 0;

    const expDiff = this.exp - other.exp;
    if (expDiff !== 0n) return (expDiff > 0 ? 1 : -1) * (this.isNeg ? -1 : 1) as -1 | 0 | 1;
    return this.man < other.man ? -1 : this.man > other.man ? 1 : 0;
  }

  lt (other: BigNum | number | bigint) { return this.cmp(other) <   0; }
  lte(other: BigNum | number | bigint) { return this.cmp(other) <=  0; }
  gt (other: BigNum | number | bigint) { return this.cmp(other) >   0; }
  gte(other: BigNum | number | bigint) { return this.cmp(other) >=  0; }
  eq (other: BigNum | number | bigint) { return this.cmp(other) === 0; }
  neq(other: BigNum | number | bigint) { return this.cmp(other) !== 0; }

  max(other: BigNum | number | bigint) { return this.cmp(other) >= 0 ? new BigNum(this) : new BigNum(other); }
  min(other: BigNum | number | bigint) { return this.cmp(other) <= 0 ? new BigNum(this) : new BigNum(other); }

  static max(...values: BigNum[]) {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((max, val) => max.cmp(val) >= 0 ? max : val, values[0]);
  }

  static min(...values: BigNum[]) {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((min, val) => min.cmp(val) <= 0 ? min : val, values[0]);
  }

  sign() { return this.isZero ? 0 : this.isNeg ? -1 : 1; }
  neg()  { return this.fromParts(-this.man, this.exp); }
  abs()  { return this.fromParts(this.man < 0n ? -this.man : this.man, this.exp); }

  add(other: BigNum | number | bigint) {
    other = new BigNum(other);

    if (this.isZero) return new BigNum(other);
    if (other.isZero) return new BigNum(this);

    const baseE = this.exp < other.exp ? this.exp : other.exp;

    const eA = this.exp - baseE;
    if (eA > BigNum.NEGLIGIBLE_THRESHOLD)
      return new BigNum(this);

    const eB = other.exp - baseE;
    if (eB > BigNum.NEGLIGIBLE_THRESHOLD)
      return new BigNum(other);

    return this.fromParts(
      this.man * 10n ** eA +
      other.man * 10n ** eB,
      baseE);
  }

  sub(other: BigNum | number | bigint) {
    other = new BigNum(other);

    if (this.isZero) return other.neg();
    if (other.isZero) return new BigNum(this);

    const baseE = this.exp < other.exp ? this.exp : other.exp;

    const eA = this.exp - baseE;
    if (eA > BigNum.NEGLIGIBLE_THRESHOLD)
      return new BigNum(this);

    const eB = other.exp - baseE;
    if (eB > BigNum.NEGLIGIBLE_THRESHOLD)
      return other.neg();

    return this.fromParts(
      this.man * 10n ** eA -
      other.man * 10n ** eB,
      baseE);
  }

  mul(other: BigNum | number | bigint) {
    other = new BigNum(other);
    return this.fromParts(
      this.man * other.man,
      this.exp + other.exp - 15n);
  }

  div(other: BigNum | number | bigint) {
    other = new BigNum(other);
    if (other.isZero) throw new Error("Division by zero");
    return this.fromParts(
      this.man * 10n ** 16n / other.man,
      this.exp - other.exp - 1n);
  }

  static sum(...values: BigNum[]) {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((acc, val) => acc.add(val), new BigNum(0));
  }

  toString(manLen?: number): string {
    const digits = (this.man < 0n ? -this.man : this.man).toString().padStart(16, "0");
    const rendered = `${this.man < 0n ? "-" : ""}${digits[0]}.${digits.slice(1)}`.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    if (manLen == null)
      return `${rendered}e${this.exp}`;

    if (manLen === 0)
      return `e${this.exp}`;

    return `${rendered.slice(0, manLen).padEnd(manLen, "0")}e${this.exp}`;
  }

  toNumber(): number {
    const digits = (this.man < 0n ? -this.man : this.man).toString().padStart(16, "0");
    return Number(`${this.man < 0n ? "-" : ""}${digits[0]}.${digits.slice(1)}e${this.exp}`);
  }

  toInt(): number {
    return this.exp >= 15n ? this.toNumber() : Number(this.toBigInt());
  }

  toBigInt(): bigint {
    const shift = this.exp - 15n;
    if (shift >= 0n) return this.man * 10n ** shift;
    if (-shift > 16n) return this.isNeg ? -1n : 0n;
    const divisor = 10n ** -shift;
    return this.man / divisor - (this.man < 0n && this.man % divisor !== 0n ? 1n : 0n);
  }
}


export function stringify(value: any, space?: number | string): string {
  return JSON.stringify(value, function replacer(key, val) {
    if (val instanceof BigNum) return val.toString();
    if (val instanceof BigInt) return val.toString();
    if (val instanceof Set) return [...val];
    return val;
  }, space);
}


export function dbg<T>(value: T): T {
  console.log(stringify(value, 2));
  return value;
}


export function* range(start: number, end: number, step: number = 1) {
  if (start < end)      for (let i = start; i < end; i += step) yield i;
  else if (start > end) for (let i = start; i > end; i -= step) yield i;
}


export class GlobalVar<T extends RevJsonValue> {
  private key: string;
  constructor(key: string) {
    this.key = `__global_var_${key}__`;
  }

  async get(): Promise<T | undefined> {
    using _ = await rev.mutex(this.key);
    return rev.global[this.key] as T;
  }

  async getOrSet(defaultValue: T): Promise<T> {
    using _ = await rev.mutex(this.key);
    if (rev.global[this.key] === undefined)
      rev.global[this.key] = defaultValue;
    return rev.global[this.key] as T;
  }

  getUnguarded(): T | undefined {
    return rev.global[this.key] as T;
  }

  async set(value: T): Promise<void> {
    using _ = await rev.mutex(this.key);
    rev.global[this.key] = value;
  }

  async setIfNotExists(value: T): Promise<void> {
    using _ = await rev.mutex(this.key);
    if (rev.global[this.key] === undefined)
      rev.global[this.key] = value;
  }

  setUnguarded(value: T) {
    rev.global[this.key] = value;
  }

  /** Remember to release the mutex guard after acquiring it. */
  async acquire(): Promise<[MutexGuard, T]> {
    const guard = await rev.mutex(this.key);
    const value = rev.global[this.key] as T;
    return [guard, value];
  }

  async update(fn: (value: T | undefined) => T): Promise<void> {
    using _ = await rev.mutex(this.key);
    rev.global[this.key] = fn(rev.global[this.key] as T);
  }

  updateUnguarded(fn: (value: T | undefined) => T): void {
    rev.global[this.key] = fn(rev.global[this.key] as T);
  }
}


export type ScreenScopeGuard = (label?: string) => Promise<ScreenOwnership>;
export async function screenScope(label: string, fn: (so: ScreenScopeGuard) => Promise<void>) {
  let so: Promise<ScreenOwnership> | undefined;
  const getScreenOwnership = async (newLabel?: string) => {
    if (!so) so = rev.screenOwnership(newLabel ?? label);
    if (newLabel != null) (await so).rename(newLabel);
    return await so;
  };

  try { await fn(getScreenOwnership); }
  finally { (await so)?.release(); }
}


export class Timer {
  static PAUSE_THRESHOLD = 200;
  static MIN_TICK_INTERVAL = 10;

  private running: boolean = false;
  private pausing:  boolean = false;
  private elapsed: number = 0;

  constructor(createStopped = false) {
    if (!createStopped) this.restart();
  }

  getElapsed() {
    return this.elapsed;
  }

  restart() {
    if (this.running) {
      this.elapsed = 0;
      return;
    }

    this.elapsed = 0;
    this.running = true;
    this.pausing = false;

    (async () => {
      try {
        let lastTickAt = Date.now();
        while (this.running) {
          await rev.sleep(Timer.MIN_TICK_INTERVAL);
          if (this.pausing) continue;

          const now = Date.now();
          const delta = now - lastTickAt;

          if (delta <= Timer.PAUSE_THRESHOLD)
            this.elapsed += delta;
          lastTickAt = now;
        }
      } catch (err) {
        console.error("Timer encountered an error:", err);
      } finally {
        this.running = false;
      }
    })()
  }

  stop() {
    this.running = false;
  }

  stopped() {
    return !this.running;
  }

  pause() {
    this.pausing = true;
  }

  resume() {
    this.pausing = false;
  }

  paused() {
    return this.pausing;
  }
}


export type Enumerate<N extends number, Acc extends number[] = []> =
  Acc['length'] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc['length']]>;

export type Range<S extends number, E extends number> =
  Exclude<Enumerate<E>, Enumerate<S>>;


export enum UnityDirection {
  left,
  top,
  bottom,
  right,
}
