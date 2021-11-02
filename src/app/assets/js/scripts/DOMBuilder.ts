import fs from "fs-extra"
import path from "path"

import { ConfigurationManager } from "../ConfigurationManager";
import { Account } from "../model/account";
import { ServerOption } from "../model/Distribution";

export class DOMBuilder {

    //
    //サーバー関連のDOM
    //

    /**
     * 
     * @param v サーバーオプション
     * @returns 
     */
    public buildServer(v: ServerOption) {
        const modBuilder = new this.ModBuilder()
        const server = document.createElement('div')
        server.classList.add('server')
        const normalModList = v.mods.filter(v2 => v2.level !== 'require')
        const requireModList = v.mods.filter(v2 => v2.level === 'require')
        let Mods = modBuilder.buildOptionalMods(v.id, normalModList)
        let requireMods = modBuilder.buildRequireMods(v.id, requireModList)
        let additionalMods = modBuilder.buildAdditionalMods(v.id, v.mods)
        server.innerHTML =
            `<div class="wrapper ${v.id}">
                <div class="info">
                    <h1 class="title">${v.name}</h1>
                    <p class="version">${v.option.version.number}</p>
                    <p class="description">${v.description}</p>
                </div>
                <p class="material-icons launchButton" onclick="launchMinecraft('${v.id}')">play_circle_filled</p>
                <div class="mods">
                    ${Mods}
                </div>
                <div class="mods">
                    ${requireMods}
                </div>
                <div class="mods">
                    ${additionalMods}
                </div>
                <div class="addAdditionalMod">
                    <h2>MODを追加する</h2>
                    <p class="material-icons" onclick="addAdditionalMod('${v.id}')">note_add</p>
                </div>
            </div>`
        return server
    }

    public ModBuilder = class {
        public buildOptionalMods(id: string, mods: ServerOption['mods']) {
            if (mods.length === 0)
                return ''
            let inner = '<p style="color:#325239; margin:0; margin-left:5px;">Optional Mods</p>'
            for (const m of mods) {
                const html = this.buildOptionalMod(id, m.name)
                inner += html
            }
            return inner
        }
        public buildOptionalMod(id: string, name: string) {
            return `<div class="mod ${id}_${name}">
                <h2>${name}</h2>
                <div style="text-align: center;" class="toggle_switch">
                    <input type="checkbox" name="${name}" id="${id}_${name}" style="display: none;">
                    <label class="check" for="${id}_${name}"></label>
                </div>
            </div>`
        }
        public buildRequireMods(id: string, mods: ServerOption['mods']) {
            if (mods.length === 0)
                return ''
            const config = ConfigurationManager.getConfig()
            let inner = '<p style="color:#325239; margin:0; margin-left:5px;">Require Mods</p>'
            for (const m of mods) {
                const html = this.buildRequireMod(id, m.name)
                inner += html
            }
            return inner
        }
        public buildRequireMod(id: string, name: string) {
            return `<div class="mod ${id}_${name}">
                <h2>${name}</h2>
                <div></div>
            </div>`
        }
        public buildAdditionalMods(id: string, mods: ServerOption['mods']) {
            const config = ConfigurationManager.getConfig()
            let inner = '<p style="color:#325239; margin:0; margin-left:5px;">Additional Mods</p>'
            if (fs.existsSync(path.join(config.MinecraftDataFolder, 'servers', id, 'mods'))) {
                for (const m of fs.readdirSync(path.join(config.MinecraftDataFolder, 'servers', id, 'mods'))) {
                    const name = m.replace('.disabled', '')
                    if (mods.filter(v2 => v2.name === name).length !== 0)
                        continue
                    const html = this.buildAdditionalMod(id, name)
                    inner += html
                }
            }
            return inner
        }
        public buildAdditionalMod(id: string, name: string) {
            return `<div class="mod ${id}_${name}">
                <h2>${name}</h2>
                <div class="buttons">
                    <p class="material-icons modDeleteButton" onclick="removeAdditionalMod('${id}', '${name}')">delete</p>
                    <div style="text-align: center;" class="toggle_switch">
                        <input type="checkbox" name="${name}" id="${id}_${name}" style="display: none;">
                        <label class="check" for="${id}_${name}"></label>
                    </div>
                </div>
            </div>`
        }
    }
    

    //
    // アカウント関連のDOM
    //
    public buildAccount(account:Account){
        const accountDiv = document.createElement('div')
        accountDiv.classList.add('account')
        accountDiv.innerHTML =
            `<div class="info">
                <img src="https://mcskin.sasadd.net/uuid/face/${account.uuid}?size=100" alt="">
                <div>
                    <p>username</p>
                    <h1>${account.username}</h1>
                    <p>uuid</p>
                    <h2>${account.uuid}</h2>
                </div>
            </div>
            <div class="control">
                <div class="button white" onclick="selectUser('${account.uuid}')"><p>選択</p></div>
                <div class="button white" onclick="logoutUser('${account.uuid}')"><p>ログアウト</p></div>
            </div>`
        return accountDiv
    }

    public appendLog(doc: HTMLDivElement, log: string){
        const p = document.createElement('p')
        p.innerHTML = log
        doc.appendChild(p)
    }
}