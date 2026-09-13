const MAX_FILES = 60;
const MAX_FILE_SIZE = 1024 * 1024;

const SKIP_DIRS = /(^|\/)(node_modules|\.git|dist|build|vendor|coverage|__pycache__)(\/|$)/i;
const SKIP_FILES = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|pdf|zip|tar|gz|mp4|mp3|exe|dll|so|dylib|class|jar|pyc)$/i;
const SKIP_LOCK = /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock)$/i;

function parseGitHubUrl(input) {
  const url = new URL(input);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error('无法识别 GitHub 地址');
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');
  const mode = parts[2];
  const branch = parts[3];
  const path = parts.slice(4).join('/');
  return {
    owner,
    repo,
    branch,
    path,
    isBlob: mode === 'blob'
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'code-mentor-web' }
  });
  if (!response.ok) throw new Error(`GitHub 请求失败：${response.status}`);
  return response.json();
}

async function fetchRaw(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'code-mentor-web' }
  });
  if (!response.ok) throw new Error(`GitHub 文件请求失败：${response.status}`);
  const text = await response.text();
  if (text.length > MAX_FILE_SIZE) throw new Error('单个文件超过 1MB，已跳过');
  return text;
}

async function fetchGitHubProject(inputUrl) {
  const parsed = parseGitHubUrl(inputUrl);
  const repoInfo = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
  const branch = parsed.branch || repoInfo.default_branch;

  if (parsed.isBlob) {
    const content = await fetchRaw(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${parsed.path}`);
    return {
      single: {
        name: parsed.path.split('/').pop(),
        content
      }
    };
  }

  const treeData = await fetchJson(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`
  );
  const entries = (treeData.tree || [])
    .filter((entry) => entry.type === 'blob')
    .filter((entry) => entry.path && !SKIP_DIRS.test(entry.path))
    .filter((entry) => entry.path && !SKIP_FILES.test(entry.path))
    .filter((entry) => entry.path && !SKIP_LOCK.test(entry.path.split('/').pop()))
    .filter((entry) => !entry.size || entry.size <= MAX_FILE_SIZE)
    .slice(0, MAX_FILES);

  const files = [];
  for (const entry of entries) {
    try {
      const content = await fetchRaw(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${entry.path}`);
      files.push({ path: entry.path, content });
    } catch (error) {
      // 跳过无法读取或超限的文件
    }
  }

  if (files.length === 0) throw new Error('没有找到可分析的文本文件');
  return {
    files,
    name: `${parsed.owner}/${parsed.repo}`
  };
}

module.exports = { fetchGitHubProject };
