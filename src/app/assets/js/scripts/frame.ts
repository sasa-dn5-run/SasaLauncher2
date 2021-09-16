const appclosebutton: HTMLInputElement    = <HTMLInputElement>document.getElementById('appclosebutton')
const apphidebutton: HTMLInputElement     = <HTMLInputElement>document.getElementById('apphidebutton')
const appmaximizebutton: HTMLInputElement = <HTMLInputElement>document.getElementById('appmaximizebutton')

appclosebutton.addEventListener('click',function(){
    const window         = remote.getCurrentWindow()
    window.close()
})
apphidebutton.addEventListener('click',function(){
    const window         = remote.getCurrentWindow()
    window.minimize()
})
appmaximizebutton.addEventListener('click',function(){
    const window         = remote.getCurrentWindow()
    if (window.isMaximized()) {
        window.unmaximize()
    } else {
        window.maximize()
    }
})
