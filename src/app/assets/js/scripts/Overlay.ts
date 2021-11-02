interface listener{
    name:string,
    fun:any
}

class Overlay{
    private overlay:HTMLDivElement
    private app: HTMLDivElement

    private listeners:Array<listener> = []

    constructor(overlay: HTMLDivElement, app: HTMLDivElement){
        this.overlay = overlay
        this.app = app
    }

    public async show(doc: HTMLElement,trueOrFalse?:Boolean){
        this.app.style.filter = "blur(2.5px)"
        this.app.style.pointerEvents = "none"
        await this.animate(this.app, {
            filter: [
                "blur(0px)",
                "blur(2.5px)"
            ]
        }, 100)

        const wrapper = <HTMLDivElement>this.overlay.getElementsByClassName("wrapper")[0]

        wrapper.innerHTML = ""
        wrapper.appendChild(doc)

        if (trueOrFalse) {
            let trueButton = document.createElement('div')
            let falseButton = document.createElement('div')

            trueButton.setAttribute("id", "overlayCloseButton")
            trueButton.setAttribute('onclick', "overlay.close(true,true)")

            falseButton.setAttribute("id", "overlayCloseButton")
            falseButton.setAttribute('onclick', "overlay.close(true,false)")

            trueButton.innerHTML = "<p>OK</p>"
            falseButton.innerHTML = "<p>Cancel</p>"

            wrapper.appendChild(trueButton)
            wrapper.appendChild(falseButton)
        } else {
            let button = document.createElement('div')
            button.setAttribute("id", "overlayCloseButton")
            button.setAttribute('onclick', "overlay.close()")

            button.innerHTML = "<p>close</p>"
            wrapper.appendChild(button)
        }
        

        this.overlay.style.opacity = "1"
        this.overlay.style.display = "block"
        await this.animate(this.overlay, {
            opacity: [0, 1]
        }, 100)
        return
    }

    public async close(trueOrFalse?:Boolean,confirm?:Boolean){
        this.app.style.filter = "blur(0px)"
        this.app.style.pointerEvents = "all"
        await this.animate(this.app, {
            filter: [
                "blur(2.5px)",
                "blur(0px)"
            ]
        }, 100)
        const wrapper = <HTMLDivElement>this.overlay.getElementsByClassName("wrapper")[0]

        this.overlay.style.opacity = "0"
        await this.animate(this.overlay, {
            opacity: [1, 0]
        }, 100)
        this.overlay.style.display = "none"
        wrapper.innerHTML = ""

        if (trueOrFalse) {
            if (confirm) {
                this.emit("close", true)
            } else if (!confirm) {
                this.emit("close", false)
            }
        }
    }

    public change(doc: HTMLElement, trueOrFalse?: Boolean):void{
        const wrapper = <HTMLDivElement>this.overlay.getElementsByClassName("wrapper")[0]
        wrapper.innerHTML = ""
        wrapper.appendChild(doc)

        if (trueOrFalse) {
            let trueButton = document.createElement('div')
            let falseButton = document.createElement('div')

            trueButton.setAttribute("id", "overlayCloseButton")
            trueButton.setAttribute('onclick', "overlay.close(true,true)")

            falseButton.setAttribute("id", "overlayCloseButton")
            falseButton.setAttribute('onclick', "overlay.close(true,false)")

            trueButton.innerHTML = "<p>OK</p>"
            falseButton.innerHTML = "<p>Cancel</p>"

            wrapper.appendChild(trueButton)
            wrapper.appendChild(falseButton)
        } else {
            let button = document.createElement('div')
            button.setAttribute("id", "overlayCloseButton")
            button.setAttribute('onclick', "overlay.close()")

            button.innerHTML = "<p>close</p>"
            wrapper.appendChild(button)
        }
    }

    public async loading() {
        this.app.style.filter = "blur(2.5px)"
        this.app.style.pointerEvents = "none"
        await this.animate(this.app, {
            filter: [
                "blur(0px)",
                "blur(2.5px)"
            ]
        }, 100)

        let doc: HTMLElement = <HTMLElement>document.createElement('div')
        doc.innerHTML = `<div class="loader">Loading...</div>`

        const wrapper = <HTMLDivElement>this.overlay.getElementsByClassName("wrapper")[0]

        wrapper.innerHTML = ""
        wrapper.appendChild(doc)


        this.overlay.style.opacity = "1"
        this.overlay.style.display = "block"
        await this.animate(this.overlay, {
            opacity: [0, 1]
        }, 100)
    }

    public async showProgress(){
        this.app.style.filter = "blur(2.5px)"
        this.app.style.pointerEvents = "none"
        await this.animate(this.app, {
            filter: [
                "blur(0px)",
                "blur(2.5px)"
            ]
        }, 100)

        let doc: HTMLElement = <HTMLElement>document.createElement('div')
        doc.innerHTML = 
        `<h2></h2>
        <progress class="launcherProgress" max="" value="0"></progress>`

        const wrapper = <HTMLDivElement>this.overlay.getElementsByClassName("wrapper")[0]

        wrapper.innerHTML = ""
        wrapper.appendChild(doc)


        this.overlay.style.opacity = "1"
        this.overlay.style.display = "block"
        await this.animate(this.overlay, {
            opacity: [0, 1]
        }, 100)
    }

    public setProgress(titleText:string,value:number,max:number){
        const wrapper: HTMLDivElement = <HTMLDivElement>this.overlay.getElementsByClassName('wrapper')[0]
        const progress:HTMLProgressElement =<HTMLProgressElement>wrapper.getElementsByTagName('progress')[0]
        const title:HTMLHeadElement = <HTMLHeadElement>wrapper.getElementsByTagName('h2')[0]
        if(typeof progress === 'undefined')
            return
        title.innerHTML = titleText
        progress.value = value
        progress.max = max
    }

    public showing():Boolean{
        return this.overlay.style.display !== "none"
    }

    public Error(code:string,msg:string):void{
        let doc:HTMLElement = <HTMLElement>document.createElement('div')
        doc.innerHTML =
        `<h1>Error</h1>
        <h2>${msg}</h2>
        <p>エラーコード : ${code}</p>`
        this.show(doc)
    }

    public question(doc: HTMLElement): Promise<boolean>{
        return new Promise(async(resolve,reject)=>{
            this.show(doc,true)
            this.on("close",(confirm:any)=>{
                resolve(confirm)
            })
        })
    }
    public changeQuestion(doc:HTMLElement):Promise<Boolean>{
        return new Promise((resolve,reject)=>{
            this.change(doc,true)
            this.on("close",(confirm:any)=>{
                resolve(confirm)
            })
        })
    }

    public on(name:"close",fun:any){
        let event:listener = {
            name:name,
            fun:fun
        }
        this.listeners.push(event)
    }

    public removeAllListeners():void{
        this.listeners = []
    }

    private emit(name:string,...args:any){
        const funs = this.listeners.filter((v)=>{return v.name === name})
        for(let v of funs){
            v.fun(...args)
        }
    }
    private animate(doc: HTMLElement, css: Keyframe[] | PropertyIndexedKeyframes, duration: number): Promise<void> {
        return new Promise((resolve, reject) => {
            doc.animate(css, duration)
            .onfinish = () => {
                resolve()
            }
        })
    }
}