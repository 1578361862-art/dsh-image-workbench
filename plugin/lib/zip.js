// 极简 ZIP 写入器：store（不压缩）+ 本地头 + 中央目录 + EOCD + CRC32。
// 只依赖 Node 内置，够 JPEG 打包使用；不处理 ZIP64（>4GB / >65535 项直接报错）。
import { Buffer } from 'node:buffer'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear())
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

function normalizeEntryName(name) {
  if (typeof name !== 'string' || !name) throw new TypeError('zip entry name 不能为空')
  const normalized = name.replaceAll('\\', '/')
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new TypeError(`zip entry 不能是绝对路径: ${name}`)
  }
  if (/[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new TypeError('zip entry 含控制字符')
  }
  const segments = normalized.split('/')
  if (segments.some((part) => part === '' || part === '.' || part === '..')) {
    throw new TypeError(`zip entry 路径不安全: ${name}`)
  }
  if (Buffer.byteLength(normalized, 'utf8') > 255) throw new TypeError('zip entry 名字太长')
  return normalized
}

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  if (typeof data === 'string') return Buffer.from(data, 'utf8')
  throw new TypeError('zip entry data 必须是 Buffer/Uint8Array/string')
}

/**
 * @param {Array<{ name: string, data: Buffer|Uint8Array|string }>} entries
 * @param {{ now?: Date }} [options]
 * @returns {Buffer}
 */
export function createZip(entries, { now = new Date() } = {}) {
  if (!Array.isArray(entries)) throw new TypeError('entries 必须是数组')
  if (entries.length > 0xffff) throw new RangeError('zip 条目超过 65535，暂不支持 ZIP64')

  const { time, day } = dosDateTime(now)
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const entry of entries) {
    const name = normalizeEntryName(entry?.name)
    const data = toBuffer(entry?.data)
    if (data.length > 0xffffffff) throw new RangeError('zip 单文件超过 4GB，暂不支持 ZIP64')
    const nameBuffer = Buffer.from(name, 'utf8')
    const flags = /^[\x20-\x7e]*$/.test(name) ? 0 : 0x0800
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(flags, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuffer.length, 26)
    local.writeUInt16LE(0, 28)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x031e, 4) // made by: UNIX, 3.0
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(flags, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(day, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuffer.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)

    localParts.push(local, nameBuffer, data)
    centralParts.push(central, nameBuffer)
    offset += local.length + nameBuffer.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}
