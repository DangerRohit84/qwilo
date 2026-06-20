declare module "streamifier" {
  import { Readable } from "stream";
  export function createReadStream(
    buffer: Buffer | Uint8Array,
    options?: any
  ): Readable;
}
