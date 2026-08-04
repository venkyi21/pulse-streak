'use strict';
// Opens the admin dashboard in the default browser, cross-platform.
const path = require('node:path');
const { spawn } = require('node:child_process');

const file = path.resolve(__dirname, '..', 'admin', 'distribution-dashboard.html');
const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', file]]
  : process.platform === 'darwin' ? ['open', [file]]
    : ['xdg-open', [file]];

spawn(opener[0], opener[1], { detached: true, stdio: 'ignore' }).unref();
console.log(`opened ${file}`);
