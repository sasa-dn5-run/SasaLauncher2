import fs from "fs-extra"
import path from "path"

class Logger{
  private static path:string = ''
  public static setPath(dir:string){
    if(!fs.existsSync(dir)){
      fs.mkdirsSync(dir)
      fs.writeFileSync(path.join(dir,"main.log"),'')
    }
    this.path = path.join(dir, "main.log")
  }
  public static info(msg:string){
    console.log(msg)
    fs.appendFileSync(this.path, `[INFO] ${msg}`)
  }
  public static error(msg:string){
    console.log(msg)
    fs.appendFileSync(this.path,`[ERROR] ${msg}`)
  }
}

export { Logger }