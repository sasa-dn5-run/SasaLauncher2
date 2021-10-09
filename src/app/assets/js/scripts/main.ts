import { Auth }              from "@assets/js/Auth";
import { Launcher, LauncherError } from "@assets/js/Launcher";
import { Account } from "@assets/js/model/account";
import { Distribution, ServerOption } from "@assets/js/model/Distribution";
import { Configuration } from "@assets/js/model/configuration";
import { ConfigurationManager } from "@assets/js/ConfigurationManager";
import { Logger } from "@assets/js/Logger";
import { DiscordRPC } from "@assets/js/DiscordRPC";

import fs                    from "fs-extra"
import path                  from "path"
import axios                 from "axios"
import { session } from "electron";
import { Client } from "discord-rpc";
import { IpcRendererEvent } from "electron/main";


/**
 * doms
 */

const header: HTMLDivElement = <HTMLDivElement>document.getElementById('header')
const main: HTMLDivElement = <HTMLDivElement>document.getElementById('main')
const login: HTMLDivElement = <HTMLDivElement>document.getElementById('login')
const launch: HTMLDivElement = <HTMLDivElement>document.getElementById('launch')
const account: HTMLDivElement = <HTMLDivElement>document.getElementById('account')
const setting: HTMLDivElement = <HTMLDivElement>document.getElementById('setting')

const mainChildren: Element[] = Array.from(main.getElementsByClassName('current'))
let currentChild: number = 0

let toggleMain_lock: boolean = false

const overlay = new Overlay(<HTMLDivElement>document.getElementById("overlay"), <HTMLDivElement>document.getElementById("app"))

async function initDom() {
    const accountsData: Array<any> = await ipcRenderer.invoke('getAccounts')
    let landing: string
    if (accountsData.length !== 0) {
        landing = 'launch'
        currentChild = 2
    } else {
        landing = 'login'
        currentChild = 1
    }
    const others = Array.from(main.getElementsByClassName('child')).filter(v => v.id !== landing)
    for (let v of others) {
        (<HTMLDivElement>v).style.left = '150%'
    }

    const XmxNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxNumber')[0]
    const XmsNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsNumber')[0]
    const XmxRange: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxRange')[0]
    const XmsRange: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsRange')[0]

    XmxNumber.addEventListener('input', () => {
        XmxRange.value = XmxNumber.value
        if (parseFloat(XmxNumber.value) < parseFloat(XmsNumber.value)) {
            XmsNumber.value = XmxNumber.value
            XmsRange.value = XmxNumber.value
        }
    })
    XmxRange.addEventListener('input', () => {
        XmxNumber.value = XmxRange.value
        if (parseFloat(XmxRange.value) < parseFloat(XmsRange.value)) {
            XmsRange.value = XmxRange.value
            XmsNumber.value = XmxRange.value
        }
    })
    XmsNumber.addEventListener('input', () => {
        XmsRange.value = XmsNumber.value
        if (parseFloat(XmxNumber.value) < parseFloat(XmsNumber.value)) {
            XmxNumber.value = XmsNumber.value
            XmxRange.value = XmsNumber.value
        }
    })
    XmsRange.addEventListener('input', () => {
        XmsNumber.value = XmsRange.value
        if (parseFloat(XmxRange.value) < parseFloat(XmsRange.value)) {
            XmxRange.value = XmsRange.value
            XmxNumber.value = XmsRange.value
        }
    })



    await updateServers()
    await updateAccounts()
}

async function updateServers() {
    const distribution = await ipcRenderer.invoke('getDistribution')
    const configs:ServerOption[] = distribution.servers
    const servers: HTMLDivElement = <HTMLDivElement>launch.getElementsByClassName('servers')[0]
    const config = ConfigurationManager.getConfig()
    servers.innerHTML = ''
    for (const v of configs) {
        const server = document.createElement('div')
        let modsHTML = '<p style="color:#325239; margin:0; margin-left:5px;">MOD</p>'
        for (const m of v.mods) {
            const modpath = path.join(config.MinecraftDataFolder, 'servers', server.id, 'mods', `${v.name}.disabled`)
            const html =
                `<div class="mod">
                <h2>${m.name}</h2>
                <div style="text-align: center;" class="toggle_switch">
                    <input type="checkbox" name="${m.name}" id="${v.id}_${m.name}" checked=${checkEnableMod(modpath)} style="display: none;">
                    <label class="check" for="${v.id}_${m.name}"></label>
                </div>
            </div>`
            modsHTML += html
        }
        let additional_mods = '<p style="color:#325239; margin:0; margin-left:5px;">Additional Mods</p>'
        if (fs.existsSync(path.join(config.MinecraftDataFolder, 'servers', v.id, 'mods'))){
            for (const m of fs.readdirSync(path.join(config.MinecraftDataFolder, 'servers', v.id, 'mods'))) {
                if (v.mods.filter(v2=>v2.name === m).length !== 0)
                    continue
                const modpath = path.join(config.MinecraftDataFolder, 'servers', server.id, 'mods', `${v.name}.disabled`)
                const html =
                    `<div class="mod">
                    <h2>${m}</h2>
                    <div style="text-align: center;" class="toggle_switch">
                        <input type="checkbox" name="${m}" id="${v.id}_${m}" checked=${checkEnableMod(modpath)} style="display: none;">
                        <label class="check" for="${v.id}_${m}"></label>
                    </div>
                </div>`
                additional_mods += html
            }
        }
        server.innerHTML =
            `<div class="wrapper">
                <div class="info">
                    <h1 class="title">${v.name}</h1>
                    <p class="version">${v.option.version.number}</p>
                    <p class="description">${v.description}</p>
                </div>
                <p class="material-icons launchButton" onclick="launchMinecraft('${v.id}')">play_circle_filled</p>
                <div class="mods">
                    ${modsHTML}
                </div>
                <div class="mods">
                    ${additional_mods}
                </div>
            </div>`
        server.classList.add('server')
        servers.appendChild(server)
    }
}

function checkEnableMod(modpath:string){
    if (typeof modpath === 'undefined') {
        return true
    }
    const disabled = fs.existsSync(modpath)
    if (disabled) {
        return false
    } else {
        return true
    }
}

async function updateAccounts() {
    const accountsData = await ipcRenderer.invoke('getAccounts')

    const accounts = account.getElementsByClassName('accounts')[0]
    accounts.innerHTML = ''

    for (const v of accountsData) {
        const acco = document.createElement('div')
        acco.innerHTML =
            `<div class="info">
                <img src="https://crafatar.com/avatars/${v.uuid}?size=100" alt="">
                <div>
                    <p>username</p>
                    <h1>${v.username}</h1>
                    <p>uuid</p>
                    <h2>${v.uuid}</h2>
                </div>
            </div>
            <div class="control">
                <div class="button white" onclick="selectUser('${v.uuid}')"><p>選択</p></div>
                <div class="button white" onclick="logoutUser('${v.uuid}')"><p>ログアウト</p></div>
            </div>`
        acco.classList.add('account')

        accounts.appendChild(acco)
        if (v.selected === true) {
            const accountEl = header.getElementsByClassName('account')[0]
            const username: HTMLParagraphElement = <HTMLParagraphElement>accountEl.getElementsByClassName('username')[0]
            const usericon: HTMLImageElement = <HTMLImageElement>accountEl.getElementsByClassName('usericon')[0]

            username.innerHTML = v.username
            usericon.src = `https://crafatar.com/avatars/${v.uuid}?size=50`

            currentAccount = v.uuid
        }
    }
}

async function toggleMain(direction: string) {
    toggleMain_lock = true
    const others = Array.from(main.getElementsByClassName('child'))
    const current: HTMLDivElement = <HTMLDivElement>others[currentChild]

    if (typeof current === 'undefined')
        return

    let nextNum: number = currentChild
    let currentAnim
    let nextAmin
    let left: string

    if (direction === 'back') {
        nextNum++
        currentAnim = {
            left: ['50%', '150%']
        }
        nextAmin = {
            left: ['-50%', '50%']
        }
        left = '150%'
    } else {
        nextNum--
        currentAnim = {
            left: ['50%', '-50%']
        }
        nextAmin = {
            left: ['150%', '50%']
        }
        left = '-50%'
    }
    const next = <HTMLDivElement>others[nextNum]

    if (typeof next === 'undefined')
        return

    current.classList.remove('current')

    current.style.left = left
    next.style.left = '50%'
    current.animate(currentAnim, {
        duration: 500,
        easing: 'ease'
    })
    next.animate(nextAmin, {
        duration: 500,
        easing: 'ease'
    })

    currentChild = nextNum
    await sleep(500)

    current.style.animation = ''

    toggleMain_lock = false
}


/**
 * main
 */


let datapath:string

const packUrl: string = "https://raw.githubusercontent.com/sasadd-LAB/SasaPacks2/master"

const launcher = new Launcher()


/**
 * 初期化関数
 */

async function init(){
    datapath = await ipcRenderer.invoke('getDataPath')
    Logger.setPath(path.join(datapath, 'logs'))
    await ConfigurationManager.init()
    const config = ConfigurationManager.getConfig()

    //process
    process.on('uncaughtException', (error) => {
        console.log(error.name)
        overlay.Error('U:000', error.message)
    })
    process.on('unhandledRejection',(reason)=>{
        console.log(reason)
    })
    process.on('uncaughtExceptionMonitor',(error,origin)=>{
        console.log(error,origin)
    })

    const dataFolder: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('dataFolder')[0]
    const java16: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('java16')[0]
    const java8: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('java8')[0]
    const XmxNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxNumber')[0]
    const XmsNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsNumber')[0]
    const XmxRange: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxRange')[0]
    const XmsRange: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsRange')[0]
    dataFolder.value = config.MinecraftDataFolder
    java16.value = config.java16
    java8.value = config.java8
    if (config.Xmx){
        XmxNumber.value = config.Xmx.replace('G', '')
        XmxRange.value = XmxNumber.value
    }
    if(config.Xms){
        XmsNumber.value = config.Xms.replace('G', '')
        XmsRange.value = XmsNumber.value
    }


    const accountsPath = path.join(datapath, "accounts.json")
    if (!fs.existsSync(accountsPath)){
        fs.writeJSONSync(accountsPath,[])
    }

    const mcdatapath = path.join(datapath,".minecraft")
    if(!fs.existsSync(mcdatapath)){
        fs.mkdirsSync(mcdatapath)
    }


    const response = await axios.get(`${packUrl}/distribution.json`)
    fs.writeJSONSync(path.join(datapath, "distribution.json"), response.data, { spaces: 4 })

    await initDom()

    //mods
    const distribution:Distribution = await ipcRenderer.invoke('getDistribution')
    for (const server of distribution.servers){
        for(const mod of server.mods){
            const doc:HTMLInputElement = <HTMLInputElement>document.getElementById(`${server.id}_${mod.name}`)
            const modpath = path.join(config.MinecraftDataFolder, 'servers', server.id, 'mods', `${mod.name}.disabled`)
            if(typeof modpath === 'undefined'){
                doc.checked = true
                continue
            }
            const disabled = fs.existsSync(modpath)
            if(disabled){
                doc.checked = false
            } else {
                doc.checked = true
            }
        }
    }


    //discordRpc
    await DiscordRPC.init('891832071696310273')
    await DiscordRPC.setActivity({
        details: 'In Menu',
        state: 'SasaLauncher2 v1.0.0',
        largeImageKey: 'icon',
        largeImageText: 'SasaLauncher2'
    })

    ipcRenderer.send("autoUpdateAction", "initAutoUpdater")
    ipcRenderer.send("autoUpdateAction", "checkForUpdate")
}
init()

Auth.setup(ipcRenderer)


/**
 * Mojangアカウントの追加
 * HTML onclick からの実行を想定
 */
async function addMojangAccount(){
    overlay.loading()
    const email:HTMLInputElement = <HTMLInputElement> login.getElementsByClassName('email')[0]
    const password:HTMLInputElement = <HTMLInputElement> login.getElementsByClassName('password')[0]

    try {
        const auth = await Auth.mojangAuth(email.value, password.value)
        const accountsPath = path.join(datapath, "accounts.json")
        const accounts: Account[] = fs.readJsonSync(accountsPath)
        accounts.push({
            type:"mojang",
            email:email.value,
            password:password.value,
            username:auth.name,
            uuid:auth.uuid,
            refreshToken:auth.client_token,
            selected:accounts.length < 1
        })
        fs.writeJSONSync(accountsPath, accounts,{ spaces: 4 })

        await updateAccounts()
        overlay.close()
    } catch (error) {
        const Lerror = <LauncherError>error 
        Logger.error(<string>error)
        overlay.Error(Lerror.code,Lerror.message)
    }

}


/**
 * Microsoftアカウントの追加
 * @param code Microsoft Oauth の code 
 */

async function addMicrosoftAccount(code:string){
    overlay.loading()
    try {
        const auth = await Auth.microsoftAuth(code)
        const accountsPath = path.join(datapath, "accounts.json")
        const accounts:Account[] = fs.readJsonSync(accountsPath)
        if(accounts.filter(v=>v.uuid === auth.uuid).length > 0){
            overlay.Error('A:005','すでにアカウントが存在します。')
            return
        }
        accounts.push({
            type:"microsoft",
            username:auth.name,
            uuid: auth.uuid,
            refreshToken:auth.client_token,
            selected: accounts.length < 1
        })
        fs.writeJSONSync(accountsPath,accounts,{spaces:4})
        await updateAccounts()
        overlay.close()
        
    } catch (error) {
        const Lerror = <LauncherError>error
        Logger.error(<string>error)
        overlay.Error(Lerror.code,Lerror.message)
    }
}


/**
 * ユーザー選択
 * @param uuid Minecraft アカウントのUUID
 */
async function selectUser(uuid:string){
    const accountsPath = path.join(datapath, "accounts.json")
    const accounts: Account[] = fs.readJsonSync(accountsPath)

    const account = accounts.filter(v=>v.uuid === uuid)[0]
    account.selected = true

    const accountEl = header.getElementsByClassName('account')[0]
    const username:HTMLParagraphElement = <HTMLParagraphElement>accountEl.getElementsByClassName('username')[0]
    const usericon:HTMLImageElement = <HTMLImageElement>accountEl.getElementsByClassName('usericon')[0]

    username.innerHTML = account.username
    usericon.src = `https://crafatar.com/avatars/${account.uuid}?size=50`

    const others = accounts.filter(v=>v.uuid !== uuid)
    for(const v of others){
        v.selected = false
    }
    others.push(account)
    fs.writeJsonSync(accountsPath,others,{spaces:4})

    currentAccount = uuid
}


/**
 * ログアウト
 * @param uuid MinecraftアカウントのUUID
 */
async function logoutUser(uuid:string){
    overlay.loading()
    const accountsPath = path.join(datapath, "accounts.json")
    const accounts: Account[] = fs.readJsonSync(accountsPath)

    const accountNew = accounts.filter(v => v.uuid !== uuid)
    fs.writeJsonSync(accountsPath, accountNew, { spaces: 4 })
    await updateAccounts()
    overlay.close()
}


/**
 * Minecraftの起動
 * @param id 起動構成のID
 */
async function launchMinecraft(id:string){
    const modsDiv: HTMLDivElement = <HTMLDivElement>launch.getElementsByClassName('mods')[0]
    const additional_modsDiv: HTMLDivElement = <HTMLDivElement>launch.getElementsByClassName('mods')[1]
    const mods = modsDiv.getElementsByTagName('input')
    const additional_mods = additional_modsDiv.getElementsByTagName('input')
    const disableModList = []
    
    for(const v of mods){
        if(!v.checked){
            disableModList.push(v.name)
        }
    }
    for (const v of additional_mods) {
        if (!v.checked) {
            disableModList.push(v.name)
        }
    }

    console.log(disableModList)
    
    await overlay.showProgress()
    try {
        const client = await launcher.launch(currentAccount, id, disableModList)
        overlay.setProgress("loading", 0, 100)
        client.on('progress', (data) => {
            overlay.setProgress(`Downloading: ${data.type} ...`, data.task, data.total)            
        })
        client.on('data',async data => {
            if (overlay.showing())
                overlay.close()
            
            const msg = <string>data
            console.log(msg)
            if (msg.includes('Loading for game')){
                DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} を起動中...`,
                    state: 'SasaLauncher2 v1.0.0',
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher3 v1.0.0',
                })
            }
            if (msg.includes('Setting user:')){
                await DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} をプレイ中`,
                    state: `In Menu`,
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher2'
                })
            }
            if (msg.includes('Connecting to')){
                const server = msg.replace(/(?<=,)(.*)/, '').replace(/(.*)(?=:)/,'').replace('Connecting to ','')
                await DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} をプレイ中`,
                    state: `In ${server}`,
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher2'
                })
            }
            if (msg.includes('Time elapsed:')){
                await DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} をプレイ中`,
                    state: `In : single player`,
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher2'
                })
            }
            if (msg.includes('Stopping singleplayer server')){
                await DiscordRPC.setDefault()
            }
        })
        client.on('close',async data => {
            await DiscordRPC.setDefault()
        })
    } catch (error) {
        const Lerorr = <LauncherError>error
        Logger.error(<string>error)
        overlay.Error(Lerorr.code, Lerorr.message)
    }
}


/**
 * Configの保存
 */
function saveConfiguration(){
    const config = ConfigurationManager.getConfig()

    const MinecraftDataFolder: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('dataFolder')[0]
    const java16Path: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('java16')[0]
    const java8Path: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('java8')[0]
    const XmxNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxNumber')[0]
    const XmsNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsNumber')[0]

    clearError(setting)

    if (process.platform === 'win32' && ((!isEmpty(java16Path.value) && !java16Path.value.endsWith('java.exe')) || (!isEmpty(java8Path.value) && !java8Path.value.endsWith('java.exe')))){
        showError('Javaのパスは "java.exe" で終わる必要があります。', setting)
        return
    }
    if (process.platform !== 'win32' && (((!isEmpty(java16Path.value) && !java16Path.value.endsWith('java')) || (!isEmpty(java8Path.value) && !java8Path.value.endsWith('java'))))){
        showError('Javaのパスは "java" で終わる必要があります。', setting)
        return
    }
    if ((!isEmpty(java16Path.value) && !fs.existsSync(java16Path.value)) || (!isEmpty(java8Path.value) && !fs.existsSync(java8Path.value))){
        showError('指定されたJavaのパスが見つかりません。', setting)
        return
    }

    config.MinecraftDataFolder = MinecraftDataFolder.value
    config.java16 = java16Path.value
    config.java8 = java8Path.value
    config.Xmx = `${XmxNumber.value}G`
    config.Xms = `${XmsNumber.value}G`

    ConfigurationManager.save(config)
    toggleMain('back')
}




async function checkUpdate() {
    let doc: HTMLInputElement = <HTMLInputElement>document.createElement("div")
    doc.innerHTML = "<h1>アップデートを確認中...</h1>"
    await overlay.show(doc)
    ipcRenderer.send("autoUpdateAction", "checkForUpdate")
}

ipcRenderer.on('autoUpdateNotification', async (event: IpcRendererEvent, arg: string, info: any) => {
    switch (arg) {
        case 'checking-for-update': {
            let doc: HTMLInputElement = <HTMLInputElement>document.createElement("div")
            doc.innerHTML =
                `<h1>アップデートを確認中...</h1>
                <p>Checking for update...</p>`
            overlay.change(doc)
            break
        }
        case 'update-available': {
            if (overlay.showing()) {
                let doc: HTMLInputElement = <HTMLInputElement>document.createElement("div")
                doc.innerHTML =
                    `<h1>アップデートを確認中...</h1>
                    <p>Downloading version ${info.version} ...</p>`
                overlay.change(doc)
            }
            ipcRenderer.send("autoUpdateAction", "downloadUpdate")
            const UpdateNoticeParagraph:HTMLParagraphElement = <HTMLParagraphElement>document.getElementById('UpdateNoticeParagraph')
            UpdateNoticeParagraph.style.opacity = "1"
            break
        }
        case 'update-downloaded': {
            if (overlay.showing()) {
                let doc: HTMLInputElement = <HTMLInputElement>document.createElement("div")
                doc.innerHTML =
                    `<h1>アップデートが見つかりました。</h1>
                <p>インストールしますか？</p>`
                overlay.changeQuestion(doc)
                    .then((res) => {
                        if (!res)
                            return
                        ipcRenderer.send("autoUpdateAction", "installUpdateNow")
                    })
            }
            break
        }
        case 'update-not-available': {
            if (overlay.showing()) {
                let doc: HTMLInputElement = <HTMLInputElement>document.createElement("div")
                doc.innerHTML =
                    `<h1>アップデートは見つかりませんでした</h1>`
                overlay.change(doc)
            }
            break
        }
        case 'ready': {
            break
        }
        case 'realerror': {
            console.error(info)
            break
        }
        default:
            break
    }
})



ipcRenderer.on('MicrosoftOAuth', (event: IpcRendererEvent, arg: string, data: any) => {
    switch (arg) {
        case 'FailedAuth': {
            overlay.Error('A:110', 'Microsoft認証に失敗しました。')
            break
        }

        case 'SucceedAuth': {
            addMicrosoftAccount(data)
        }
    }
})



/**
 *  Additional code
 */

function isEmpty(obj:string) {
    return !Object.keys(obj).length;
}
function clearError(parent: HTMLElement) {
    const parents = parent.children[0]
    for (let v of <any>parents.children) {
        if (v.className === "errorMsg")
            v.remove()
    }
}
function showError(msg: string, parent: HTMLElement) {
    let parents = parent.children[0]
    let errorEl = document.createElement('p')
    let errorCo = document.createTextNode(msg)
    errorEl.appendChild(errorCo)
    errorEl.setAttribute('class', 'errorMsg')
    parents?.appendChild(errorEl)
    parent.parentElement?.scrollTo(0, parent.parentElement?.scrollHeight)
}