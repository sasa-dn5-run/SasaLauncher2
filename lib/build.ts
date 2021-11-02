import fs from "fs-extra"
import path from "path"
import glob from "glob"
import sass from "sass"
import crypto from "crypto"
import replace from "replace-in-file"
import builder from "electron-builder"
import { execSync } from "child_process"

class Builder {

    private readonly version: string = <string>process.env.VERSION
    private readonly platform: string = process.argv[3] || process.platform

    public static Main() {
        const builder = new Builder()
        const arg1 = process.argv[2]
        switch (arg1) {
            case "compile": {
                builder.compile()
                break
            }
            case "build": {
                builder.build()
                break
            }
        }
    }
    public compile() {
        if(fs.existsSync('./dist')){
            fs.removeSync('./dist')
        }
        process.stdout.write("Compiling...\n")
        execSync(path.resolve("node_modules/.bin/tsc"))
        for (const v of glob.sync("./src/**/*")) {
            if (!v.endsWith(".scss")) continue
            const dest = v.replace(".scss", ".css").replace("src", "dist")
            if (!fs.existsSync(path.join(dest, ".."))) fs.mkdirsSync(path.join(dest, ".."))
            fs.writeFileSync(dest, sass.renderSync({ file: v }).css.toString())
        }

        process.stdout.write("Rewriting paths...\n")
        replace.replaceInFileSync({
            files: "./dist/app/**/*",
            from: /@assets/g,
            to: './assets',
        })
        replace.replaceInFileSync({
            files: "./dist/app/**/*",
            from: /@modules/g,
            to: '../../modules',
        })
        process.stdout.write("Copying files...\n")
        this.copyFiles("./src/**/*", "./dist", [".ts", ".scss"])
        fs.copyFileSync('./package.json','./dist/package.json')
    }
    public rewriteVersion() {
        process.stdout.write("Rewriting version...\n")
        const version = this.version
        const regex = /(?<=version = ").*(?=";)/
        const options = {
            files: "./package.json",
            from: regex,
            to: version
        }
        replace.replaceInFileSync(options)
    }
    public async build() {
        process.stdout.write("Building...\n")
        const config = {
            targets: [this.getCurrentPlatform()],
            config: {
                appId: 'CraftPanel',
                productName: 'CraftPanel',
                artifactName: '${productName}-setup.${ext}',
                copyright: 'Copyright © 2021 ddPn08',
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
                    maintainer: 'ddPn08',
                    vendor: 'ddPn08',
                    synopsis: 'マインクラフトサーバーを簡単に立てられるソフトウェア',
                    description: 'マイクラサーバーをいままでにないほど簡単に。数回のぽちっとでサーバーが立てられる。',
                    category: 'Game'
                },
                compression: 'maximum',
                files: [
                    './dist/**/*',
                    './node_modules/**/*'
                ],
                asar: true
            }
        }
        try {
            await builder.build(<builder.CliOptions>(<unknown>config))
        } catch (error) {
            throw error
        }
    }
    private getCurrentPlatform(): builder.Platform {
        switch (this.platform) {
            case "win32":
                return builder.Platform.WINDOWS
            case "darwin":
                return builder.Platform.MAC
            case "linux":
                return builder.Platform.LINUX
            default:
                throw new Error("Unsupported platform")
        }
    }
    private copyFiles(src: string, dest: string, exclude: string[]) {
        const files = glob.sync(src)
        const srcDir = src.replace("/**/*", "")
        let copied = 0
        for (const file of files) {
            const fileName = path.basename(file)
            if (exclude.includes(path.extname(file))) continue
            if (fs.lstatSync(file).isDirectory()) continue
            const destFile = path.resolve(file.replace(srcDir, dest))

            process.stdout.clearLine(0)
            process.stdout.cursorTo(0)
            process.stdout.write(`Copying ${files.indexOf(file)}/${files.length} :${fileName}...`)

            if (fs.existsSync(destFile)) {
                const destd5 = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')
                const srcd5 = crypto.createHash('md5').update(fs.readFileSync(destFile)).digest('hex')
                if (destd5 === srcd5) continue
            }
            if (!fs.existsSync(path.resolve(dest, fileName, ".."))) {
                fs.mkdirsSync(path.resolve(dest, fileName, ".."))
            }
            copied++
            process.stdout.clearLine(0)
            process.stdout.cursorTo(0)
            process.stdout.write(`Copying ${files.indexOf(file)}/${files.length} :${fileName}...`)
            fs.copySync(file, destFile)
        }
        process.stdout.write(`\nCopied ${copied} files.\n`)
    }
}
Builder.Main()