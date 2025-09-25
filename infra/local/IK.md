下面给你三种在 **docker-compose** 里启用 IK 的做法（按稳定性从高到低排列）。任选其一即可。

---

# 方案 A：**构建期安装（推荐，最稳）**

**1) 新建 `Dockerfile.opensearch`**（把与你 3.0 兼容的 IK 插件 zip 放到当前目录，例如 `opensearch-analysis-ik-3.0.x.zip`）：

```dockerfile
# 固定小版本，避免未来 3.x 升级导致插件不兼容
FROM opensearchproject/opensearch:3.0.0

# 将已下载好的 IK 插件 zip 拷入镜像（改成你实际文件名）
COPY opensearch-analysis-ik-3.0.x.zip /tmp/ik.zip

# 安装 IK 插件并清理
RUN /usr/share/opensearch/bin/opensearch-plugin install --batch file:///tmp/ik.zip \
 && rm -f /tmp/ik.zip
```

**2) 修改 compose（将 `image:` 改为 `build:` 引用上面的 Dockerfile）**

```yaml
services:
  opensearch:
    build:
      context: .
      dockerfile: Dockerfile.opensearch
    env_file:
      - ../../.env.core
      - ../../.env.features
    environment:
      - discovery.type=single-node
      - plugins.security.disabled=${OPENSEARCH_SECURITY_DISABLED:-true}
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
    ulimits: { memlock: { soft: -1, hard: -1 } }
    ports: ["9200:9200", "9600:9600"]
    volumes:
      - opensearch_data:/usr/share/opensearch/data
      - opensearch_logs:/usr/share/opensearch/logs
      - ./opensearch.yml:/usr/share/opensearch/config/opensearch.yml:ro
      # （可选）把自定义词典挂进插件 config 目录
      # - ./ik/custom.dic:/usr/share/opensearch/plugins/analysis-ik/config/custom.dic:ro
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 30

volumes:
  opensearch_data:
  opensearch_logs:
```

> 优点：镜像内含插件，启动快、可复用；不会在每次启动时重新装插件。
> 验证：容器起来后执行
> `docker exec -it <容器名> bash -lc "bin/opensearch-plugin list && curl -s localhost:9200/_cat/plugins?v"`
> 应能看到 `analysis-ik`（或相近名称）。

---

# 方案 B：**启动时安装（无需自建镜像，但每次新容器会装一次）**

把 IK 插件 zip 放在宿主机 `./plugins/opensearch-analysis-ik.zip`，compose 里让容器启动前先检测并安装。

```yaml
services:
  opensearch:
    image: opensearchproject/opensearch:3.0.0
    env_file:
      - ../../.env.core
      - ../../.env.features
    environment:
      - discovery.type=single-node
      - plugins.security.disabled=${OPENSEARCH_SECURITY_DISABLED:-true}
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
    ulimits: { memlock: { soft: -1, hard: -1 } }
    ports: ["9200:9200", "9600:9600"]
    volumes:
      - opensearch_data:/usr/share/opensearch/data
      - opensearch_logs:/usr/share/opensearch/logs
      - ./opensearch.yml:/usr/share/opensearch/config/opensearch.yml:ro
      - ./plugins:/plugins:ro   # 放 IK 插件 zip 的目录
      # （可选）自定义词典
      # - ./ik:/usr/share/opensearch/plugins/analysis-ik/config:ro
    entrypoint: ["/bin/bash","-lc"]
    command: >
      '
      set -e;
      if ! /usr/share/opensearch/bin/opensearch-plugin list | grep -q "analysis-ik"; then
        echo "[install] installing IK plugin...";
        /usr/share/opensearch/bin/opensearch-plugin install --batch file:///plugins/opensearch-analysis-ik.zip;
      else
        echo "[install] IK already installed";
      fi;
      exec /usr/share/opensearch/opensearch-docker-entrypoint.sh
      '
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 30

volumes:
  opensearch_data:
  opensearch_logs:
```

> 优点：不需要 build；缺点：每次**新建**容器都要跑一次安装（几秒~几十秒）。
> 注意：请固定 `image: opensearchproject/opensearch:3.0.0` 或你实际小版本，避免 3.x 自动升级导致不兼容。

---

# 方案 C：**多插件组合（IK + 拼音，可选）**

如果还想要中文→拼音检索（同音/首字母匹配），把 pinyin 插件 zip 一并装上（文件名替换为你的实际文件名）：

* **在方案 A 的 Dockerfile** 里加一行：

```dockerfile
COPY opensearch-analysis-pinyin-3.0.x.zip /tmp/pinyin.zip
RUN /usr/share/opensearch/bin/opensearch-plugin install --batch file:///tmp/pinyin.zip \
 && rm -f /tmp/pinyin.zip
```

* **或在方案 B 的 command** 里追加安装步骤：

```bash
if ! bin/opensearch-plugin list | grep -q "analysis-pinyin"; then
  bin/opensearch-plugin install --batch file:///plugins/opensearch-analysis-pinyin.zip;
fi;
```

---

## 索引与 analyzer 最小示例（IK 组合）

创建索引（索引用 `ik_max_word`，查询用 `ik_smart`）：

```json
PUT my_zh_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "ik_index":  { "tokenizer": "ik_max_word" },
        "ik_search": { "tokenizer": "ik_smart" }
      }
    }
  },
  "mappings": {
    "properties": {
      "title":   { "type": "text", "analyzer": "ik_index", "search_analyzer": "ik_search" },
      "content": { "type": "text", "analyzer": "ik_index", "search_analyzer": "ik_search" }
    }
  }
}
```

快速验证：

```json
POST /_analyze
{
  "tokenizer": "ik_max_word",
  "text": "菊花茶真好喝"
}
```

---

## 常见坑位与建议

* **固定小版本**：把镜像固定到 `3.0.0`（或你当前的 3.0.x），防止上游 3.x 升级导致插件不兼容。
* **每个节点都要装**：集群里所有 data/ingest 节点都必须安装同样的插件版本。
* **词典路径**：不同 IK 实现默认的 `config` 目录可能略有不同，通常在
  `/usr/share/opensearch/plugins/analysis-ik/config/`，你可以把 `custom.dic`、`stopword.dic` 挂进去（见上方 volumes 注释）。
* **冷启动失败**：若首次启动失败，多半是插件与引擎不匹配或 zip 损坏；换用严格匹配 3.0 的 release。

---

如果你告诉我**你手上 IK 插件 zip 的具体文件名**（或来源地址）以及是否需要 **K8s 部署版**，我可以把上面的 compose/Dockerfile 精确到你的文件名与路径，并附一套回归脚本（`_cat/plugins`、`_analyze`、样例 `multi_match` 查询）。
