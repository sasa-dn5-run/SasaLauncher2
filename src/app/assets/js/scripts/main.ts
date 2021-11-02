import { Auth } from "@assets/js/Auth";
import { Launcher, LauncherError } from "@assets/js/Launcher";
import { Account } from "@assets/js/model/account";
import { Distribution, ServerOption } from "@assets/js/model/Distribution";
import { ConfigurationManager } from "@assets/js/ConfigurationManager";
import { Logger } from "@assets/js/Logger";
import { DiscordRPC } from "@assets/js/DiscordRPC";
import { DOMBuilder } from "@assets/js/scripts/DOMBuilder";

import fs from "fs-extra"
import path from "path"
import axios from "axios"
import { IpcRendererEvent } from "electron/main";


/**
 * doms
 */
const appclosebutton: HTMLInputElement = <HTMLInputElement>document.getElementById('appclosebutton')
const apphidebutton: HTMLInputElement = <HTMLInputElement>document.getElementById('apphidebutton')
const appmaximizebutton: HTMLInputElement = <HTMLInputElement>document.getElementById('appmaximizebutton')

appclosebutton.addEventListener('click', function () {
    const window = remote.getCurrentWindow()
    window.close()
})
apphidebutton.addEventListener('click', function () {
    const window = remote.getCurrentWindow()
    window.minimize()
})
appmaximizebutton.addEventListener('click', function () {
    const window = remote.getCurrentWindow()
    if (window.isMaximized()) {
        window.unmaximize()
    } else {
        window.maximize()
    }
})

const header: HTMLDivElement = document.getElementById('header') as HTMLDivElement
const main: HTMLDivElement = document.getElementById('main') as HTMLDivElement
const login: HTMLDivElement = document.getElementById('login') as HTMLDivElement
const launch: HTMLDivElement = document.getElementById('launch') as HTMLDivElement
const account: HTMLDivElement = document.getElementById('account') as HTMLDivElement
const setting: HTMLDivElement = document.getElementById('setting') as HTMLDivElement
const debugLog: HTMLDivElement = document.getElementById('debugLog') as HTMLDivElement

let currentChild: number = 0

let toggleMain_lock: boolean = false

const overlay = new Overlay(document.getElementById("overlay") as HTMLDivElement, document.getElementById("app") as HTMLDivElement)
const domBuilder = new DOMBuilder()

async function initDom() {
    const accountsData: Array<any> = await ipcRenderer.invoke('getAccounts')
    let landing: string
    if (accountsData.length !== 0) {
        landing = 'launch'
        currentChild = 2
    } else {
        landing = 'login'
        currentChild = 3
    }
    const others = Array.from(main.getElementsByClassName('child')).filter(v => v.id !== landing)
    for (let v of others) {
        (v as HTMLDivElement).style.left = '150%'
    }

    const XmxNumber: HTMLInputElement = setting.getElementsByClassName('XmxNumber')[0] as HTMLInputElement
    const XmsNumber: HTMLInputElement = setting.getElementsByClassName('XmsNumber')[0] as HTMLInputElement
    const XmxRange: HTMLInputElement = setting.getElementsByClassName('XmxRange')[0] as HTMLInputElement
    const XmsRange: HTMLInputElement = setting.getElementsByClassName('XmsRange')[0] as HTMLInputElement

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
    const configs: ServerOption[] = distribution.servers
    const servers: HTMLDivElement = launch.getElementsByClassName('servers')[0] as HTMLDivElement
    servers.innerHTML = ''
    for (const v of configs) {
        servers.appendChild(domBuilder.buildServer(v))
    }
}

async function updateAccounts() {
    const accountsData:Account[] = await ipcRenderer.invoke('getAccounts')

    const accounts = account.getElementsByClassName('accounts')[0]
    accounts.innerHTML = ''

    for (const v of accountsData) {
        const acco = domBuilder.buildAccount(v)
        accounts.appendChild(acco)
        if (v.selected === true) {
            const accountEl = header.getElementsByClassName('account')[0]
            const username: HTMLParagraphElement = accountEl.getElementsByClassName('username')[0] as HTMLParagraphElement
            const usericon: HTMLImageElement = accountEl.getElementsByClassName('usericon')[0] as HTMLImageElement

            username.innerHTML = v.username
            usericon.src = `https://mcskin.sasadd.net/uuid/face/${v.uuid}?size=50`

            currentAccount = v.uuid
        }
    }
}

async function toggleMain(direction: string) {
    toggleMain_lock = true
    const others = Array.from(main.getElementsByClassName('child'))
    const current: HTMLDivElement = others[currentChild] as HTMLDivElement

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
    const next = others[nextNum] as HTMLDivElement

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


let DATA_PATH: string
const packUrl: string = "https://raw.githubusercontent.com/sasadd-LAB/SasaPacks2/master"
const launcher = new Launcher()


/**
 * 初期化関数
 */

async function init() {
    DATA_PATH = await ipcRenderer.invoke('getDataPath')
    Logger.setup(path.join(DATA_PATH, 'logs'), debugLog.getElementsByClassName('log')[0] as HTMLDivElement)
    await ConfigurationManager.init()
    const config = ConfigurationManager.getConfig()

    Logger.info('Initializing...')
    const dataFolder: HTMLInputElement = setting.getElementsByClassName('dataFolder')[0] as HTMLInputElement
    const XmxNumber: HTMLInputElement = setting.getElementsByClassName('XmxNumber')[0] as HTMLInputElement
    const XmsNumber: HTMLInputElement = setting.getElementsByClassName('XmsNumber')[0] as HTMLInputElement
    const XmxRange: HTMLInputElement = setting.getElementsByClassName('XmxRange')[0] as HTMLInputElement
    const XmsRange: HTMLInputElement = setting.getElementsByClassName('XmsRange')[0] as HTMLInputElement
    dataFolder.value = config.MinecraftDataFolder
    if (config.Xmx) {
        XmxNumber.value = config.Xmx.replace('G', '')
        XmxRange.value = XmxNumber.value
    }
    if (config.Xms) {
        XmsNumber.value = config.Xms.replace('G', '')
        XmsRange.value = XmsNumber.value
    }


    const accountsPath = path.join(DATA_PATH, "accounts.json")
    if (!fs.existsSync(accountsPath)) {
        fs.writeJSONSync(accountsPath, [])
    }

    const MC_DATA_PATH = path.join(DATA_PATH, ".minecraft")
    if (!fs.existsSync(MC_DATA_PATH)) {
        fs.mkdirsSync(MC_DATA_PATH)
    }


    const response = await axios.get(`${packUrl}/distribution.json`)
    fs.writeJSONSync(path.join(DATA_PATH, "distribution.json"), response.data, { spaces: 4 })

    launcher.initLauncherProfile()

    await initDom()

    //mods
    const distribution: Distribution = await ipcRenderer.invoke('getDistribution')
    for (const server of distribution.servers) {
        const modpath = path.join(config.MinecraftDataFolder, 'servers', server.id, 'mods')
        if (!fs.existsSync(modpath)) fs.mkdirsSync(modpath)
        for (const mod of fs.readdirSync(modpath)) {
            const name = mod.replace('.disabled', '')
            const doc: HTMLInputElement = document.getElementById(`${server.id}_${name}`) as HTMLInputElement
            if(!doc) continue
            const disabled = fs.existsSync(path.join(modpath, `${name}.disabled`))
            if (disabled) {
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
async function addMojangAccount() {
    overlay.loading()
    const email: HTMLInputElement = login.getElementsByClassName('email')[0] as HTMLInputElement
    const password: HTMLInputElement = login.getElementsByClassName('password')[0] as HTMLInputElement

    try {
        const auth = await Auth.mojangAuth(email.value, password.value)
        const accountsPath = path.join(DATA_PATH, "accounts.json")
        const accounts: Account[] = fs.readJsonSync(accountsPath)
        accounts.push({
            type: "mojang",
            email: email.value,
            password: password.value,
            username: auth.name,
            uuid: auth.uuid,
            refreshToken: auth.client_token,
            selected: accounts.length < 1
        })
        fs.writeJSONSync(accountsPath, accounts, { spaces: 4 })

        await updateAccounts()
        overlay.close()
    } catch (error) {
        const Lerror = <LauncherError>error
        Logger.error(<string>error)
        overlay.Error(Lerror.code, Lerror.message)
    }

}


/**
 * Microsoftアカウントの追加
 * @param code Microsoft Oauth の code 
 */

async function addMicrosoftAccount(code: string) {
    overlay.loading()
    try {
        const auth = await Auth.microsoftAuth(code)
        const accountsPath = path.join(DATA_PATH, "accounts.json")
        const accounts: Account[] = fs.readJsonSync(accountsPath)
        if (accounts.filter(v => v.uuid === auth.uuid).length > 0) {
            overlay.Error('A:005', 'すでにアカウントが存在します。')
            return
        }
        accounts.push({
            type: "microsoft",
            username: auth.name,
            uuid: auth.uuid,
            refreshToken: auth.client_token,
            selected: accounts.length < 1
        })
        fs.writeJSONSync(accountsPath, accounts, { spaces: 4 })
        await updateAccounts()
        overlay.close()

    } catch (error) {
        const Lerror = <LauncherError>error
        Logger.error(<string>error)
        overlay.Error(Lerror.code, Lerror.message)
    }
}


/**
 * ユーザー選択
 * @param uuid Minecraft アカウントのUUID
 */
async function selectUser(uuid: string) {
    const accountsPath = path.join(DATA_PATH, "accounts.json")
    const accounts: Account[] = fs.readJsonSync(accountsPath)

    const account = accounts.filter(v => v.uuid === uuid)[0]
    account.selected = true

    const accountEl = header.getElementsByClassName('account')[0]
    const username: HTMLParagraphElement = accountEl.getElementsByClassName('username')[0] as HTMLParagraphElement
    const usericon: HTMLImageElement = accountEl.getElementsByClassName('usericon')[0] as HTMLImageElement

    username.innerHTML = account.username
    usericon.src = `https://mcskin.sasadd.net/uuid/face/${account.uuid}?size=50`

    const others = accounts.filter(v => v.uuid !== uuid)
    for (const v of others) {
        v.selected = false
    }
    others.push(account)
    fs.writeJsonSync(accountsPath, others, { spaces: 4 })

    currentAccount = uuid
}


/**
 * ログアウト
 * @param uuid MinecraftアカウントのUUID
 */
async function logoutUser(uuid: string) {
    overlay.loading()
    const accountsPath = path.join(DATA_PATH, "accounts.json")
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
async function launchMinecraft(id: string) {
    const server: HTMLDivElement = launch.getElementsByClassName(id)[0] as HTMLDivElement

    const disableModList:string[] = []
    for (const doc of server.getElementsByClassName('mods')){
        for (const v of doc.getElementsByTagName('input')){
            if(!v.checked){
                disableModList.push(v.name)
            }
        }
    }

    Logger.debug(`Disabled mods ${disableModList}`)

    await overlay.showProgress()
    try {
        const client = await launcher.createClient(currentAccount, id, disableModList)
        client.launchS()
        overlay.setProgress("loading", 0, 100)
        client.on('task', (data)=>{
            overlay.setProgress(`${data.name}`, data.task, data.total)
        })

        client.on('data', async data => {
            if (overlay.showing())
                overlay.close()
            const msg = data as string
            Logger.info(msg)
            if (msg.includes('Loading for game')) {
                DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} を起動中...`,
                    state: 'SasaLauncher2 v1.0.0',
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher3 v1.0.0',
                })
            }
            if (msg.includes('Setting user:')) {
                await DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} をプレイ中`,
                    state: `In Menu`,
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher2'
                })
            }
            if (msg.includes('Connecting to')) {
                const server = msg.replace(/(?<=,)(.*)/, '').replace(/(.*)(?=:)/, '').replace('Connecting to ', '')
                await DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} をプレイ中`,
                    state: `In ${server}`,
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher2'
                })
            }
            if (msg.includes('Time elapsed:')) {
                await DiscordRPC.setActivity({
                    details: `${client.getServerOption().name} をプレイ中`,
                    state: `In : single player`,
                    largeImageKey: 'icon',
                    largeImageText: 'SasaLauncher2'
                })
            }
            if (msg.includes('Stopping singleplayer server')) {
                await DiscordRPC.setDefault()
            }
        })
        client.on('error', (err) => {
            overlay.Error('A:006', err)
        })
        client.on('close', async data => {
            if(data === 1) {
                overlay.Error('A:000', 'クライアントが起動できませんでした。')
            }
            Logger.debug(`Exit code : ${data}`)
            await DiscordRPC.setDefault()
        })
        client.on("debug", (data) => {
            Logger.debug(data)
        })
    } catch (error) {
        const Lerorr = <LauncherError>error
        Logger.error(<string>error)
        overlay.Error(Lerorr.code, Lerorr.message)
    }
}

async function addAdditionalMod(id: string) {
    const file = dialog.showOpenDialogSync({
        title: '追加するModを選択',
        properties: ['openFile'],
        filters: [
            { name: 'Mod', extensions: ['jar'] }
        ]
    })
    if (file) {
        const modPath = file[0]
        const modName = path.basename(modPath)
        const mod = document.createElement('div')
        mod.className = 'mod'
        mod.innerHTML = (new domBuilder.ModBuilder()).buildAdditionalMod(id, modName)
        const modsDiv: HTMLDivElement = launch.getElementsByClassName(id)[0].getElementsByClassName('mods')[2] as HTMLDivElement
        modsDiv.appendChild(mod)
        launcher.addAdditionalMod(id, modPath)
    }
}
async function removeAdditionalMod(id: string, modName: string){
    const doc = document.createElement('h1')
    doc.innerHTML = 'Modを削除しますか？'
    const question = await overlay.question(doc)
    if(question){
        const modsDiv: HTMLDivElement = launch.getElementsByClassName(id)[0].getElementsByClassName('mods')[2] as HTMLDivElement
        const mod = modsDiv.getElementsByClassName(`${id}_${modName}`)[0]
        mod.remove()
        launcher.removeAdditionalMod(id, modName)
    }
}

/**
 * Configの保存
 */
function saveConfiguration() {
    const config = ConfigurationManager.getConfig()

    const MinecraftDataFolder: HTMLInputElement = setting.getElementsByClassName('dataFolder')[0] as HTMLInputElement
    const XmxNumber: HTMLInputElement = setting.getElementsByClassName('XmxNumber')[0] as HTMLInputElement
    const XmsNumber: HTMLInputElement = setting.getElementsByClassName('XmsNumber')[0] as HTMLInputElement

    config.MinecraftDataFolder = MinecraftDataFolder.value
    config.Xmx = `${XmxNumber.value}G`
    config.Xms = `${XmsNumber.value}G`

    ConfigurationManager.save(config)
    toggleMain('back')
}


async function checkUpdate() {
    let doc: HTMLInputElement = document.createElement("div") as HTMLInputElement
    doc.innerHTML = "<h1>アップデートを確認中...</h1>"
    await overlay.show(doc)
    ipcRenderer.send("autoUpdateAction", "checkForUpdate")
}

ipcRenderer.on('autoUpdateNotification', async (event: IpcRendererEvent, arg: string, info: any) => {
    switch (arg) {
        case 'checking-for-update': {
            let doc: HTMLInputElement = document.createElement("div") as HTMLInputElement
            doc.innerHTML =
                `<h1>アップデートを確認中...</h1>
                <p>Checking for update...</p>`
            overlay.change(doc)
            break
        }
        case 'update-available': {
            if (overlay.showing()) {
                let doc: HTMLInputElement = document.createElement("div") as HTMLInputElement
                doc.innerHTML =
                    `<h1>アップデートを確認中...</h1>
                    <p>Downloading version ${info.version} ...</p>`
                overlay.change(doc)
            }
            ipcRenderer.send("autoUpdateAction", "downloadUpdate")
            const UpdateNoticeParagraph: HTMLParagraphElement = document.getElementById('UpdateNoticeParagraph') as HTMLParagraphElement
            UpdateNoticeParagraph.style.opacity = "1"
            break
        }
        case 'update-downloaded': {
            if (overlay.showing()) {
                let doc: HTMLInputElement = document.createElement("div") as HTMLInputElement
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
                let doc: HTMLInputElement = document.createElement("div") as HTMLInputElement
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
            Logger.error(info)
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

function isEmpty(obj: string) {
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