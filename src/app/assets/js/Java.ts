import { spawn, spawnSync } from "child_process";
import fs from 'fs-extra'
import path from 'path'
import { ConfigurationManager } from "./ConfigurationManager";

class Java{
    public static getVersion(javaPath:string):string{
        const java = spawnSync(javaPath, ['-version']);
        if (java.error)
            throw java.error
        
        const data = java.stderr.toString()
        const javaVersion = new RegExp('java version|openjdk version').test(data) ? data.split(/ |\n/)[2].replace(/"/g, '') : false;
        if(javaVersion){
            return javaVersion 
        } else {
            throw new JavaError('DetectJavaVersionException','J:001','Javaのバージョンを検出できませんでした。')
        }
    }

    public static getJava(version:string){
        const config = ConfigurationManager.getConfig()


        let java:string | null = null

        const must16: boolean = !!version.match(/1.17|1.18|21w3|21w4/)
        let has16: boolean = false


        if (must16 && !isEmpty(config.java16) && fs.existsSync(config.java16)) {
            const v = Java.getVersion(config.java16)
            if (!v.startsWith('16')) {
                throw new JavaError('WrongJavaPathException','J:002','指定されたJava16のパスが間違っています。')
            }

            return config.java16
        }

        if (!must16 && !isEmpty(config.java8) && fs.existsSync(config.java8)) {
            const v = Java.getVersion(config.java8)
            console.log(v)
            if (!v.startsWith('1.8')) {
                throw new JavaError('WrongJavaPathException', 'J:002', '指定されたJava8のパスが間違っています。')
            }

            return config.java8
        }

        const paths = <Array<string>>process.env.PATH?.split(';')
        const javas = paths
            .filter(v => v.search(/java|jdk|jre/) !== -1)
            .filter(v => fs.existsSync(path.join(v, 'java.exe')) || fs.existsSync(path.join(v, "java")))

        if (process.platform === 'win32') {
            has16 = javas.filter(v => this.getVersion(path.join(v, "java.exe")).startsWith("16")).length > 0

            java = has16 ? path.join(javas.filter(v => this.getVersion(path.join(v, "java.exe")).startsWith("16"))[0], 'java.exe')
                : path.join(javas.filter(v => this.getVersion(path.join(v, "java.exe")))[0], 'java.exe')
        } else {
            has16 = javas.filter(v => this.getVersion(path.join(v, "java")).startsWith("16")).length > 0

            java = has16 ? path.join(javas.filter(v => this.getVersion(path.join(v, "java")).startsWith("16"))[0], 'java')
                 : path.join(javas.filter(v => this.getVersion(path.join(v, "java")))[0], 'java.exe')
        }

        if(must16 && !has16){
            throw new JavaError('JavaNotFoundException','J:003','Java16が見つかりませんでした。<br>1.17以降のMinecraftを起動するにはJava16が必要です。')
        }

        return java ?? 'java'
    }
}

class JavaError extends Error{
    public code:string
    public raw:unknown
    constructor(name:string,code:string,message:string,raw?:unknown){
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
