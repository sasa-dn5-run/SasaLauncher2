
import { app, App, AutoUpdater, BrowserWindow, IpcMain, ipcMain, IpcMainEvent, IpcMainInvokeEvent, Menu, Session, Tray } from 'electron'
import { autoUpdater, AppUpdater } from 'electron-updater'

import path from 'path'
import fs from 'fs-extra'

import { URL } from 'url'

import { MicrosoftAuth } from 'minecraft-auth'
import {} from 'minecraft-launcher-core'

const appPath = path.join(__dirname, 'app')
const isDev = fs.existsSync('../dev/isDev.js')

const config = require('./config.json') 

const appId = config.AppID
const appSecret = config.AppSecret
const redirectURL = config.redirect

const distroLink = 'https://raw.githubusercontent.com/sasadd-LAB/SasaPacks2/master'

export class MainApp {

    public static readonly DATA_PATH = process.env.DATAPATH || path.join(
        process.env.APPDATA
        || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME)
        || (process.platform == 'linux' ? process.env.HOME + '/.sasalauncher2' : process.env.HOME) as string, '.sasalauncher2')

    private ejse = require('ejs-electron')
    private mainURL: string = `file:${appPath}/app.ejs`

    private mainWindow: BrowserWindow | null = null
    private app: App
    private autoUpdater: AppUpdater
    private ipcMain: IpcMain

    constructor(application: App) {
        if (!fs.existsSync(MainApp.DATA_PATH))
            fs.mkdirSync(MainApp.DATA_PATH)

        this.app = application
        this.autoUpdater = autoUpdater
        this.autoUpdater.autoDownload = false
        this.ipcMain = ipcMain
        this.app.on('ready', this.onReady.bind(this))
        this.app.on('activate', this.onActivated.bind(this))

        this.ipcMain.on('autoUpdateAction', (event, arg, data) => {
            if (isDev)
                return
            switch (arg) {
                case 'initAutoUpdater': {
                    console.log('initializing auto updater')
                    this.initUpdater(event, data)
                    break
                }
                case 'downloadUpdate': {
                    this.autoUpdater.downloadUpdate()
                        .catch(err => {
                            event.sender.send('autoUpdateNotification', 'realerror', err)
                        })
                    break
                }
                case 'checkForUpdate': {
                    this.autoUpdater.checkForUpdates()
                        .catch(err => {
                            event.sender.send('autoUpdateNotification', 'realerror', err)
                        })
                    break
                }
                case 'installUpdateNow': {
                    this.autoUpdater.quitAndInstall()
                    break
                }
            }
        })

        this.ipcMain.handle('getAccounts',()=>{
            return fs.readJSONSync(path.join(MainApp.DATA_PATH,"accounts.json")) || []
        })

        this.ipcMain.handle('getDistribution',()=>{
            return fs.readJSONSync(path.join(MainApp.DATA_PATH,"distribution.json"))
        })

        this.ipcMain.handle('getAuthConfig',()=>{
            return {
                appId:appId,
                appSecret: appSecret,
                redirectURL: redirectURL
            }
        })

        this.ipcMain.handle('getDataPath',()=>{
            return MainApp.DATA_PATH
        })

        this.ipcMain.handle('getDistroLink',()=>{
            return distroLink
        })

        this.ipcMain.on('MicrosoftOAuth',async(event,arg,data)=>{
            const loginWindow = new BrowserWindow({
                width:500,
                height:600
            })
            loginWindow.setMenu(null)
            await this.deleteAllCookies(loginWindow.webContents.session)
            loginWindow.webContents.on('did-navigate', async (event, url) => {
                if (url.startsWith('https://site.sasadd.net/SasaLauncher2/oauth')) {
                    const code = (new URL(url)).searchParams.get("code")
                    await this.deleteAllCookies(loginWindow.webContents.session)
                    loginWindow.close();
                    if(typeof code === 'undefined'){
                        this.mainWindow?.webContents.send('MicrosoftOAuth','FailedAuth')
                        return
                    }
                    this.mainWindow?.webContents.send('MicrosoftOAuth', 'SucceedAuth',code)
                }
            })
            MicrosoftAuth.setup(appId,appSecret,redirectURL)
            loginWindow.loadURL(MicrosoftAuth.createUrl())
        })
    }

    private async deleteAllCookies(session:Session) {
        const cookies = await session.cookies.get({})
        for (const v of cookies) {
            let url = ''
            url += v.secure ? 'https://' : 'http://'
            url += v.domain?.charAt(0) === '.' ? 'www' : ''
            url += v.domain
            url += v.path
            await session.cookies.remove(url, v.name)
        }
    }

    private initUpdater(event: IpcMainInvokeEvent, data: any) {
        if (isDev)
            return
        if (process.platform === 'darwin') {
            this.autoUpdater.autoDownload = false
        }
        this.autoUpdater.on('update-available', (info) => {
            event.sender.send('autoUpdateNotification', 'update-available', info)
        })
        this.autoUpdater.on('update-downloaded', (info) => {
            event.sender.send('autoUpdateNotification', 'update-downloaded', info)
        })
        this.autoUpdater.on('update-not-available', (info) => {
            event.sender.send('autoUpdateNotification', 'update-not-available', info)
        })
        this.autoUpdater.on('checking-for-update', () => {
            event.sender.send('autoUpdateNotification', 'checking-for-update')
        })
        this.autoUpdater.on('error', (err) => {
            event.sender.send('autoUpdateNotification', 'realerror', err)
        })
    }


    private create() {
        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            minWidth: 960,
            minHeight: 720,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                worldSafeExecuteJavaScript: true
            },
            backgroundColor: '#ffffff'
        })

        this.ejse.data('appver', app.getVersion())
        this.ejse.data('appname', app.getName())

        this.mainWindow.loadURL(this.mainURL)

        this.mainWindow.on('closed', () => {
            this.mainWindow = null
        })
    }

    private async onReady() {
        this.create();
    }

    private onActivated() {
        if (this.mainWindow === null) {
            this.create();
        }
    }
}
const mainApp: MainApp = new MainApp(app)