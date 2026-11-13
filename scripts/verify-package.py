"""独立验证 ZIP 的 CRC、文件集合、内容和发布前 SHA-256。"""
import hashlib
import json
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent
report = json.loads((root / 'release/preflight-report.json').read_text(encoding='utf-8-sig'))
if report['status'] != 'PASS':
    raise RuntimeError('发布前检查未通过')
archive = root / 'release' / ('genki-ramen-shop-' + report['version'] + '.zip')
with zipfile.ZipFile(str(archive)) as package:
    if package.testzip() is not None:
        raise RuntimeError('ZIP CRC 校验失败')
    expected = {item['path'] for item in report['hashes']}
    if len(package.namelist()) != len(expected) or set(package.namelist()) != expected:
        raise RuntimeError('ZIP 存在缺失、重复或额外文件')
    for item in report['hashes']:
        data = package.read(item['path'])
        if data != (root / 'dist-wechat' / item['path']).read_bytes():
            raise RuntimeError('ZIP 与当前运行文件不一致：' + item['path'])
        if hashlib.sha256(data).hexdigest() != item['sha256']:
            raise RuntimeError('ZIP 与发布前校验不一致：' + item['path'])
result = {
    'date': datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d'),
    'version': report['version'], 'status': 'PASS', 'files': len(expected),
    'archive': archive.relative_to(root).as_posix(),
    'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'crc': 'PASS', 'matchesCurrentRuntime': 'PASS',
}
(root / 'release/zip-integrity.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
