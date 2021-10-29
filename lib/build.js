const { execSync }                         = require('child_process')
const fs                                   = require('fs-extra')
const path                                 = require("path")
const glob                                 = require('glob')
const copyfiles                            = require("copyfiles")
const replace                              = require("replace-in-file")
const builder                              = require('electron-builder')
const Platform                             = builder.Platform
const sass                                 = require('sass')

const package                              = require("../package.json")

const _dirname                             = path.join(__dirname,"..")

const packege                              = require("../package.json")

async function main(){
    await compile()
    updateVersion()
    if (!fs.existsSync('src/config.json'))
        throw new Error("config file not exists")
    if (process.argv[2] !== null && process.argv[2] === "compile" )
        return
    await buildClient()
}

const updateVersion = ()=>{
    if(!process.env.VERSION) return
    const package = fs.readJSONSync(path.join('./dist/package.json'))
    package.version = process.env.VERSION
    fs.writeJSONSync(path.join('./dist/package.json'), package, { spaces: 4 })
    fs.writeJSONSync(path.join('./package.json'), package, { spaces: 4 })
}

const compile = async()=>{
    fs.removeSync('./dist')
    //copy some files
    fs.copySync(path.join(_dirname, "package.json"), path.join(_dirname, "dist/package.json"))
    
    for(const v of glob.sync(path.join(_dirname,'src/**/*'))){
        if(v.endsWith('.scss')){
            const result = sass.renderSync({file:v})
            fs.mkdirsSync(path.join(v.replace('src', 'dist'), '..'))
            fs.writeFileSync(v.replace('src', 'dist').replace('scss', 'css'),result.css)
        }
    }
    
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

const buildClient = ()=>{
    return new Promise((resolve,reject)=>{
        const config = {
            targets: (process.argv[2] != null && Platform[process.argv[2]] != null ? Platform[process.argv[2]] : getCurrentPlatform()).createTarget(),
            config: {
                appId: package.name,
                productName: package.name,
                artifactName: `\${productName}-setup-${process.env.VERSION}.\${ext}`,
                copyright: 'Copyright © 2021 ddPn08',
                directories: {
                    buildResources: './build',
                    output: './product'
                },
                extraMetadata: {
                    main: "./dist/app.js"
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
                    maintainer: package.author,
                    vendor: package.author,
                    description: package.description,
                    category: 'game'
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

const getCurrentPlatform = () => {
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
