// 如果同时存在 a.js 和 a.json 优先级
const path = require('path')
const fs = require('fs')
const vm = require('vm')

function Module(filename) {
  this.id = filename; // 文件名
  this.exports = {}   // 代表导出的结果
  this.path = path.dirname(filename)  // 当前模块所在的文件夹（父目录）
}

// 用于缓存，防止每次 require 重复加载，如果已经加载过的，可以直接取缓存
Module._cache = {}

// 策略模式
Module._extensions = {}
Module.wrapper = content => {
  return `(function(exports, require, module, __filename, __dirname){${content}})`
}
Module._extensions['.js'] = function(module){
  let content = fs.readFileSync(module.id, 'utf8')

  // 根据内容包裹一个函数
  let str = Module.wrapper(content)   // 目前只是字符串
  let fn = vm.runInThisContext(str)
  let exports = module.exports   // module.exports  === exports  注意
  // 模块中的this 是module.exports， 这是规定好的
  fn.call(exports, exports, myReq, module, module.id, module.path)  // exports, require, module, __filename, __dirname
  // 这句代码执行后 会做 module.exports = 'jjjjjkkk'
}
Module._extensions['.json'] = function(module){
  let content = fs.readFileSync(module.id, 'utf8')
  module.exports = JSON.parse(content)   // 手动将json的结果赋予给 module.exports
}

// 3.解析出绝对路径，并且添加后缀。比如 myReq('./a') 这样写可以省略 .js .json
Module._resolveFilename = function(filename) {
  let filePath = path.resolve(__dirname, filename)
  let isExists = fs.existsSync(filePath)
  if(isExists) return filePath

  // 尝试添加 .js 和 .json 后缀
  let keys = Reflect.ownKeys(Module._extensions)
  for(let i=0; i<keys.length; i++) {
    let newFile = filePath + keys[i]  // 尝试增加后缀
    if(fs.existsSync(newFile)) return newFile
  }
  throw new Error('module not found')
}

// 内部挂载
Module.prototype.load = function() {
  // 加载时 需要获取当前文件的后缀名， 根据后缀名采用不同的策略进行加载
  // 如 json 文件是直接拿它内部的对象，而 js 文件是拿内部的 module.exports 的值
  let extension = path.extname(this.id)  
  Module._extensions[extension](this)   // 根据这个规则来进行模块的加载
}

function myReq(filename) {
  // 1. 解析当前文件名
  filename = Module._resolveFilename(filename)

  if(Module._cache[filename]) {
    return Module._cache[filename].exports
  }

  // 2. 创建模块 --- 4
  let module = new Module(filename)

  // module.exports = 'hello'    // 读取文件 加载模块

  Module._cache[filename] = module  // 将模块缓存起来

  // 3. 加载模块  --- 5
  module.load()   // 调用 load 方法 进行模块的加载

  return module.exports
} 

let r = myReq('./a')
console.log(r)

// 模块导出不能使用 exports = xxx 错误写法
// 正确写法 exports.a  module.exports.a    module.exports global






// require中可以存放 相对路径 或者 绝对路径 可以省略 .js、.json 后缀的文件
// webpack 的模块化思路机制是一样的
// 1. 先去读取a文件，拿到a文件中的内容 进行函数包裹 module.exports = 'hello'

/*
function(exports, module, require, __dirname, __filename) {
  module.exports = 'hello'
  return module.exports
}
2. 让函数执行 传入 使用 vm 让函数执行 exports, module, require, __dirname, __filename
*/

// 代码调试如何做到 可以直接 node --inspect-brk 文件名 实现调试功能 借助浏览器来调试

// vscode 调试 nodejs 调试源码 必须创建一个 json 文件，默认要取消 internal_files 否则无法调试源码  跳到下一个断点 单步跳过（不进入方法） 进入方法中 离开方法

/*
1. Module.prototype.require   require 方法是定义在模块原型上的
2. Module._load 加载模块
3. Module._resolveFilename 解析出绝对路径 并且添加后缀
4. new Module 创建一个模块 （id 文件名， exports 是一个对象，存放的是模块的导出结果 path）
5. module.load 加载模块
6. Module._extensions 存放着不同后缀文件的处理
7. 读取文件 包裹函数 runInThisContext执行 传入模块属性
*/