import { ILauncherOptions, IOverrides } from "minecraft-launcher-core"
import axios from "axios"
import path from "path"
import fs from "fs-extra"
import crypto from "crypto"

import { Account } from "./model/account"
import { Distribution, File, Mod, ServerOption } from "./model/Distribution"
import { Auth } from "./Auth"
import { ConfigurationManager } from "./ConfigurationManager"
import { SasaClient } from "./SasaClient"

interface SasaOverride extends IOverrides{
    gameDirectory: string
}
interface SasaLauncherOptions extends ILauncherOptions{
    overrides: SasaOverride
}

export class Launcher{

    public async initLauncherProfile(){
        const DATA_PATH = await ipcRenderer.invoke('getDataPath')
        const MC_DATA_PATH = path.join(DATA_PATH, ".minecraft")

        if(!fs.existsSync(MC_DATA_PATH))
            fs.mkdirsSync(MC_DATA_PATH)

        // launcher_profiles.json の作成
        const launcherProfilePath = path.join(MC_DATA_PATH, "launcher_profiles.json")
        if(!fs.existsSync(launcherProfilePath)){
            
        }
        fs.writeJSONSync(launcherProfilePath, {
            clientToken: "",
            launcherVersion: {
                format: 21,
                name: "",
                profilesFormat: 2
            },
            profiles: {}
        }, { spaces: 4 })
    }


    /**
     * @param uuid Minecraft アカウントのUUID
     * @param id 起動構成のID
     * @param disableModList 無効にするModのリスト
     * @returns クライアントインスタンス
     */
    public async createClient(uuid:string,id:string,disableModList:Array<string>):Promise<SasaClient>{
        const DATA_PATH = await ipcRenderer.invoke('getDataPath')
        const config = ConfigurationManager.getConfig()

        const accounts: Account[] = await ipcRenderer.invoke('getAccounts')
        const account = accounts.find(v => v.uuid === uuid)
        if(!account)
            throw new LauncherError('AccountNotFoundException', 'A:011', 'アカウントが見つかりません。')

        const distro: Distribution = await ipcRenderer.invoke('getDistribution')

        const option = distro.servers.find(v => v.id === id)
        if(!option)
            throw new LauncherError('LaunchConfigurationNotFoundException', 'L:001', '起動構成が見つかりません。')

        await this.saveFiles(option.files)
        await this.saveMods(option.mods)
        this.disableMods(disableModList, id)

        const IOption = option?.option as SasaLauncherOptions
        if (!account.refreshToken)
            throw new Error("refreshToken is not set")
        if (account.type === "mojang") {
            IOption.authorization = Auth.refreshMojangAuth(account.refreshToken)
        } else if (account.type === "microsoft") {
            IOption.authorization = Auth.refreshMicrosoftAuth(account.refreshToken)
        } else {
            throw new Error("account type is not supported")
        }

        if (!IOption.root || Object.keys(IOption.root).length === 0)
            IOption.root = path.join(DATA_PATH, '.minecraft')
        else 
            IOption.root = await this.pathResolve(IOption.root)

        if(IOption.forge) IOption.forge = await this.pathResolve(IOption.forge)

        IOption.overrides.gameDirectory = path.join(config.MinecraftDataFolder, 'servers', option.id)
        IOption.memory.max = config.Xmx || '2G'
        IOption.memory.min = config.Xms || '2G'

        option.option = IOption

        const client = new SasaClient(option)
        return client
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
            const filePath = await this.pathResolve(v.path)
            const fileDir = path.join(await this.pathResolve(v.path), '..')
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
        for (const v of mods) {
            const filePath = await this.pathResolve(v.path)
            const fileDir = path.join(await this.pathResolve(v.path), '..') 

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

    public async addAdditionalMod(id:string, modPath:string){
        const distro = await ipcRenderer.invoke('getDistribution')
        const option = (distro.servers as ServerOption[]).find(v => v.id === id)

        if(!option)
            throw new LauncherError('LaunchConfigurationNotFoundException', 'L:001', '起動構成が見つかりません。')

        const fileDir = await this.pathResolve(`\${MCDATADIR}/${option.id}/mods`)

        if (!fs.existsSync(fileDir)) {
            fs.mkdirsSync(fileDir)
        }

        fs.copySync(modPath, path.join(fileDir, path.basename(modPath)))
    }
    public async removeAdditionalMod(id:string, modName:string){
        const distro = await ipcRenderer.invoke('getDistribution')
        const option = (distro.servers as ServerOption[]).find(v => v.id === id)

        if(!option)
            throw new LauncherError('LaunchConfigurationNotFoundException', 'L:001', '起動構成が見つかりません。')

        const fileDir = await this.pathResolve(`\${MCDATADIR}/${option.id}/mods`)

        if (!fs.existsSync(fileDir)) {
            fs.mkdirsSync(fileDir)
        }

        fs.removeSync(path.join(fileDir, modName))
    }

    private async pathResolve(p: string): Promise<string>{
        const DATA_PATH = await ipcRenderer.invoke('getDataPath')
        const config = ConfigurationManager.getConfig()
        const userDir = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"] as string
        return path.join(p
            .replace('${MCDATADIR}', path.join(config.MinecraftDataFolder,'servers'))
            .replace('${MCLIBDIR}', path.join(DATA_PATH, ".minecraft")))
            .replace('${APPDATA}', process.platform == "win32" ? path.join(userDir, 'AppData', 'Roaming') : process.platform == "darwin" ? path.join(userDir, 'Library', 'Application Support') : userDir)
    }

}

export class LauncherError extends Error{
    public code:string;
    public raw:unknown
    constructor(name:string ,code:string,message:string,raw?:unknown){
        super(message)
        this.name = name
        this.code = code
        this.raw = raw
    }
}