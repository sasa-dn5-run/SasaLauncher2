import { ILauncherOptions } from "minecraft-launcher-core";

type level = 'require' | 'optionalon' | 'optionaloff'

interface File {
    name:string,
    path: string,
    link: string,
    size: number,
    md5: string
}

interface Mod extends File{
    level: level
}

interface ServerOption {
    name: string,
    id: string,
    description: string,
    option: ILauncherOptions,
    mods: Mod[],
    files: File[]
}

interface Distribution {
    version: string
    servers: ServerOption[]
}

export { level, Mod, File, ServerOption, Distribution }