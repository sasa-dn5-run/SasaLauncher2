import { ipcRenderer } from 'electron'
import fs from 'fs-extra'
import path from 'path'
import { Configuration } from './model/configuration'

let DATA_PATH:string

class ConfigurationManager{
    public static async init(){
        DATA_PATH = await ipcRenderer.invoke('getDataPath')

        const configFile = path.join(DATA_PATH, 'config.json')
        if (fs.existsSync(configFile))
            return
        
        const config: Configuration = {
            MinecraftDataFolder: path.join(DATA_PATH,"servers"),
            java16:'',
            java8:'',
            Xmx:'4G',
            Xms:'4G'
        }

        fs.writeJSONSync(configFile, config, { spaces: 4 })
    }

    public static getConfig():Configuration{
        const configPath = path.join(DATA_PATH, 'config.json')
        const config:Configuration = <Configuration>fs.readJSONSync(configPath)
        if(typeof config === 'undefined')
            throw new Error()
        return config
    }

    public static save(config:Configuration){
        fs.writeJSONSync(path.join(DATA_PATH,'config.json'),config,{spaces:4})
    }
}

export { ConfigurationManager }