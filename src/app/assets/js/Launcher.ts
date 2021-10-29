import axios from "axios"
import { Client } from "minecraft-launcher-core"
import path from "path"
import fs from "fs-extra"
import crypto from "crypto"

import { Account } from "./model/account"
import { Distribution, File, Mod, ServerOption } from "./model/Distribution"
import { Auth } from "./Auth"
import { ConfigurationManager } from "./ConfigurationManager"
import { Java, JavaError } from "./Java"

let datapath:string
let distroLink:string

(async()=>{
    datapath = await ipcRenderer.invoke('getDataPath')
    distroLink = await ipcRenderer.invoke('getDistroLink')
})()

class Launcher{

    /**
     * @param uuid Minecraft アカウントのUUID
     * @param id 起動構成のID
     * @param disableModList 無効にするModのリスト
     * @returns クライアントインスタンス
     */
    public launch(uuid:string,id:string,disableModList:Array<string>):Promise<SasaClient>{
        return new Promise(async(resolve,reject)=>{
            const config = ConfigurationManager.getConfig()

            const accounts:Account[] = await ipcRenderer.invoke('getAccounts')
            const account = accounts.filter(v=>v.uuid === uuid)[0]
            if(typeof account === 'undefined')
                reject(new LauncherError('AccountNotFoundException','A:011','アカウントが見つかりません。'))
            
            const distro: Distribution = await ipcRenderer.invoke('getDistribution')
            const option: ServerOption = distro.servers.filter(v=>v.id === id)[0]

            if(typeof option === 'undefined')
                reject(new LauncherError('LaunchConfigurationNotFoundException','L:001','起動構成が見つかりません。'))
            
            const IOption: any = option.option

            await this.saveFiles(option.files)
            await this.saveMods(option.mods)
            this.disableMods(disableModList,id)


            if(account.type === "microsoft"){
                IOption.authorization = Auth.refreshMicrosoftAuth(<string>account.refreshToken)
            } else if(account.type === "mojang"){
                IOption.authorization = Auth.refreshMojangAuth(<string>account.refreshToken)
            }

            let java:string = 'java'
            try {
                java = Java.getJava(option.option.version.number)
            } catch (error) {
                const Jerror = <JavaError>error
                reject(new LauncherError(Jerror.name,Jerror.code,Jerror.message))
                return
            }

            IOption.javaPath = java

            if (!option.option.root || Object.keys(option.option.root).length === 0) IOption.root = path.join(datapath, '.minecraft')
            else IOption.root = this.pathResolve(option.option.root)

            IOption.overrides.gameDirectory = path.join(config.MinecraftDataFolder, 'servers', option.id)
            IOption.memory.max = config.Xmx
            IOption.memory.min = config.Xms

            if(option.option.forge) IOption.forge = this.pathResolve(option.option.forge)

            option.option = IOption
            console.log(IOption)

            const client = new SasaClient(option)
            client.launch(IOption)
            resolve(client)
        })
    }

    private disableMods(disableModList:Array<string>,id:string){
        const config = ConfigurationManager.getConfig()

        const gameDir = path.join(config.MinecraftDataFolder, 'servers', id)
        const modDir = path.join(gameDir, 'mods')
        if(!fs.existsSync(modDir))
            return
        for (const v of fs.readdirSync(modDir)){
            if(disableModList.includes(v)){
                if(v.endsWith('.disabled'))
                    continue
                fs.renameSync(path.join(modDir, v), path.join(modDir, v + '.disabled'))
            } else {
                if (disableModList.filter(v2=>v.startsWith(v2)).length < 1 && v.endsWith('.disabled'))
                    fs.renameSync(path.join(modDir, v), path.join(modDir, v.replace('.disabled', '')))
            }
        }
    }

    private async saveFiles(files:File[]){
        for (const v of files) {
            const filePath = this.pathResolve(v.path)
            const fileDir = path.join(this.pathResolve(v.path), '..')
            if (fs.existsSync(filePath)) {
                const md5hash = crypto.createHash("md5")
                md5hash.update(fs.readFileSync(filePath))
                if (md5hash.digest('hex') === v.md5)
                    continue;
            }

            if (!fs.existsSync(fileDir)) {
                fs.mkdirsSync(fileDir)
            }

            const response = await axios.get(v.link, {
                responseType: 'arraybuffer'
            })

            fs.writeFileSync(filePath, Buffer.from(response.data), { encoding: 'binary' })
        }
    }

    private async saveMods(mods:Mod[]){
        const config = ConfigurationManager.getConfig()

        for (const v of mods) {
            const filePath = this.pathResolve(v.path)
            const fileDir = path.join(this.pathResolve(v.path), '..') 

            if (fs.existsSync(filePath)) {
                const md5hash = crypto.createHash("md5")
                md5hash.update(fs.readFileSync(filePath))
                const hex = md5hash.digest('hex')

                if (hex === v.md5)
                    continue;
            }
            if(fs.existsSync(filePath + '.disabled')){
                const md5hash = crypto.createHash("md5")
                md5hash.update(fs.readFileSync(filePath + '.disabled'))
                const hex = md5hash.digest('hex')

                if (hex === v.md5)
                    continue;
            }

            if (!fs.existsSync(fileDir)) {
                fs.mkdirsSync(fileDir)
            }

            const response = await axios.get(v.link, {
                responseType: 'arraybuffer'
            })

            fs.writeFileSync(filePath.replace(/require|optionalon|optionaloff/g,"mods"), Buffer.from(response.data), { encoding: 'binary' })
        }
    }

    private pathResolve(p:string):string{
        const config = ConfigurationManager.getConfig()
        const userDir = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"] as string
        return path.join(p
            .replace('${MCDATADIR}', path.join(config.MinecraftDataFolder,'servers'))
            .replace('${MCLIBDIR}', path.join(datapath, ".minecraft")))
            .replace('${APPDATA}', process.platform == "win32" ? path.join(userDir, 'AppData', 'Roaming') : process.platform == "darwin" ? path.join(userDir, 'Library', 'Application Support') : userDir)
    }

}

class LauncherError extends Error{
    public code:string;
    public raw:unknown
    constructor(name:string ,code:string,message:string,raw?:unknown){
        super(message)
        this.name = name
        this.code = code
        this.raw = raw
    }
}

class SasaClient extends Client{
    private serverOption:ServerOption
    constructor(rawOption:ServerOption){
        super()
        this.serverOption = rawOption
    }
    public getServerOption():ServerOption{
        return this.serverOption
    }
}

function isEmpty(obj:string) {
    return !Object.keys(obj).length;
}

export { Launcher, LauncherError }