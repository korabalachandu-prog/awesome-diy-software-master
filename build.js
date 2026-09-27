const fs = require('fs');
const path = require('path');

function findReadmePath() {
  const paths = [
    path.join(__dirname, 'awesome-diy-software-master', 'README.md'),
    path.join(__dirname, 'README.md')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('README.md not found');
}

function findTmplPath() {
  const paths = [
    path.join(__dirname, 'awesome-diy-software-master', 'web', 'page.tmpl'),
    path.join(__dirname, 'web', 'page.tmpl')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('page.tmpl not found');
}

function parseMarkdown(md) {
  let title = 'Awesome DIY Software';
  
  // Extract frontmatter title if present
  const fmMatch = md.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*(.*)/i);
    if (titleMatch) title = titleMatch[1].trim();
    md = md.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/, '').trim();
  }

  // Basic HTML converter
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

  if (inList) {
    html += '</ul>\n';
  }

  return { title, body: html };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInline(str) {
  // Replace links [text](url)
  return str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function build() {
  const readmePath = findReadmePath();
  const tmplPath = findTmplPath();
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');

  const { title, body } = parseMarkdown(readmeContent);

  // Replace Go template variables {{.Doc.title}} and {{.Doc.body}}
  const rendered = tmplContent
    .replace(/\{\{\.Doc\.title\}\}/g, title)
    .replace(/\{\{\.Doc\.body\}\}/g, body);

  const outDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, rendered, 'utf-8');
  console.log(`[Build Success] Compiled ${readmePath} using ${tmplPath} to ${outPath}`);
}

build();
