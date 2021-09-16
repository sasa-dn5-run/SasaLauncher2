const { remote, shell, ipcRenderer } = require('electron')
const { app, dialog }                = remote
const sleep                          = (v:number) => new Promise(resolve => setTimeout(resolve, v))
const fs                             = require('fs-extra')
const path                           = require('path')