import sys
import os
import subprocess
import time
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

def main():
    t0 = time.time()
    print("=" * 60)
    print("STRANGER THINGS LIGHTNING VIDEO GENERATOR")
    print("=" * 60)

    # 1. Load Background & Lightning Source
    pumpkin_path = "/Users/chinmayb/Desktop/StrangerThinks/public/pumpkin-patch-bg-hd.jpg"
    lightning_path = "/Users/chinmayb/.gemini/antigravity-ide/brain/582f8f2d-a0d7-4f65-a33b-049dc11878f5/.user_uploaded/media_1791564298515.png"

    pumpkin_img = Image.open(pumpkin_path).convert("RGB")
    pw, ph = pumpkin_img.size
    print(f"Loaded Pumpkin Background: {pw}x{ph}")
    pumpkin_arr = np.array(pumpkin_img, dtype=np.float32) / 255.0

    light_img = Image.open(lightning_path).convert("RGBA")
    lw, lh = light_img.size
    print(f"Loaded Lightning Source: {lw}x{lh}")
    l_arr = np.array(light_img, dtype=np.float32)

    # Clean luminance
    raw_lum = np.maximum(l_arr[:, :, 0], np.maximum(l_arr[:, :, 1], l_arr[:, :, 2])) / 255.0
    raw_lum = np.clip((raw_lum - 0.05) / 0.95, 0.0, 1.0)

    # 2. Precompute Lightning Glow Layers
    print("Precomputing multi-scale lightning bloom layers...")
    def prepare_bolt(lum, scale, offset_x, offset_y, flip_h=False):
        if flip_h:
            lum = np.fliplr(lum)
        nlw, nlh = int(lw * scale), int(lh * scale)
        scaled = np.array(
            Image.fromarray((lum * 255).astype(np.uint8)).resize((nlw, nlh), Image.Resampling.LANCZOS),
            dtype=np.float32
        ) / 255.0

        canvas = np.zeros((ph, pw), dtype=np.float32)
        pos_x = (pw - nlw) // 2 + offset_x
        pos_y = offset_y
        sy1 = max(0, pos_y)
        sy2 = min(ph, pos_y + nlh)
        sx1 = max(0, pos_x)
        sx2 = min(pw, pos_x + nlw)
        canvas[sy1:sy2, sx1:sx2] = scaled[sy1 - pos_y : sy2 - pos_y, sx1 - pos_x : sx2 - pos_x]

        core = np.power(canvas, 2.8) * 1.6
        inner = gaussian_filter(canvas, sigma=3.2)
        mid = gaussian_filter(canvas, sigma=14.0)
        far = gaussian_filter(canvas, sigma=45.0)
        sky = gaussian_filter(canvas, sigma=110.0) * 0.75
        return core, inner, mid, far, sky

    # Bolt 1: Center-left primary strike
    b1_core, b1_inner, b1_mid, b1_far, b1_sky = prepare_bolt(
        raw_lum, scale=2.35, offset_x=-60, offset_y=-40, flip_h=False
    )
    # Bolt 2: Center-right flipped secondary strike
    b2_core, b2_inner, b2_mid, b2_far, b2_sky = prepare_bolt(
        raw_lum, scale=2.2, offset_x=120, offset_y=-20, flip_h=True
    )

    # Precombine static multi-layer weights for each bolt into single RGB lightning maps
    # Red: intense outer + mid + inner + core
    # Green/Blue: only inner core for incandescent white/pink electrical center
    b1_r = b1_far * 1.8 + b1_mid * 2.2 + b1_inner * 1.5 + b1_core * 1.3
    b1_g = b1_inner * 0.16 + b1_core * 0.78
    b1_b = b1_inner * 0.25 + b1_core * 0.88

    b2_r = b2_far * 1.8 + b2_mid * 2.2 + b2_inner * 1.5 + b2_core * 1.3
    b2_g = b2_inner * 0.16 + b2_core * 0.78
    b2_b = b2_inner * 0.25 + b2_core * 0.88

    print("Bloom precomputation complete!")

    # 3. Construct Frame Timeline (240 frames @ 30fps = 8.0s seamless loop)
    total_frames = 240
    fps = 30
    b1_intensity = np.zeros(total_frames, dtype=np.float32)
    b2_intensity = np.zeros(total_frames, dtype=np.float32)
    distant_sky_pulse = np.zeros(total_frames, dtype=np.float32)

    # --- Strike 1 (Left / Center Sky): frames 20 to 38 ---
    b1_intensity[20] = 0.28   # leader spark
    b1_intensity[21] = 0.65   # pre-flash
    b1_intensity[22] = 1.45   # MEGA STRIKE
    b1_intensity[23] = 0.40   # rapid dip
    b1_intensity[24] = 1.10   # secondary surge
    b1_intensity[25] = 0.25   # dip
    b1_intensity[26] = 0.70   # flicker
    b1_intensity[27] = 0.35   # aftershock
    b1_intensity[28] = 0.50
    for i in range(29, 40):
        decay = np.exp(-(i - 28) / 3.0)
        b1_intensity[i] = 0.35 * decay

    # --- Strike 2 (Right Sky): frames 75 to 94 ---
    b2_intensity[75] = 0.30
    b2_intensity[76] = 0.70
    b2_intensity[77] = 1.50   # MEGA STRIKE 2
    b2_intensity[78] = 0.35
    b2_intensity[79] = 1.05
    b2_intensity[80] = 0.22
    b2_intensity[81] = 0.60
    b2_intensity[82] = 0.30
    for i in range(83, 96):
        decay = np.exp(-(i - 82) / 3.2)
        b2_intensity[i] = 0.25 * decay

    # --- Strike 3 (Cataclysmic Dual Strike - Full Horizon): frames 134 to 164 ---
    b1_intensity[134] = 0.40
    b2_intensity[134] = 0.35
    b1_intensity[135] = 0.85
    b2_intensity[135] = 0.80
    b1_intensity[136] = 1.60  # APOCALYPTIC DUAL STRIKE
    b2_intensity[136] = 1.50
    b1_intensity[137] = 0.45
    b2_intensity[137] = 0.40
    b1_intensity[138] = 1.30  # MASSIVE RESTRIKE
    b2_intensity[138] = 1.20
    b1_intensity[139] = 0.30
    b2_intensity[139] = 0.25
    b1_intensity[140] = 0.90
    b2_intensity[140] = 0.80
    b1_intensity[141] = 0.45
    b2_intensity[141] = 0.40
    b1_intensity[142] = 0.65
    b2_intensity[142] = 0.55
    for i in range(143, 165):
        decay = np.exp(-(i - 142) / 4.5)
        b1_intensity[i] = 0.40 * decay
        b2_intensity[i] = 0.35 * decay

    # --- Ambient Sheet Lightning / Rumbling Horizon: frames 198 to 215 ---
    for i in range(198, 216):
        distant_sky_pulse[i] = np.sin((i - 198) / 18.0 * np.pi) * 0.45

    # 4. Pipe Directly into ffmpeg for H.264 MP4
    mp4_out = "/Users/chinmayb/Desktop/StrangerThinks/public/stranger-things-bg.mp4"
    webm_out = "/Users/chinmayb/Desktop/StrangerThinks/public/stranger-things-bg.webm"

    print("Encoding H.264 MP4 video via ffmpeg...")
    cmd_mp4 = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{pw}x{ph}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-preset", "medium",
        "-crf", "19",
        "-movflags", "+faststart",
        mp4_out
    ]

    proc = subprocess.Popen(cmd_mp4, stdin=subprocess.PIPE)

    for f_idx in range(total_frames):
        i1 = b1_intensity[f_idx]
        i2 = b2_intensity[f_idx]
        ds = distant_sky_pulse[f_idx]

        # Calculate lighting components
        # 1. Total Bolt RGB
        tot_r = i1 * b1_r + i2 * b2_r
        tot_g = i1 * b1_g + i2 * b2_g
        tot_b = i1 * b1_b + i2 * b2_b

        # 2. Atmospheric Sky Flash (casts eerie red light over pumpkins & clouds)
        sky_factor = (i1 * b1_sky + i2 * b2_sky) * 0.6 + ds * (b1_sky * 0.25 + b2_sky * 0.25)
        
        # Ambient light added to the scene
        amb_r = sky_factor * 1.6
        amb_g = sky_factor * 0.12
        amb_b = sky_factor * 0.18

        # 3. Base Scene with ambient light illumination
        scene_r = np.clip(pumpkin_arr[:, :, 0] + amb_r, 0.0, 1.0)
        scene_g = np.clip(pumpkin_arr[:, :, 1] + amb_g, 0.0, 1.0)
        scene_b = np.clip(pumpkin_arr[:, :, 2] + amb_b, 0.0, 1.0)

        # 4. Screen Blend for the electric bolts
        out_r = 1.0 - (1.0 - scene_r) * (1.0 - np.clip(tot_r, 0.0, 1.0))
        out_g = 1.0 - (1.0 - scene_g) * (1.0 - np.clip(tot_g, 0.0, 1.0))
        out_b = 1.0 - (1.0 - scene_b) * (1.0 - np.clip(tot_b, 0.0, 1.0))

        frame_bytes = (np.clip(np.stack([out_r, out_g, out_b], axis=2) * 255.0, 0, 255).astype(np.uint8)).tobytes()
        proc.stdin.write(frame_bytes)

        if f_idx % 40 == 0 or f_idx == total_frames - 1:
            print(f"Rendered frame {f_idx + 1}/{total_frames} ({(f_idx + 1) / total_frames * 100:.1f}%)")

    proc.stdin.close()
    proc.wait()
    print(f"MP4 successfully generated at: {mp4_out} (Size: {os.path.getsize(mp4_out) / 1024:.1f} KB)")

    # 5. Also create WebM version using ffmpeg
    print("Converting to WebM (VP9) for cross-browser fallback...")
    cmd_webm = [
        "ffmpeg", "-y",
        "-i", mp4_out,
        "-c:v", "libvpx-vp9",
        "-crf", "28",
        "-b:v", "0",
        "-deadline", "good",
        "-cpu-used", "2",
        webm_out
    ]
    subprocess.run(cmd_webm, check=True)
    print(f"WebM successfully generated at: {webm_out} (Size: {os.path.getsize(webm_out) / 1024:.1f} KB)")

    print(f"Total time elapsed: {time.time() - t0:.2f} seconds")
    print("Done!")

if __name__ == "__main__":
    main()
