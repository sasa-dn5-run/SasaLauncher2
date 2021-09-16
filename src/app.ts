import { app, App, AutoUpdater, BrowserWindow, IpcMain, ipcMain, IpcMainEvent, IpcMainInvokeEvent, Menu, Tray } from 'electron'
import { autoUpdater, AppUpdater } from 'electron-updater'
import path from 'path'
import fs from "fs-extra"

const appPath = path.join(__dirname, 'app')
const isDev = fs.existsSync("../../isDev.js")

const sysRoot = process.env.APPDATA
    || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME)
    || (process.platform == 'linux' ? process.env.HOME + '/.craftpanel' : process.env.HOME)
const datapath = process.env.DATAPATH || path.join(<string>sysRoot, '.craftpanel')
if (!fs.existsSync(datapath))
    fs.mkdirsSync(datapath)

process.traceProcessWarnings = true
class MainApp {
    private ejse = require('ejs-electron')
    private mainURL: string = `file:/${appPath}/app.ejs`

    private mainWindow: BrowserWindow | null = null
    private app: App
    private autoUpdater: AppUpdater
    private ipcMain: IpcMain

    constructor(application: App) {
        this.app = application
        this.autoUpdater = autoUpdater
        this.autoUpdater.autoDownload = false
        this.ipcMain = ipcMain
        this.app.on('ready', this.onReady.bind(this))
        this.app.on('activate', this.onActivated.bind(this))

        this.ipcMain.on("autoUpdateAction", (event, arg, data) => {
            if (isDev)
                return
            switch (arg) {
                case "initAutoUpdater": {
                    console.log("initializing auto updater")
                    this.initUpdater(event, data)
                    break
                }
                case "downloadUpdate": {
                    this.autoUpdater.downloadUpdate()
                        .catch(err => {
                            event.sender.send('autoUpdateNotification', 'realerror', err)
                        })
                    break
                }
                case "checkForUpdate": {
                    this.autoUpdater.checkForUpdates()
                        .catch(err => {
                            event.sender.send('autoUpdateNotification', 'realerror', err)
                        })
                    break
                }
                case "installUpdateNow": {
                    this.autoUpdater.quitAndInstall()
                    break
                }
            }
        })
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


    // private createTrayIcon() {
    //     let imgFilePath = path.join(__dirname, 'app/tray/icon.png')
    //     const contextMenu = Menu.buildFromTemplate([
    //         {
    //             label: '終了',
    //             click: this.quitApp.bind(this)
    //         }
    //     ])
    //     this.tray = new Tray(imgFilePath)
    //     this.tray.setToolTip(app.name)
    //     this.tray.setContextMenu(contextMenu)
    //     this.tray.on("double-click", () => {
    //         this.mainWindow?.show()
    //         this.mainWindow?.setSkipTaskbar(false)
    //     })
    // }


    private create() {
        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
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

        if (!isDev)
            this.mainWindow.removeMenu()
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