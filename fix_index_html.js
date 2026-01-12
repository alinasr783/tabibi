const fs = require('fs');
const path = require('path');

const content = `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tabibi App Builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

const filePath = 'c:/Users/hp/Desktop/Dev/tabibi-app_builder/index.html';

try {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully wrote to ' + filePath);
} catch (err) {
  console.error('Error writing file:', err);
}
