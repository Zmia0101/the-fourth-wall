# 第四面墙

一个「和书里的人物对话」的平台。把书放进来、给人物写好设定，就能像和真人一样，和书中的人物聊天。

名字取自戏剧里的「第四面墙」——观众与舞台之间那层看不见的墙。在这里，你隔着这层墙，和书里的灵魂说话。

## ⚠️ 免责声明 / Disclaimer

- 本项目是 **实验性项目**（Experimental Project），仅用于学习、研究和测试目的。
- 本项目**不适用于生产环境**，也不建议用于任何商业用途。
- 本项目代码由 AI 辅助生成，人类仅负责规划与审查。项目以 MIT 协议发布，作者不对代码的原创性、完整性或适用性作任何担保。
- 使用者需自行承担使用风险，作者不对因使用本项目而产生的任何直接或间接损失负责。
- 使用者应自行确保导入的书籍、正文及上传内容的来源合法，并遵守相关版权规定与第三方服务条款。

> 以上内容仅为项目使用说明，不构成法律意见；如需正式发布或商用，请自行咨询专业人士。

## 功能

- **书架式界面**：左边书架、右边对话，一格一本，滚轮翻阅
- **单聊 / 群聊**：和一个人物聊，也能在同一本书里拉多个人物一起聊
- **按「房」分组**：比如《红楼梦》的怡红院、潇湘馆，一次显示一个房，点标签切换
- **整本正文 / 分章阅读**：右侧有「正文」和「章节」按钮，章节是左目录右正文
- **对话时检索原著**：和《红楼梦》人物聊天时，会按你的问题去书里检索相关章节
- **我要创作**：注册后可以写自己的书，设定人物、上传封面，然后和它们对话
- **用户自带 API Key**：每个人用自己的 Key，不占用平台方的额度
- **删除前自动备份**：误删的书可以从 `backups/` 找回

## 本地运行

需要 Python 3.10 或以上。

**Windows 一键运行（推荐）**

```
git clone https://github.com/Zmia0101/the-fourth-wall.git
```

然后**双击项目里的 `start.bat`**。第一次运行它会自动：创建虚拟环境 → 安装依赖 → 启动服务 → 打开浏览器。之后每次只要双击它，几秒就能用；关掉那个黑窗口就是停止服务。

如果提示找不到 Python，说明电脑上还没装，去 <https://www.python.org/downloads/> 装一个 3.10 以上版本，安装时记得勾选 **Add Python to PATH**。

**手动运行（其他系统）**

```
git clone https://github.com/Zmia0101/the-fourth-wall.git
cd the-fourth-wall
python -m venv venv
source venv/bin/activate      # Windows 用 venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

浏览器打开 <http://127.0.0.1:5000>

**启动之后的第一步**

打开网站 → 点首页的「登录」气泡 → 注册一个账号 → 按提示填入**你自己的 API Key**（DeepSeek、智谱等都可以）→ 保存。之后就能开始对话和创作了。

### 关于 `.env`

项目用 `.env` 里的大模型配置作为"默认值"（`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`）。

**当前版本已不再使用全局 Key 兜底**：对话、群聊、生成摘要都只使用**用户在网页里填写的自己的 API Key**。所以 `.env` 里的 Key 可以留空，`LLM_BASE_URL` / `LLM_MODEL` 用于给用户未填 Base URL 和模型时兜底。

## 更新到最新版

**你的数据不会因为更新而丢失。** 账号、你创作的书、备份都在下面这三个目录里，它们已经被 `.gitignore` 排除，`git` 永远不会碰它们：

```
data/        账号与 API Key
userbooks/   用户创作的书
backups/     删除前的自动备份
```

所以更新只需要两步：

1. 拉取最新代码：`git pull`
2. 重启程序：关掉运行窗口，重新双击 `start.bat`

Windows 上也可以直接双击 **`update.bat`**：它会先把你上面三个数据目录各备份一份到 `_update_backup/`，再执行 `git pull`，最后补装可能新增的依赖。万一 `git pull` 失败，数据也在 `_update_backup/` 里，不会丢。

> **前提**：项目要用 `git clone` 方式获取（不是 GitHub 上点 "Download ZIP" 下载的），并且电脑上装了 [Git](https://git-scm.com/downloads)。脚本会自动检查这两点，不满足时会给出中文提示。
>
> 如果你是 ZIP 下载的，没有 `.git` 文件夹，那就手动更新：下载最新版解压到新文件夹，再把旧版里的 `data/`、`userbooks/`、`backups/` 三个文件夹拷过去，你的账号和作品就都在。

### 假设你想回到某个已发布的版本

版本发布之后，仓库里会给它打上标签（tag），你可以按自己的节奏切过去。假设你想回到已经发布的 `v0.1.0`：

```
git fetch --tags        # 把所有版本标签拉到本地
git tag                 # 看看有哪些版本可选
git checkout v0.1.0     # 切到你要的那个版本
```

切换之后，关掉运行窗口、重新双击 `start.bat` 即可。你的数据（`data/`、`userbooks/`、`backups/`）不受影响。想回到最新代码：`git checkout main`

> **提示**：目前项目还没有发布过任何版本标签，所以 `git tag` 会列不出东西，`git checkout v0.1.0` 也会报 `pathspec 'v0.1.0' did not match`——这属于正常情况，等有了正式发布的版本再用即可。具体有哪些版本可选，以 `git tag` 的输出、或 GitHub 仓库 Releases 页面列出的为准。

## 数据在哪里

| 目录 / 文件 | 内容 | 会提交到 git 吗 |
| --- | --- | --- |
| `books/` | 内置书（红楼梦等） | 会 |
| `userbooks/` | 用户创作的书 | 不会 |
| `data/` | 账号、API Key | 不会 |
| `backups/` | 删除前的自动备份 | 不会 |
| `_update_backup/` | `update.bat` 更新前的数据备份 | 不会 |
| `.env` | 环境变量 | 不会 |
| `venv/` | Python 虚拟环境 | 不会 |

**换电脑或重装时，把整个项目文件夹拷走就行**，数据都在里面。

## 目录结构

```
app.py                 后端：路由、人物设定读取、对话、创作、备份
requirements.txt       依赖
start.bat / update.bat     Windows 一键启动 / 更新
books/                 内置书
  hello/               你好（Mia，平台使用手册）
  hongloumeng/         红楼梦（含 80 回章节）
userbooks/             用户创作的书（运行期生成）
data/                  账号与密钥（运行期生成）
backups/               自动备份（运行期生成）
templates/index.html   页面结构
static/css/style.css   样式（含各书主题配色）
static/js/main.js      前端逻辑
static/img/            背景图、封面等
```

## 更新日志

见 [CHANGELOG.md](CHANGELOG.md)。
