import { Client } from "minecraft-launcher-core"
import { Java } from "./Java"
import { ServerOption } from "./model/Distribution"
import path from "path"
import fs from "fs-extra"
import unzip from 'unzipper'
import http from "http"
import https from "https"

export class SasaClient extends Client {

    public getOption(): any {
        return this.option.option
    }
    public getServerOption(): ServerOption {
        return this.option
    }
    private option: ServerOption

    constructor(option: ServerOption) {
        super()
        this.option = option

        this.on("progress",(progress)=>{
            this.emit("task", {
                name: `Downloading ${progress.type}`,
                task: progress.task,
                total: progress.total,
            })
        })
        Java.events.on('download',(progress)=>{
            this.emit('task', {
                name: 'Installing Java',
                task: progress.task,
                total: progress.total,
            })
        })
    }

    public async launchS(){
        try {
            this.option.option.javaPath = await Java.getJava()
            if(this.option.forgeLib){
                await this.extractForge()
            }
            this.launch(this.option.option)
        } catch (error) {
            this.emit('error',error)
        }
    }
    private async extractForge(){
        if(!this.option.forgeLib) return

        const DATA_PATH = await ipcRenderer.invoke('getDataPath')
        const url = this.option.forgeLib
        const MCLIBDIR = path.join(DATA_PATH, '.minecraft')
        const temp = path.join(MCLIBDIR, 'forgeLibCache', path.basename(url))
        const client = url.startsWith('https') ? https : http

        if(!fs.existsSync(path.dirname(temp))) fs.mkdirpSync(path.dirname(temp))
        if(fs.existsSync(temp)) return
        
        try {
            await new Promise<void>((resolve, reject) => {
                client.get(url, (res) => {
                    const ws = fs.createWriteStream(temp)
                    const total = res.headers['content-length']
                    res.on('data', (chunk) => {
                        this.emit('task', {
                            name: 'Extracting Forge Lib',
                            task: chunk.length,
                            total: total,
                        })
                        ws.write(chunk)
                    })
                    res.on('error', (err) => {
                        reject(err)
                    })
                    res.on('end',()=>{
                        ws.end()
                        resolve()
                    })

                    ws.on('error',(err)=>{
                        reject(err)
                    })
                })
            })

            await new Promise<void>((resolve, reject)=>{
                fs.createReadStream(temp)
                    .pipe(unzip.Extract({ path: path.join(MCLIBDIR, 'libraries') }))
                .on('error',(err)=>{
                    reject(err)
                })
                .on('close',()=>{
                    resolve()
                })
            })
        } catch (error) {
            throw error
        }
    }

}