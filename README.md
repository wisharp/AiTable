# AiTable

一个运行在本地浏览器中的轻量级 Excel 数据看板。上传 Excel (.xlsx) 文件后，AiTable 会自动解析并展示数据预览，并允许在不同字段之间快速生成图表，帮助你在本地完成数据探索。

## 功能特性

- 📁 支持直接上传 Excel (`.xlsx`) 文件
- 👀 自动展示前 20 行数据，便于快速校验
- 📊 支持选择横轴、纵轴字段动态生成柱状图
- 🔒 数据始终在本地浏览器和本地服务之间传输，不依赖云端
- 🐳 提供跨架构（`linux/amd64` 与 `linux/arm64`）的 Docker 镜像构建方案，方便在不同硬件环境中部署

## 本地开发运行

```bash
# 1. 创建虚拟环境（可选）
python -m venv .venv
source .venv/bin/activate  # Windows 使用: .venv\Scripts\activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动服务（默认监听 5000 端口）
python app.py
```

启动后访问 <http://localhost:5000> 即可看到页面，在页面中上传 Excel 文件开始分析。

## 使用 Docker 运行

### 构建单架构镜像

```bash
docker build -t aitable:latest .
```

### 构建多架构镜像（x86_64 + arm64）

依赖 Docker Buildx：

```bash
# 如果尚未启用 buildx，可先创建构建器（只需执行一次）
docker buildx create --name aitbuilder --use

# 构建并推送/导出多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-registry>/aitable:latest \
  --push \
  .
```

若只想在本地生成多架构镜像以便测试，可将 `--push` 替换为 `--load`（注意：`--load` 只会生成当前主机架构的镜像）。

### 运行容器

```bash
docker run --rm -p 5000:5000 aitable:latest
```

然后在浏览器访问 [http://localhost:5000](http://localhost:5000)。

## 项目结构

```
.
├── app.py               # Flask 应用入口，处理页面渲染与 Excel 上传
├── requirements.txt     # Python 依赖列表
├── Dockerfile           # 多架构兼容的 Docker 构建配置
├── templates/
│   └── index.html       # 页面模版
└── static/
    ├── css/
    │   └── styles.css   # 页面样式
    └── js/
        └── main.js      # 交互与图表逻辑
```

## 常见问题

- **上传失败或无法生成图表？** 确保文件为 `.xlsx` 格式，并且包含至少一列可识别的数值数据。
- **如何修改服务端口？** 运行容器时通过 `-p <host_port>:5000` 映射到需要的端口；本地运行时可在启动命令前设置 `PORT` 环境变量，例如 `PORT=8080 python app.py`。

欢迎自由扩展功能，例如支持更多图表类型、增加数据清洗逻辑等。祝使用愉快！
