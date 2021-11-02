import fs from "fs-extra"
import path from "path"

export class Logger{
  private static path:string = ''
  private static doc: HTMLDivElement
  public static setup(dir:string, doc:HTMLDivElement){
    if(!fs.existsSync(dir)){
      fs.mkdirsSync(dir)
      fs.writeFileSync(path.join(dir,"main.log"),'')
    }
    this.path = path.join(dir, "main.log")
    this.doc = doc
  }
  public static info(msg:string){
    this.append(`[INFO] ${msg}`)
  }
  public static error(msg:any){
    this.append(`[ERROR] ${msg}`)
  }
  public static debug(msg:string){
    this.append(`[DEBUG] ${msg}`)
  }
  public static append(msg:string){
    console.log(msg)
    fs.appendFileSync(this.path, msg)

    const p = document.createElement("p")
    p.innerHTML = msg
    if(msg.startsWith("[ERROR]")){
      p.style.color = "red"
    }
    this.doc.appendChild(p)
    this.doc.scrollTop = this.doc.scrollHeight
  }
}