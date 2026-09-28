const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function findReadmePath() {
  const paths = [
    path.join(__dirname, 'README.md'),
    path.join(__dirname, 'awesome-diy-software-master', 'README.md')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

function findTmplPath() {
  const paths = [
    path.join(__dirname, 'web', 'page.tmpl'),
    path.join(__dirname, 'awesome-diy-software-master', 'web', 'page.tmpl')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseReadmeStructured() {
  const readmePath = findReadmePath();
  if (!fs.existsSync(readmePath)) {
    return { title: 'Awesome DIY Software', categories: [], stats: { totalProjects: 0, categoriesCount: 0, technologiesCount: 0, languages: [] } };
  }

  const content = fs.readFileSync(readmePath, 'utf-8');
  let title = 'Awesome DIY Software';

  // Frontmatter
  const fmMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  let bodyContent = content;
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*(.*)/i);
    if (titleMatch) title = titleMatch[1].trim();
    bodyContent = content.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/, '').trim();
  }

  const lines = bodyContent.split(/\r?\n/);
  const categories = [];
  let currentCategory = null;
  let introLines = [];
  let totalProjects = 0;

  // Domain icon map
  const iconMap = {
    'compilers': '⚙️',
    'cryptocurrency': '🪙',
    'game development': '🎮',
    'interpreters: lisp based': '🧠',
    'image processing and computer vision': '👁️',
    'interpreters: other (non - lisp)': '🔮',
    'java virtual machine': '☕',
    'laravel': '🔴',
    'operating systems': '💻',
    'regular expressions': '🔍',
    'retracers and 3d rendering': '✨',
    'software renderer': '🎨',
    'storage and databases': '💾',
    'text editor': '📝',
    'version control': '🌿',
    'web apps: usage': '🌐',
    'web frameworks: internals': '⚡',
    'web programming': '🚀',
    'unsorted': '📦',
    'other similar lists': '📚'
  };

  // Tech stack detection keywords
  const techKeywords = [
    'Haskell', 'Go', 'Python', 'Rust', 'C++', 'C#', 'Java', 'JavaScript',
    'React', 'Redux', 'Angular', 'Laravel', 'PHP', 'Lua', 'LÖVE', 'Redis',
    'TDD', 'Expo', 'Unity', 'Linux', 'POSIX', 'C'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('## ')) {
      const catName = line.slice(3).trim();
      const catKey = catName.toLowerCase();
      currentCategory = {
        name: catName,
        id: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        icon: iconMap[catKey] || '🛠️',
        description: '',
        items: []
      };
      categories.push(currentCategory);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.replace(/^[-*]\s+/, '');
      const linkMatch = itemText.match(/\[([^\]]+)\]\(([^)]+)\)(.*)/);

      let itemTitle = itemText;
      let itemUrl = '#';
      let itemDesc = '';

      if (linkMatch) {
        itemTitle = linkMatch[1].trim();
        itemUrl = linkMatch[2].trim();
        itemDesc = linkMatch[3] ? linkMatch[3].trim().replace(/^[-–—:\s]+/, '') : '';
      }

      // Detect tech stacks
      const combined = `${itemTitle} ${itemDesc}`;
      const tags = [];
      for (const kw of techKeywords) {
        let isMatch = false;
        if (kw === 'C++' || kw === 'C#') {
          isMatch = combined.toLowerCase().includes(kw.toLowerCase());
        } else if (kw === 'C') {
          isMatch = /\bC\b/.test(combined) && !tags.includes('C++') && !tags.includes('C#');
        } else {
          const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
          isMatch = regex.test(combined);
        }

        if (isMatch && !tags.includes(kw)) {
          tags.push(kw);
        }
      }

      // Infer difficulty / estimated time
      let difficulty = 'Intermediate';
      const lower = combined.toLowerCase();
      if (lower.includes('tiny') || lower.includes('simple') || lower.includes('baby') || lower.includes('basic') || lower.includes('5 minutes') || lower.includes('starter')) {
        difficulty = 'Beginner';
      } else if (lower.includes('compiler') || lower.includes('microprocessor') || lower.includes('operating system') || lower.includes('from scratch') || lower.includes('database') || lower.includes('virtual machine')) {
        difficulty = 'Advanced';
      }

      const itemObj = {
        id: `item-${totalProjects + 1}`,
        title: itemTitle,
        url: itemUrl,
        description: itemDesc,
        tags: tags,
        difficulty: difficulty,
        category: currentCategory ? currentCategory.name : 'General'
      };

      if (currentCategory) {
        currentCategory.items.push(itemObj);
      }
      totalProjects++;
    } else if (!currentCategory && line && !line.startsWith('#') && line !== '<hr/>') {
      introLines.push(line);
    } else if (currentCategory && currentCategory.items.length === 0 && line && !line.startsWith('#') && line !== '<hr/>') {
      currentCategory.description = line;
    }
  }

  // Count unique languages/tags
  const allTags = new Set();
  categories.forEach(cat => {
    cat.items.forEach(it => {
      it.tags.forEach(t => allTags.add(t));
    });
  });

  return {
    title,
    intro: introLines.join(' '),
    categories,
    stats: {
      totalProjects,
      categoriesCount: categories.length,
      technologiesCount: allTags.size,
      languages: Array.from(allTags)
    }
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = reqUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname === '/api/data') {
    try {
      const data = parseReadmeStructured();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === '/api/raw') {
    try {
      const readmePath = findReadmePath();
      const tmplPath = findTmplPath();
      const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '';
      const tmpl = fs.existsSync(tmplPath) ? fs.readFileSync(tmplPath, 'utf-8') : '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ readme, tmpl }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === '/api/add-project' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { title, url: projectUrl, category, description } = payload;
        if (!title || !projectUrl || !category) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Title, URL, and Category are required' }));
          return;
        }

        const readmePath = findReadmePath();
        let content = fs.readFileSync(readmePath, 'utf-8');

        // Formatted new item
        const newItem = `-   [${title}](${projectUrl})${description ? ' ' + description : ''}\n`;

        // Check if category header exists
        const catHeaderRegex = new RegExp(`(##\\s+${escapeRegex(category)}[\\s\\S]*?)(?=##|$)`, 'i');
        const match = content.match(catHeaderRegex);

        if (match) {
          // Append to category
          const updatedCatSection = match[1].trimEnd() + '\n' + newItem;
          content = content.replace(match[1], () => updatedCatSection + '\n');
        } else {
          // Create new category at the bottom
          content += `\n## ${category}\n\n${newItem}`;
        }

        fs.writeFileSync(readmePath, content, 'utf-8');

        // Also update the build dist
        try {
          const { execSync } = require('child_process');
          execSync('node build.js', { cwd: __dirname });
        } catch (e) {
          console.error('Auto build error:', e);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Project added successfully!' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  if (pathname === '/') pathname = '/index.html';

  const publicDir = path.join(__dirname, 'public');
  const distDir = path.join(__dirname, 'dist');
  let filePath = path.join(publicDir, pathname);

  // If requested file is not in public, check dist
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, pathname);
  }

  // Prevent path traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(publicDir) && !normalizedPath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Awesome DIY Software Server is running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`📁 Target README: ${findReadmePath()}`);
  console.log(`=======================================================`);
});
