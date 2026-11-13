"""拆取参考视频分析帧，不修改原视频或正式美术素材。"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np

parser = argparse.ArgumentParser(description='拆帧并生成视频分析联系表')
parser.add_argument('video')
parser.add_argument('--step', type=float, default=1)
parser.add_argument('--crop', type=int, nargs=4)
parser.add_argument('--start', type=float, default=0)
parser.add_argument('--end', type=float)
parser.add_argument('--output', default='reference_analysis')
args = parser.parse_args()
root = Path(args.output)
(root / 'frames').mkdir(parents=True, exist_ok=True)
(root / 'measurements').mkdir(exist_ok=True)
capture = cv2.VideoCapture(args.video)
if not capture.isOpened():
    raise RuntimeError('无法打开参考视频')
fps = capture.get(cv2.CAP_PROP_FPS)
duration = capture.get(cv2.CAP_PROP_FRAME_COUNT) / fps
metadata = dict(width=int(capture.get(3)), height=int(capture.get(4)),
                fps=fps, duration=duration, frames=int(capture.get(7)))
(root / 'measurements' / 'video.json').write_text(
    json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
tiles = []
times = np.arange(args.start, min(args.end or duration, duration), args.step)
for seconds in times:
    capture.set(cv2.CAP_PROP_POS_MSEC, float(seconds * 1000))
    ok, frame = capture.read()
    if not ok:
        continue
    if args.crop:
        x, y, width, height = args.crop
        frame = frame[y:y+height, x:x+width]
    name = 'frame_{:07.2f}.jpg'.format(seconds)
    cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tofile(str(root / 'frames' / name))
    thumb = cv2.resize(frame, (480, 270))
    cv2.rectangle(thumb, (0, 0), (125, 28), (20, 20, 20), -1)
    cv2.putText(thumb, '{:.2f}s'.format(seconds), (8, 21), cv2.FONT_HERSHEY_SIMPLEX, .65, (255,255,255), 1)
    tiles.append(thumb)
    if len(tiles) == 20 or seconds == times[-1]:
        while len(tiles) % 4:
            tiles.append(np.zeros((270,480,3), dtype=np.uint8))
        sheet = np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)])
        path = root / 'measurements' / 'sheet_{:07.2f}.jpg'.format(seconds)
        cv2.imencode('.jpg',sheet)[1].tofile(str(path))
        tiles.clear()
capture.release()
print(json.dumps(metadata))
