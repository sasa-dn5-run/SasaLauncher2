import { IpcRenderer } from "electron"
import { AuthenticationError, MicrosoftAccount, MicrosoftAuth, MojangAccount } from "minecraft-auth"
import { IUser } from "minecraft-launcher-core"
import { LauncherError } from "./Launcher"

import { Logger }from "./Logger"

interface AuthConfig {
    appId:string,
    appSecret:string,
    redirectURL:string
}

class Auth{
    public static authConfig: AuthConfig

    
    /**
     * MicrosoftOauthのセットアップ
     * @param ipcRenderer electron の ipcRenderer
     */
    static async setup(ipcRenderer:IpcRenderer){
        this.authConfig = await ipcRenderer.invoke('getAuthConfig')
        MicrosoftAuth.setup(this.authConfig.appId, this.authConfig.appSecret, this.authConfig.redirectURL)
    }


    /**
     * Mojangアカウントの認証
     * @param email Mojangアカウントのメールアドレス
     * @param password Mojangアカウントのパスワード
     * @returns アカウントのプロファイル
     */
    static mojangAuth(email:string,password:string):Promise<IUser>{
        return new Promise((resolve,reject)=>{
            const account = new MojangAccount()
            account.Login(email, password)
            .then(async()=>{
                const profile = await account.getProfile()
                const userProfile:IUser = {
                    access_token: account.accessToken,
                    client_token: account.clientToken,
                    uuid: profile.id,
                    name: profile.name,
                    user_properties:[]
                }
                resolve(userProfile)
            })
            .catch(error=>{
                const Aerorr = <AuthenticationError>error
                reject(new LauncherError(Aerorr.name, 'A:001', Aerorr.message))
            })
        })
    }


    /**
     * Microsoftアカウントの認証
     * @param code MicrosoftOauthのCode
     * @returns アカウントのプロファイル
     */
    static microsoftAuth(code:string):Promise<IUser>{
        return new Promise(async(resolve,reject)=>{
            const account = new MicrosoftAccount()
            account.authFlow(code)
            .then(async()=>{
                const profile = await account.getProfile()
                const userProfile: IUser = {
                    access_token: account.accessToken,
                    client_token: account.refreshToken,
                    uuid: profile.id,
                    name: profile.name,
                    user_properties:[]
                }
                resolve(userProfile)
            })
            .catch(error=>{
                if (error === 2148916238)
                    reject(new LauncherError('AccountException', 'A:101', 'お使いのアカウントは18歳未満です。<br>大人がアカウントをファミリーに追加しない限り続行できません。'))
                const Aerorr = <AuthenticationError>error
                reject(new LauncherError(Aerorr.name, 'A:002', Aerorr.message))
            })

        })
    }


    /**
     * Mojangアカウントのリフレッシュ
     * @param client_token MojangアカウントのClientToken
     * @returns アカウントのプロファイル
     */
    static refreshMojangAuth(client_token: string): Promise<IUser> {
        return new Promise(async (resolve, reject) => {
            const account = new MojangAccount()
            account.clientToken = client_token
            await account.refresh()
            .then(async () => {
                const profile = await account.getProfile()
                const userProfile: IUser = {
                    access_token: account.accessToken,
                    client_token: account.clientToken,
                    uuid: profile.id,
                    name: profile.name,
                    user_properties: []
                }
                resolve(userProfile)
            })
            .catch(error => {
                const Aerorr = <AuthenticationError>error
                reject(new LauncherError(Aerorr.name,'A:001',Aerorr.message))
            })
        })
    }


    /**
     * Microsoftアカウントのリフレッシュ
     * @param refleshToken MicrosoftOauthのRefreshToken
     * @returns アカウントのプロファイル
     */
    static refreshMicrosoftAuth(refleshToken: string): Promise<IUser>{
        return new Promise(async(resolve,reject)=>{
            const account = new MicrosoftAccount()
            account.refreshToken = refleshToken
            account.refresh()
            .then(async()=>{
                const profile = await account.getProfile()
                const userProfile: IUser = {
                    access_token: account.accessToken,
                    client_token: account.refreshToken,
                    uuid: profile.id,
                    name: profile.name,
                    user_properties:[]
                }
                resolve(userProfile)
            })
            .catch(error=>{
                const Aerorr = <AuthenticationError>error
                reject(new LauncherError(Aerorr.name, 'A:002', Aerorr.message))
            })
            
        })
    }
}

export { Auth }