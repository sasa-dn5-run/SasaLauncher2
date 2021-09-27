let package = require("./package.json")
package.version = process.argv[2]
require('fs-extra').writeJSONSync("./package.json", package)