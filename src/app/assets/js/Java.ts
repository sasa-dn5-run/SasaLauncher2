import { spawnSync } from "child_process";
import fs from 'fs-extra'
import path from 'path'
import https from 'https'
import http from 'http'
import unzip from 'unzipper'
import zlib from 'zlib'
import tar from 'tar'
import { EventEmitter } from "events";
class Java {
    public static readonly events = new EventEmitter()
    public static getVersion(javaPath: string): string {
        const java = spawnSync(javaPath, ['-version'])
        if (java.error) throw java.error

        const data = java.stderr.toString()
        const javaVersion = new RegExp('java version|openjdk version').test(data) ? data.split(/ |\n/)[2].replace(/"/g, '') : false

        if (javaVersion) return javaVersion
        else throw new JavaError('DetectJavaVersionException', 'J:001', 'Javaのバージョンを検出できませんでした。')
    }

    public static async getJava(version: string) {
        const DATA_PATH = await ipcRenderer.invoke('getDataPath')
        const ext = process.platform === 'win32' ? 'java.exe' : 'java'
        const javaDir = path.join(DATA_PATH, "java")
        if (!fs.existsSync(javaDir)) {
            await Java.installJava()
        }
        let javas = fs.readdirSync(javaDir).filter(f => f.match(/java|jdk|jre/))
        const javaVersion = version.match(/1.17|1.18|21w3|21w4/) ? "16" : undefined
        if(javas.length === 0){
            await Java.installJava()
            javas = fs.readdirSync(javaDir).filter(f => f.match(/java|jdk|jre/))
        }
        if (javaVersion) {
            const java = javas.find(j => j.includes(javaVersion))
            if (java) {
                return path.join(javaDir, java, 'bin', ext)
            } else {
                throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
            }
        }

        process.env.JAVA_HOME = javaDir
        process.env["PATH"] = `${javaDir}/bin:${process.env["PATH"]}`

        return path.join(javaDir, javas[0], 'bin', ext)
    }

    private static async installJava() {
        const DATA_PATH = await ipcRenderer.invoke('getDataPath')

        const javaDir = path.join(DATA_PATH, 'java')
        let url:string
        let ext: 'zip' |'tar.gz'
        switch (process.platform) {
            case 'win32':
                switch (process.arch) {
                    case 'x64':
                    case 'arm64':
                        url = 'https://download.java.net/java/GA/jdk16.0.1/7147401fd7354114ac51ef3e1328291f/9/GPL/openjdk-16.0.1_windows-x64_bin.zip'
                        ext = 'zip'
                        break
                    default:
                        throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
                }
                break
            case 'darwin':
                switch (process.arch) {
                    case 'x64':
                        url = 'https://download.java.net/java/GA/jdk16.0.1/7147401fd7354114ac51ef3e1328291f/9/GPL/openjdk-16.0.1_osx-x64_bin.tar.gz'
                        ext = 'tar.gz'
                        break
                    default:
                        throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
                }
                break
            case 'linux':
                switch (process.arch) {
                    case 'x64':
                        url = 'https://download.java.net/java/GA/jdk16.0.1/7147401fd7354114ac51ef3e1328291f/9/GPL/openjdk-16.0.1_linux-x64_bin.tar.gz'
                        ext = 'tar.gz'
                        break
                    case 'arm64':
                        url = 'https://download.java.net/java/GA/jdk16.0.1/7147401fd7354114ac51ef3e1328291f/9/GPL/openjdk-16.0.1_linux-aarch64_bin.tar.gz'
                        ext = 'tar.gz'
                    default:
                        throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
                }
                break
            default:
                throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
        }

        if(!fs.existsSync(javaDir)){
            fs.mkdirSync(javaDir)
        }

        const temp = path.join(DATA_PATH, 'java', `temp.${ext}`)

        //ダウンロード
        try {
            await (new Promise((resolve, reject) => {
                const file = fs.createWriteStream(temp)
                https.get(url, (res) => {
                    const length = parseInt(res.headers['content-length']!)
                    res.on('data', (chunk) => {
                        file.write(chunk)
                        Java.events.emit('download', {
                            type: "Java16",
                            total: length,
                            task: file.bytesWritten
                        })
                    })
                    res.on('end', () => {
                        file.end()
                        resolve()
                    })
                    res.on('error', (err) => {
                        fs.removeSync(temp)
                        reject(err)
                    })
                    file.on('finish', () => {
                        file.close()
                        resolve()
                    })
                    file.on('error', (err) => {
                        fs.removeSync(temp)
                        reject(err)
                    })
                }).on('error', (err) => {
                    console.log(err)
                })
            }) as Promise<void>)
        } catch (error) {
            throw error
        }

        //解凍
        await (new Promise((resolve, reject) => {
            const rs = fs.createReadStream(temp)
            if (ext === 'zip') {
                rs.pipe(unzip.Extract({ path: path.join(DATA_PATH, 'java') }))
                    .on('close', () => {
                        resolve()
                    })
                    .on('error', () => {
                        reject()
                    })
            } else {
                rs.pipe(zlib.createGunzip())
                    .pipe(tar.Extract({ path: path.join(DATA_PATH, 'java') }))
                    .on('close', () => {
                        resolve()
                    })
                    .on('error', () => {
                        reject()
                    })
            }
        }) as Promise<void>)

        fs.removeSync(temp)
    }
}

class JavaError extends Error {
    public code: string
    public raw: unknown
    constructor(name: string, code: string, message: string, raw?: unknown) {
        super(message)
        this.name = name
        this.code = code
        this.raw = raw
    }
}

function isEmpty(obj: string) {
    return !Object.keys(obj).length;
}


export { Java, JavaError }
