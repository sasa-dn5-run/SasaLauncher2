interface Account{
    type:"mojang"|"microsoft",
    username:string,
    uuid:string,
    email?: string,
    password?:string
    refreshToken?:string,
    selected?:boolean
}

export { Account }