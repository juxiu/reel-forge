import {runAsync} from "../runtime/spawn.mjs";

/**
 * 统一走 spawn 层。
 *
 * 老写法直接 `spawn("ffprobe", …)`：Windows 上工具不在 PATH 时走 `p.on("error")`，
 * reject 出来的是一句没有命令名的 ENOENT，QC 报告里只剩「失败」，看不出是
 * **环境缺 ffmpeg** 还是 **画面真有问题**。现在错误里带命令名、退出码和 stderr 尾部，
 * 找不到二进制时还有明确的安装/覆盖提示（FFPROBE_PATH / FFMPEG_PATH）。
 */
async function run(command, args) {
  const r = await runAsync(command, args, {});
  if (r.error) throw new Error(`${command} 无法启动: ${r.error}`);
  if (r.status !== 0) throw new Error(`${command} failed: exit ${r.status ?? "signal " + r.signal} ${String(r.stderr).slice(-500)}`);
  return {out: r.stdout, err: r.stderr};
}

export async function probeMedia(file) {
  const r = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,r_frame_rate", "-of", "json", file]);
  return JSON.parse(r.out);
}

export async function mediaSignals(file) {
  const m = await run("ffmpeg", ["-hide_banner", "-i", file, "-vf", "select=gt(scene\\,0.03),showinfo", "-an", "-f", "null", "-"]);
  const b = await run("ffmpeg", ["-hide_banner", "-i", file, "-vf", "blackdetect=d=0.35:pix_th=0.02", "-an", "-f", "null", "-"]);
  return {motion_frames: (m.err.match(/showinfo/g) || []).length, black_segments: (b.err.match(/black_start:/g) || []).length};
}
