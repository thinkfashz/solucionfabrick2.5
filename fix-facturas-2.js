const fs = require('fs');

let content = fs.readFileSync('src/app/admin/facturas/page.tsx', 'utf-8');

const searchBlock = `    </main>
  );
}`;

const replaceBlock = `    </AdminBasePage>
  );
}`;

content = content.replace(searchBlock, replaceBlock);
fs.writeFileSync('src/app/admin/facturas/page.tsx', content, 'utf-8');
