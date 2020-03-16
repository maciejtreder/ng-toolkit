#! /usr/bin/env node
const cp = require('child_process'),
  exec = cp.exec;
const path = require('path');
const project = process.env.npm_config_project || 'application';
console.log(project);

(() => {
  console.log(process.cwd());
  exec(`ng run ${project}:server && webpack --config webpack.server.config.js --progress --colors`, {maxBuffer: 1024 * 2000},  async (err, stdout, stderr) => {
    console.log(`${project}` || 'default')
    console.log(stdout, err, stderr);
    if(!err) {
      console.log('Server built successfully.');
    } else {
      console.log('Build failed');
    }
  })    
})();