const fs = require('fs');
const path = require('path');

function findReadmePath() {
  const paths = [
    path.join(__dirname, 'README.md'),
    path.join(__dirname, 'awesome-diy-software-master', 'README.md')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('README.md not found');
}

function findTmplPath() {
  const paths = [
    path.join(__dirname, 'web', 'page.tmpl'),
    path.join(__dirname, 'awesome-diy-software-master', 'web', 'page.tmpl')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('page.tmpl not found');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseMarkdownToClassic(md) {
  let title = 'Awesome DIY Software';
  
  const fmMatch = md.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*(.*)/i);
    if (titleMatch) title = titleMatch[1].trim();
    md = md.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/, '').trim();
  }

  const lines = md.split(/\r?\n/);
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h1>${escapeHtml(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      const heading = line.slice(3);
      const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      html += `<h2 id="${id}">${escapeHtml(heading)}</h2>\n`;
    } else if (line.startsWith('### ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h3>${escapeHtml(line.slice(4))}</h3>\n`;
    } else if (line === '<hr/>' || line === '---' || line === '***') {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += '<hr />\n';
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      const itemContent = line.replace(/^[-*]\s+/, '');
      html += `  <li>${formatInline(itemContent)}</li>\n`;
    } else {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      html += `<p>${formatInline(line)}</p>\n`;
    }
  }

  if (inList) html += '</ul>\n';
  return { title, body: html };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInline(str) {
  return str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function parseReadmeStructured(readmeContent) {
  let title = 'Awesome DIY Software';

  const fmMatch = readmeContent.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  let bodyContent = readmeContent;
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*(.*)/i);
    if (titleMatch) title = titleMatch[1].trim();
    bodyContent = readmeContent.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/, '').trim();
  }

  const lines = bodyContent.split(/\r?\n/);
  const categories = [];
  let currentCategory = null;
  let introLines = [];
  let totalProjects = 0;

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

      if (currentCategory) currentCategory.items.push(itemObj);
      totalProjects++;
    } else if (!currentCategory && line && !line.startsWith('#') && line !== '<hr/>') {
      introLines.push(line);
    } else if (currentCategory && currentCategory.items.length === 0 && line && !line.startsWith('#') && line !== '<hr/>') {
      currentCategory.description = line;
    }
  }

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

function build() {
  const readmePath = findReadmePath();
  const tmplPath = findTmplPath();
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');

  const outDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Generate classic template output
  const { title, body } = parseMarkdownToClassic(readmeContent);
  const classicRendered = tmplContent
    .replace(/\{\{\.Doc\.title\}\}/g, title)
    .replace(/\{\{\.Doc\.body\}\}/g, body);
  fs.writeFileSync(path.join(outDir, 'classic.html'), classicRendered, 'utf-8');

  // 2. Generate structured data.json for 100% static hosting compatibility
  const structuredData = parseReadmeStructured(readmeContent);
  fs.writeFileSync(path.join(outDir, 'data.json'), JSON.stringify(structuredData, null, 2), 'utf-8');

  // 3. Copy public assets (index.html, style.css, app.js) to dist
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    for (const f of files) {
      fs.copyFileSync(path.join(publicDir, f), path.join(outDir, f));
    }
  }

  // 4. Copy raw files for static inspector
  fs.copyFileSync(readmePath, path.join(outDir, 'README.md'));
  fs.copyFileSync(tmplPath, path.join(outDir, 'page.tmpl'));

  console.log(`[Build Success] Built complete static distribution in ${outDir}`);
  console.log(` - dist/index.html (Modern Interactive App)`);
  console.log(` - dist/classic.html (Go Template Render)`);
  console.log(` - dist/data.json (${structuredData.stats.totalProjects} projects)`);
  console.log(` - dist/style.css, dist/app.js`);
}

build();
