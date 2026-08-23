const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

console.log('\x1b[36m%s\x1b[0m', '==============================================');
console.log('\x1b[36m%s\x1b[0m', ' 🚀 Starting CEFI Ecommerce (Full Stack)...  ');
console.log('\x1b[36m%s\x1b[0m', '==============================================\n');

// Ensure system PATH has basic paths
const env = {
  ...process.env,
  PATH: `${process.env.PATH};C:\\Windows\\System32;C:\\Windows`
};

function pipeOutput(child, name, colorCode) {
  const rlOut = readline.createInterface({ input: child.stdout });
  rlOut.on('line', (line) => {
    console.log(`\x1b[${colorCode}m[${name}]\x1b[0m ${line}`);
  });

  const rlErr = readline.createInterface({ input: child.stderr });
  rlErr.on('line', (line) => {
    console.error(`\x1b[${colorCode}m[${name}]\x1b[0m ${line}`);
  });
}

// 1. Start Backend (Express server)
const backendDir = path.join(__dirname, 'backend');
const backend = spawn(process.execPath, ['server.js'], {
  cwd: backendDir,
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});
pipeOutput(backend, 'BACKEND', '34'); // Blue

// 2. Start Frontend (Vite dev server)
const viteBin = path.join(__dirname, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js');
const frontendDir = path.join(__dirname, 'frontend');
const frontend = spawn(process.execPath, [viteBin], {
  cwd: frontendDir,
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});
pipeOutput(frontend, 'FRONTEND', '35'); // Magenta

const cleanup = () => {
  console.log('\n\x1b[33m🛑 Stopping all servers...\x1b[0m');
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
