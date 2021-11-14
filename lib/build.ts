import fs from "fs-extra"
import path from "path"
import glob from "glob"
import sass from "sass"
import crypto from "crypto"
import replace from "replace-in-file"
import { build, CliOptions } from "electron-builder"
import { execSync } from "child_process"
const pkg = fs.readJSONSync(path.join(__dirname, "..", "package.json"))

class Builder {

    private readonly version: string = !!process.env.VERSION && (process.env.VERSION as string).split(".").length === 3 ? (process.env.VERSION as string) : "0.0.0"

    private readonly extraOptions: string[] = []

    public static Main() {
        const builder = new Builder()

        for(const v of process.argv){
            if(v.startsWith("--")){
                builder.extraOptions.push(v)
            }
        }

        const method = process.argv[2]
        switch (method) {
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
        if(this.extraOptions.includes('--clean') && fs.existsSync('./dist'))
            fs.removeSync('./dist')
        if (this.extraOptions.includes("--full")){
            this.rewriteVersion()
            execSync(`gpg --quiet --batch --yes --decrypt --passphrase=${process.env.GPGPASS} --output src/config.json secret.json.gpg`)
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
        process.stdout.write(`Rewriting version... ${this.version}\n`)
        const version = this.version
        const json = fs.readJSONSync('./package.json')
        json.version = version
        fs.writeJSONSync('./package.json', json, {spaces:4})
    }
    public async build() {
        if ((this.extraOptions.includes("--clean") || this.extraOptions.includes("--full")) && fs.existsSync('./product'))
            fs.removeSync('./product')
        
        this.compile()
        process.stdout.write("Building...\n")
        const config:CliOptions = {
            config: {
                appId: pkg.name,
                productName: pkg.name,
                artifactName: '${productName}-setup-${version}.${ext}',
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
                    maintainer: 'ddPn08',
                    vendor: 'ddPn08',
                    description: pkg.description,
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
            await build((<unknown>config) as CliOptions)
        } catch (error) {
            throw error
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

            // process.stdout.clearLine(0)
            // process.stdout.cursorTo(0)
            // process.stdout.write(`Copying ${files.indexOf(file)}/${files.length} :${fileName}...`)

            if (fs.existsSync(destFile)) {
                const destd5 = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')
                const srcd5 = crypto.createHash('md5').update(fs.readFileSync(destFile)).digest('hex')
                if (destd5 === srcd5) continue
            }
            if (!fs.existsSync(path.resolve(dest, fileName, ".."))) {
                fs.mkdirsSync(path.resolve(dest, fileName, ".."))
            }
            copied++
            // process.stdout.clearLine(0)
            // process.stdout.cursorTo(0)
            // process.stdout.write(`Copying ${files.indexOf(file)}/${files.length} :${fileName}...`)
            fs.copySync(file, destFile)
        }
        process.stdout.write(`\nCopied ${copied} files.\n`)
    }
}
Builder.Main()