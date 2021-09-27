const header: HTMLDivElement = <HTMLDivElement>document.getElementById('header')
const main :HTMLDivElement = <HTMLDivElement> document.getElementById('main')
const login: HTMLDivElement = <HTMLDivElement> document.getElementById('login')
const launch: HTMLDivElement = <HTMLDivElement>document.getElementById('launch')
const account: HTMLDivElement = <HTMLDivElement>document.getElementById('account')
const setting: HTMLDivElement = <HTMLDivElement>document.getElementById('setting')

const mainChildren:Element[] = Array.from(main.getElementsByClassName('current'))
let currentChild:number = 0

let toggleMain_lock:boolean = false

const overlay = new Overlay(<HTMLDivElement>document.getElementById("overlay"), <HTMLDivElement>document.getElementById("app"))

async function initDom(){
    const accountsData:Array<any> = await ipcRenderer.invoke('getAccounts')
    let landing:string
    if(accountsData.length !== 0){
        landing = 'launch'
        currentChild = 2
    } else {
        landing = 'login'
        currentChild = 1
    }
    const others = Array.from(main.getElementsByClassName('child')).filter(v=>v.id !== landing)
    for(let v of others){
        (<HTMLDivElement>v).style.left = '150%'
    }

    const XmxNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxNumber')[0]
    const XmsNumber: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsNumber')[0]
    const XmxRange: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmxRange')[0]
    const XmsRange: HTMLInputElement = <HTMLInputElement>setting.getElementsByClassName('XmsRange')[0]

    XmxNumber.addEventListener('input',()=>{
        XmxRange.value =  XmxNumber.value
        if (parseFloat(XmxNumber.value) < parseFloat(XmsNumber.value)){
            XmsNumber.value = XmxNumber.value
            XmsRange.value = XmxNumber.value
        }
    })
    XmxRange.addEventListener('input',()=>{
        XmxNumber.value = XmxRange.value
        if(parseFloat(XmxRange.value) < parseFloat(XmsRange.value)){
            XmsRange.value = XmxRange.value
            XmsNumber.value = XmxRange.value
        }
    })
    XmsNumber.addEventListener('input',()=>{
        XmsRange.value = XmsNumber.value
        if (parseFloat(XmxNumber.value) < parseFloat(XmsNumber.value)) {
            XmxNumber.value = XmsNumber.value
            XmxRange.value = XmsNumber.value  
        }
    })
    XmsRange.addEventListener('input',()=>{
        XmsNumber.value = XmsRange.value
        if(parseFloat(XmxRange.value) < parseFloat(XmsRange.value)){
            XmxRange.value = XmsRange.value
            XmxNumber.value = XmsRange.value 
        }
    })
    

    
    await updateServers()
    await updateAccounts()
}

async function updateServers(){
    const distribution = await ipcRenderer.invoke('getDistribution')
    const configs = distribution.servers
    const servers: HTMLDivElement = <HTMLDivElement>launch.getElementsByClassName('servers')[0]
    servers.innerHTML = ''
    for (const v of configs) {
        const server = document.createElement('div')
        let modsHTML = '<p style="color:#325239; margin:0; margin-left:5px;">MOD</p>'
        for (const m of v.mods) {
            const html =
                `<div class="mod">
                <h2>${m.name}</h2>
                <div style="text-align: center;" class="toggle_switch">
                    <input type="checkbox" name="${m.name}" id="${v.id}_${m.name}" style="display: none;">
                    <label class="check" for="${v.id}_${m.name}"></label>
                </div>
            </div>`
            modsHTML += html
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
            </div>`
        server.classList.add('server')
        servers.appendChild(server)
    }
}


async function updateAccounts(){
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
        if(v.selected === true){
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
    const current:HTMLDivElement = <HTMLDivElement>others[currentChild]

    if(typeof current === 'undefined')
        return

    let nextNum:number = currentChild
    let currentAnim
    let nextAmin
    let left:string

    if(direction === 'back'){
        nextNum ++
        currentAnim = {
            left:['50%','150%']
        }
        nextAmin = {
            left:['-50%','50%']
        }
        left = '150%'
    } else {
        nextNum --
        currentAnim = {
            left: ['50%', '-50%']
        }
        nextAmin = {
            left: ['150%', '50%']
        }
        left = '-50%'
    }
    const next = <HTMLDivElement>others[nextNum]

    if(typeof next === 'undefined')
        return

    current.classList.remove('current')

    current.style.left = left
    next.style.left = '50%'
    current.animate(currentAnim,{
        duration:500,
        easing:'ease'
    })
    next.animate(nextAmin, {
        duration:500,
        easing: 'ease'
    })

    currentChild = nextNum
    await sleep(500)

    current.style.animation = ''

    toggleMain_lock = false
}
