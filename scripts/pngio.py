#!/usr/bin/env python3
"""PNG 读写（纯 stdlib：zlib + struct），QC 测量层的唯一图像入口。

为什么不用 Pillow / numpy：这台机器和任何一台「clone 下来先跑门禁」的机器都不保证装了它们
（实测：python3 有，numpy 与 PIL 没有）。而 QC 层最不能接受的失败模式就是「依赖缺失 → 脚本
压根没跑 → 上层却报 PASS」。所以测量层只能依赖标准库，帧格式因此必须是 PNG：
纯 python 解 JPEG（Huffman + 反量化 + IDCT）不是这里该维护的东西。
scripts/render.sh 因此抽帧改成 f_%04d.png。

支持：bit depth 8，color type 0/2/3/4/6，全部 5 种行过滤，tRNS 调色板透明。
明确拒绝（而不是静默近似）：16-bit、隔行(Adam7)、非 zlib 压缩。
"""
import struct
import zlib

SIGNATURE = b"\x89PNG\r\n\x1a\n"
COLOR_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


class PngError(Exception):
    pass


def _paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


class Image:
    """行主序的 8-bit 图像。rows[y] 是长度 width*channels 的 bytearray。"""

    __slots__ = ("width", "height", "channels", "rows", "palette", "transparency")

    def __init__(self, width, height, channels, rows, palette=None, transparency=None):
        self.width = width
        self.height = height
        self.channels = channels
        self.rows = rows
        self.palette = palette
        self.transparency = transparency

    # ---- 通道归一 ----
    def to_rgb(self):
        """统一成 3 通道。调色板在这里展开；带 alpha 的丢弃 alpha（QC 判的是画面像素，不是合成）。"""
        if self.channels == 3 and not self.palette:
            return self
        if self.palette:
            pal = self.palette
            out = []
            for row in self.rows:
                out.append(bytearray(v for px in row for v in pal[px][:3]))
            return Image(self.width, self.height, 3, out)
        if self.channels == 1:
            out = [bytearray(v for g in row for v in (g, g, g)) for row in self.rows]
            return Image(self.width, self.height, 3, out)
        if self.channels == 2:
            out = [bytearray(v for g, _a in zip(row[0::2], row[1::2]) for v in (g, g, g)) for row in self.rows]
            return Image(self.width, self.height, 3, out)
        if self.channels == 4:
            out = [bytearray(v for rgb in zip(row[0::4], row[1::4], row[2::4], row[3::4]) for v in rgb[:3]) for row in self.rows]
            return Image(self.width, self.height, 3, out)
        return self

    def crop_rows(self, top, bottom):
        """按行裁取景区（y 上含下不含），返回新 Image，通道不变。"""
        lo = max(0, min(self.height, top))
        hi = max(lo, min(self.height, bottom))
        return Image(self.width, hi - lo, self.channels, self.rows[lo:hi], self.palette, self.transparency)

    def scale_to_width(self, target_width):
        """等比缩放到目标宽度，箱式平均（area-average）。

        ⚠ 不能只按像素抽稀：隔行取样会把 1px 的描边直接采没，帧差会虚高成「有动作」。
        箱式平均是纯 python 里唯一既稳定又便宜的降采样；宽高不能整除时边缘箱取实际可用的行列数，
        这样同一部片子的每一帧得到完全相同的输出尺寸（可复现性要求）。
        """
        if target_width >= self.width:
            return self
        target_height = max(1, int(round(self.height * target_width / self.width)))
        ch = self.channels
        out = []
        for oy in range(target_height):
            y0 = oy * self.height // target_height
            y1 = min(self.height, max(y0 + 1, (oy + 1) * self.height // target_height))
            band = self.rows[y0:y1]
            n_rows = len(band)
            # 先在源宽度上求纵向均值，再横向归箱：两次取整各做一次，误差不会叠两遍。
            colmean = [0] * (self.width * ch)
            for r in band:
                for i, v in enumerate(r):
                    colmean[i] += v
            colmean = [v // n_rows for v in colmean]
            row = bytearray(target_width * ch)
            for ox in range(target_width):
                x0 = ox * self.width // target_width
                x1 = min(self.width, max(x0 + 1, (ox + 1) * self.width // target_width))
                n_cols = x1 - x0
                base = ox * ch
                for c in range(ch):
                    row[base + c] = sum(colmean[x * ch + c] for x in range(x0, x1)) // n_cols
            out.append(row)
        return Image(target_width, target_height, ch, out)

    def pixel(self, x, y):
        base = x * self.channels
        row = self.rows[y]
        return tuple(row[base : base + self.channels])


def read(path):
    with open(path, "rb") as handle:
        data = handle.read()
    return read_bytes(data, path)


def read_bytes(data, source="<bytes>"):
    if not data.startswith(SIGNATURE):
        raise PngError(f"{source}: 不是 PNG（签名不匹配）；JPEG 帧请先由 scripts/render.sh 出 PNG")
    pos = len(SIGNATURE)
    idat = []
    ihdr = None
    palette = None
    transparency = None
    while pos < len(data):
        if pos + 8 > len(data):
            raise PngError(f"{source}: PNG 块头越界（文件被截断？）")
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length  # length + type + data + crc
        if ctype == b"IHDR":
            width, height, depth, color, compress, filter_method, interlace = struct.unpack(">IIBBBBB", chunk[:13])
            if depth != 8:
                raise PngError(f"{source}: 只支持 8-bit，实际 {depth}-bit")
            if interlace:
                raise PngError(f"{source}: 不支持隔行 Adam7 PNG —— Remotion/ffmpeg 出的都是非隔行，出现即说明来源不对")
            if compress or filter_method:
                raise PngError(f"{source}: 只支持 deflate 压缩 + 标准行过滤")
            if color not in COLOR_CHANNELS:
                raise PngError(f"{source}: 未知 color type {color}")
            ihdr = (width, height, color)
        elif ctype == b"PLTE":
            palette = [tuple(chunk[i : i + 3]) for i in range(0, len(chunk), 3)]
        elif ctype == b"tRNS":
            transparency = list(chunk)
        elif ctype == b"IDAT":
            idat.append(chunk)
        elif ctype == b"IEND":
            break
    if ihdr is None or not idat:
        raise PngError("缺 IHDR 或 IDAT")
    width, height, color = ihdr
    channels = COLOR_CHANNELS[color]
    raw = zlib.decompress(b"".join(idat))
    stride = width * channels
    rows = _unfilter(raw, height, stride, channels)
    if color == 3:
        if not palette:
            raise PngError("color type 3 却没有 PLTE")
        return Image(width, height, 1, rows, palette=palette, transparency=transparency)
    return Image(width, height, channels, rows, transparency=transparency)


def _unfilter(raw, height, stride, bpp):
    """5 种行过滤还原（bit depth 固定 8 → bpp 就是通道数）。

    ⚠ bpp 必须按通道数取：给 RGB 用 4 会让 Sub/Paeth 多退一字节，整行从第二个像素起
    就平移错位 —— 图看起来「差不多」但所有测量都不可信，是最难查的一类 bug。
    """
    out = []
    prev = bytearray(stride)
    pos = 0
    for _ in range(height):
        ftype = raw[pos]
        pos += 1
        cur = bytearray(raw[pos : pos + stride])
        pos += stride
        if ftype == 0:
            pass
        elif ftype == 1:  # Sub
            for i in range(bpp, stride):
                cur[i] = (cur[i] + cur[i - bpp]) & 0xFF
        elif ftype == 2:  # Up
            for i in range(stride):
                cur[i] = (cur[i] + prev[i]) & 0xFF
        elif ftype == 3:  # Average
            for i in range(stride):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:  # Paeth
            for i in range(stride):
                left = cur[i - bpp] if i >= bpp else 0
                up = prev[i]
                upleft = prev[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + _paeth(left, up, upleft)) & 0xFF
        else:
            raise PngError(f"未知行过滤类型 {ftype}")
        out.append(cur)
        prev = cur
    return out


def write(path, width, height, channels, rows, filter_type=0):
    """写 8-bit PNG。给合成帧与回归测试用 —— 测量层必须能自己造输入，
    否则在没有 ffmpeg 的机器上整个 QC 层无从验证。

    filter_type 0–4 都要能写：解码器的 5 条过滤分支否则永远测不到
    （生产抽帧拿到什么过滤是编码器决定的，不由我们选）。
    """
    if channels not in (1, 2, 3, 4):
        raise PngError("channels 必须是 1/2/3/4")
    if filter_type not in range(5):
        raise PngError("filter_type 必须是 0–4")
    color = {1: 0, 2: 4, 3: 2, 4: 6}[channels]
    stride = width * channels
    raw = bytearray()
    prev = bytearray(stride)
    for row in rows:
        if len(row) != stride:
            raise PngError("行长不等于 width*channels")
        raw.append(filter_type)
        raw.extend(_filter_row(bytes(row), prev, stride, channels, filter_type))
        prev = bytearray(row)
    chunks = [
        _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, color, 0, 0, 0)),
        _chunk(b"IDAT", zlib.compress(bytes(raw), 6)),
        _chunk(b"IEND", b""),
    ]
    blob = SIGNATURE + b"".join(chunks)
    with open(path, "wb") as handle:
        handle.write(blob)
    return len(blob)


def _filter_row(cur, prev, stride, bpp, ftype):
    if ftype == 0:
        return cur
    if ftype == 1:
        return bytes((cur[i] - (cur[i - bpp] if i >= bpp else 0)) & 0xFF for i in range(stride))
    if ftype == 2:
        return bytes((cur[i] - prev[i]) & 0xFF for i in range(stride))
    if ftype == 3:
        return bytes((cur[i] - (((cur[i - bpp] if i >= bpp else 0) + prev[i]) >> 1)) & 0xFF for i in range(stride))
    return bytes(
        (cur[i] - _paeth(cur[i - bpp] if i >= bpp else 0, prev[i], prev[i - bpp] if i >= bpp else 0)) & 0xFF for i in range(stride)
    )


def _chunk(ctype, payload):
    return struct.pack(">I", len(payload)) + ctype + payload + struct.pack(">I", zlib.crc32(ctype + payload) & 0xFFFFFFFF)
