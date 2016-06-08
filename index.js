#! /usr/bin/env node
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var execAsync = Promise.promisify(require('child_process').exec);
var argv = process.argv.slice(2);
var path = require('path');

if (['save', 'load', 'remove'].indexOf(argv[0]) > -1 && argv[1]) {
  var dirName = argv[2] ? path.resolve(argv[2]) : '.';
  console.log(dirName);
  var lintModules;
  var eslintrcConfig;
  var savedConfigs;

  if (argv[0] === 'save') {
    fs.readdirAsync(path.join(dirName, 'node_modules'))
      // find eslint modules in project
      .then(function(stats) {
        lintModules = stats.filter(function(d) {
          return /eslint/.test(d);
        });
        return fs.readFileAsync(path.join(__dirname, '/configs.json'));
      })
      // read stored configs file
      .then(function(file) {
        savedConfigs = JSON.parse(file);
        return fs.readdirAsync(path.resolve(dirName));
      })
      // find .eslintrc file
      .then(function(files) {
        var eslintrcFile = files.find(function(file) {
          return /\.eslintrc/.test(file);
        });
        return fs.readFileAsync(path.join(dirName, eslintrcFile));
      })
      // read project .eslintrc* and write to configs file
      .then(function(file) {
        eslintrcConfig = JSON.parse(file);
        savedConfigs[argv[1]] = {
          'eslintrc': eslintrcConfig,
          'modules': lintModules
        };
        return fs.writeFileAsync(path.join(__dirname, '/configs.json'), JSON.stringify(savedConfigs, null, 2));
      })
      .then(function(err) {
        if (err) throw err;
        console.log('saved ' + argv[1] + ' conf');
      });
  }

  if (argv[0] === 'load') {
    fs.readFileAsync(path.join(__dirname, '/configs.json'))
      .then(function(file) {
        savedConfigs = JSON.parse(file);
        if (savedConfigs[argv[1]]) {
          return execAsync('npm -C '+ dirName + ' i -D ' + savedConfigs[argv[1]].modules.join(' '));
        }
        return Promise.reject('Config not found');
      })
      .then(function(stdout) {
        console.log(stdout);
        var stringOfJSON = JSON.stringify(savedConfigs[argv[1]].eslintrc, null, 2);
        return fs.writeFileAsync(path.join(dirName, '.eslintrc.json'), stringOfJSON);
      })
      .then(function(err) {
        if (err) throw err;
        console.log('loaded ' + argv[1] + ' config');
      });
  }

  if (argv[0] === 'remove') {
    fs.readFileAsync(path.join(__dirname, '/configs.json'))
      .then(function(file) {
        savedConfigs = JSON.parse(file);
        if (savedConfigs[argv[1]]) {
          return execAsync('npm -C '+ dirName + ' i -D ' + savedConfigs[argv[1]].modules.join(' '));
        }
        return Promise.reject('Config not found');
      })
      .then(function(stdout) {
        console.log(stdout);
        return fs.writeFileAsync(path.join(dirName, '.eslintrc.json'), '{}');
      })
      .then(function(err) {
        if (err) throw err;
        console.log('loaded ' + argv[1] + ' config');
      });
  }
} else {
  console.log('Format: $ eslint-confg save/load/remove nameOfConfig [dirOfProject]');
}
