import { spawnSync } from "child_process";
import fs from 'fs-extra'
import path from 'path'
import https from 'https'
import unzip from 'unzipper'
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

    public static async getJava() {
        const DATA_PATH = await ipcRenderer.invoke('getDataPath')
        const ext = process.platform === 'win32' ? 'java.exe' : 'java'
        const javaDir = path.join(DATA_PATH, "java")
        if (!fs.existsSync(javaDir)) {
            try {
                await Java.installJava()
            } catch (error) {
                throw error
            }
        }
        let javas = fs.readdirSync(javaDir).filter(f => f.match(/java|jdk|jre/))
        let java = javas.find(f => f.match(new RegExp('jdk-17')))
        if(javas.length === 0){
            try {
                await Java.installJava()
            } catch (error) {
                throw error
            }
            javas = fs.readdirSync(javaDir).filter(f => f.match(/java|jdk|jre/))
        }
        if (!java){
            try {
                await Java.installJava()
            } catch (error) {
                throw error
            }
            javas = fs.readdirSync(javaDir).filter(f => f.match(/java|jdk|jre/))
        }
        java = javas.find(f => f.match(new RegExp('jdk-17')))
        if(!java){
            throw new JavaError('JavaNotFoundException', 'J:002', 'Javaが見つかりませんでした。')
        }
        return this.getJavaBin(path.join(javaDir, java))
    }

    private static getJavaBin(dir: string){
        return process.platform === 'darwin' ? path.join(dir, 'Contents', 'Home', 'bin', 'java') : path.join(dir, 'bin', 'java')
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
                        url = 'https://download.java.net/java/GA/jdk17.0.1/2a2082e5a09d4267845be086888add4f/12/GPL/openjdk-17.0.1_windows-x64_bin.zip'
                        ext = 'zip'
                        break
                    default:
                        throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
                }
                break
            case 'darwin':
                switch (process.arch) {
                    case 'x64':
                        url = 'https://download.java.net/java/GA/jdk17.0.1/2a2082e5a09d4267845be086888add4f/12/GPL/openjdk-17.0.1_macos-x64_bin.tar.gz'
                        ext = 'tar.gz'
                        break
                    default:
                        throw new JavaError('InstallJavaException', 'J:002', 'Javaのインストールに失敗しました。')
                }
                break
            case 'linux':
                switch (process.arch) {
                    case 'x64':
                        url = 'https://download.java.net/java/GA/jdk17.0.1/2a2082e5a09d4267845be086888add4f/12/GPL/openjdk-17.0.1_linux-x64_bin.tar.gz'
                        ext = 'tar.gz'
                        break
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

        try {
            //ダウンロード
            await (new Promise((resolve, reject) => {
                const file = fs.createWriteStream(temp)
                https.get(url, (res) => {
                    const length = parseInt(res.headers['content-length']!)
                    res.on('data', (chunk) => {
                        file.write(chunk)
                        Java.events.emit('download', {
                            type: "Java17",
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

            //解凍
            console.log(path.join(DATA_PATH, 'java') )
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
                    rs.pipe(tar.x({ cwd: path.join(DATA_PATH, 'java') }))
                        .on('close', () => {
                            resolve()
                        })
                        .on('error', () => {
                            reject()
                        })
                }
            }) as Promise<void>)
        } catch (error) {
            console.log(error)
            throw error
        }


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
