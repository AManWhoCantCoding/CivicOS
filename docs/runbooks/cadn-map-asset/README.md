# Runbook — tạo và cài CADN MBTiles

## Quyết định nguồn

Không chờ asset nội bộ. Theo quyết định MVP dùng chung cho PS-E1-004, PS-E1-005
và PS-E1-007, tạo basemap OSS theo chuỗi:

```text
OSM PBF Việt Nam (Geofabrik hoặc BBBike custom extract)
  → cắt bbox CADN
  → OpenMapTiles custom extract
  → storage/tiles/cadn/cadn.mbtiles
  → TileServer GL
```

Không dùng sample Zurich của TileServer. OSM attribution phải được giữ trong
runtime style và asset provenance.

## Bbox bắt buộc

```text
minLon=105.93, minLat=20.91, maxLon=106.03, maxLat=20.99
```

## 1. Tạo asset ngoài repository

Tải Vietnam PBF từ nguồn Geofabrik chính thức hoặc tạo custom extract trên BBBike.
Không tải trực tiếp vào `storage/` và không commit PBF/MBTiles.

Nếu có `osmium-tool`, cắt extract:

```powershell
osmium extract -b 105.93,20.91,106.03,20.99 `
  vietnam-latest.osm.pbf `
  -o cadn.osm.pbf
```

Dùng pipeline OpenMapTiles đã được operator chọn để tạo **vector MBTiles** từ
`cadn.osm.pbf`. PBF raw không được mount trực tiếp vào TileServer GL. Output phải
có tên `cadn.mbtiles`.

## 2. Cài đúng vị trí

```powershell
New-Item -ItemType Directory -Force storage/tiles/cadn | Out-Null
Copy-Item .\cadn.mbtiles .\storage\tiles\cadn\cadn.mbtiles
```

## 3. Kiểm tra metadata trước Docker

MBTiles là SQLite. Kiểm tra tối thiểu bảng `metadata`, `tiles`, metadata
`format=pbf`, bounds nằm trong CADN và `json` có `vector_layers` tương thích
OpenMapTiles/basic-preview. Nếu một điều kiện fail, xóa candidate khỏi vị trí
runtime và không start TileServer.

Ví dụ kiểm tra read-only bằng Python:

```powershell
@'
import json, sqlite3

path = r"storage/tiles/cadn/cadn.mbtiles"
cadn = (105.93, 20.91, 106.03, 20.99)
db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
meta = dict(db.execute("select name, value from metadata"))
assert meta.get("format") == "pbf", meta.get("format")
bounds = tuple(map(float, meta["bounds"].split(",")))
assert bounds[0] >= cadn[0] and bounds[1] >= cadn[1]
assert bounds[2] <= cadn[2] and bounds[3] <= cadn[3]
layers = json.loads(meta["json"])["vector_layers"]
assert layers, "missing vector_layers"
assert db.execute("select count(*) from tiles").fetchone()[0] > 0
print({"format": meta["format"], "bounds": bounds,
       "vector_layers": [layer["id"] for layer in layers]})
'@ | Set-Content -Encoding utf8 "$env:TEMP\validate-cadn-mbtiles.py"
python "$env:TEMP\validate-cadn-mbtiles.py"
Remove-Item "$env:TEMP\validate-cadn-mbtiles.py"
```

Đây là file tạm ngoài repository. Không thay validation bằng việc chỉ thấy file
tồn tại.

## 4. Khởi động và smoke test

Chỉ chạy sau khi metadata pass:

```powershell
docker compose stop tileserver
docker compose up -d tileserver
Invoke-WebRequest http://localhost:8080/health
Invoke-WebRequest http://localhost:8080/styles/basic-preview/style.json
```

Đọc style để lấy source/tile template, sau đó request một tile vector nằm trong
bbox CADN. Không coi health đơn lẻ là bằng chứng coverage đúng khu vực.

Ghi hash asset:

```powershell
Get-FileHash .\storage\tiles\cadn\cadn.mbtiles -Algorithm SHA256
```

Lưu source URL, ngày tải, hash, công cụ/pipeline và attribution/licence vào
operator artifact ngoài production database. `storage/` bị gitignore; kiểm tra
asset không nằm trong staged files.

## 5. Khi chưa có asset hoặc validation fail

```powershell
docker compose stop tileserver
```

Không chạy `docker compose up -d tileserver`, không dùng Zurich/sample data và
không sửa code để giả provider healthy. Ứng dụng phải giữ trạng thái
`MAP_PROVIDER_UNAVAILABLE`/provider unavailable; domain queue/detail vẫn có thể
trình diễn độc lập.
