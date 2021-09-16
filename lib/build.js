const { execSync }                         = require('child_process')
const fs                                   = require('fs-extra')
const path                                 = require("path")
const copyfiles                            = require("copyfiles")
const replace                              = require("replace-in-file")
const builder                              = require('electron-builder')
const Platform                             = builder.Platform

const package                              = require("../package.json")

const _dirname                             = path.join(__dirname,"..")

const packege                              = require("../package.json")

async function main(){
    await compile()
    if (process.argv[2] !== null && process.argv[2] === "compile" )
        return
    if (process.argv[2] !== null && process.argv[2] === "client" || process.argv.length < 3) {
        await buildClient()
    }
    if (process.argv.length > 2 && process.argv[2].match(/WINDOWS|MAC|LINUX/)){
        await buildClient()
    }
}

async function compile(){
    fs.copySync(path.join(_dirname, "package.json"),path.join(_dirname,"dist/package.json"))

    const tsc = await execSync(path.resolve("node_modules/.bin/tsc"))
    console.log(tsc.toString())
    replace.sync({
        files: "./dist/app/**/*",
        from: /@assets/g,
        to: './assets',
    })
    copyfiles(["src/**/*","dist"],{
        exclude:"src/**/*.ts",
        up:1
    },(err)=>{
        if(err) console.log(err)
    })
}

function buildClient(){
    return new Promise((resolve,reject)=>{
        const config = {
            targets: (process.argv[2] != null && Platform[process.argv[2]] != null ? Platform[process.argv[2]] : getCurrentPlatform()).createTarget(),
            config: {
                appId: package.name,
                productName: package.name,
                artifactName: '${productName}-setup.${ext}',
                copyright: '',
                directories: {
                    buildResources: './build',
                    output: './product'
                },
                extraMetadata: {
                    main: "./dist/index.js"
                },
                win: {
                    target: [
                        {
                            target: 'nsis',
                            arch: 'x64'
                        }
                    ]
                },
                nsis: {
                    oneClick: false,
                    perMachine: false,
                    allowElevation: true,
                    allowToChangeInstallationDirectory: true
                },
                mac: {
                    target: 'dmg',
                    category: 'public.app-category.games'
                },
                linux: {
                    target: 'AppImage',
                    maintainer: '',
                    vendor: '',
                    synopsis: '',
                    description: '',
                    category: ''
                },
                compression: 'maximum',
                files: [
                    './dist/**/*',
                    './node_modules/**/*'
                ],
                extraResources: [
                    'libraries'
                ],
                asar: true
            }
        }
        builder.build(config)
        .then(() => {
            resolve()
        }).catch((err) => {
            reject(err)
        })
    })
}

function getCurrentPlatform() {
    switch (process.platform) {
        case 'win32':
            return Platform.WINDOWS
        case 'darwin':
            return Platform.MAC
        case 'linux':
            return Platform.linux
        default:
            console.error('Cannot resolve current platform!')
            return undefined
    }
}

main()
