const { remote, shell, ipcRenderer } = require('electron')
const { app, dialog }                = remote
const sleep                          = (v:number) => new Promise(resolve => setTimeout(resolve, v))

let currentAccount:string

const animate = (doc: HTMLElement, css: any, time: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        doc.animate(css, time)
        setTimeout(() => {
            resolve()
        }, time);
    })
}
