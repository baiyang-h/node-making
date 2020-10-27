# 3.commonjs实现

> global（全局变量）中，__dirname、__filename、exports、module、require()这些对象在所有模块中都可用。以上变量看似全局的，但实际上不是，它们仅存在于模块的作用域中。引用 node 官方文档的这段话。是因为这些变量都是外部作为函数的参数传入的，我们在下面将会实现。



内部主要实现是先去读取 a 文件，拿到 a 文件中的内容，进行函数包裹 `module.exports = 'hello'`，
```javascript
function(exports, module, require, __dirname, __filename) {
  module.exports = 'hello'
  return module.exports
}
```
对包裹的函数传入 `_exports_`_, _`_module_`_, _`_require_`_, _`___dirname_`_, _`___filename_` 等参数，然后通过 `vm` 模块来执行。


我们查看node内部的源码主要做了些什么事情：

1. `_Module.prototype.require_`_ ， _`_require_`_ 方法是定义在模块原型上的_
1. `_Module._load_`_ 加载模块_
1. `_Module._resolveFilename_`_ 解析出绝对路径 并且添加后缀_
1. `_new Module_`_ 创建一个模块 （id 文件名， exports 是一个对象，存放的是模块的导出结果 path）_
1. `_module.load_`_ 加载模块_
1. `_Module._extensions_`_ 存放着不同后缀文件的处理_
1. _读取文件 包裹函数 _`_runInThisContext_` _执行 传入模块属性_

_
比如当我们一直调用 require 引用同一个路径时，会重复去导入吗？答案是不会，因为node 内部做了缓存，现在让我们来增加上缓存
```javascript
myReq('./a')
myReq('./a')
myReq('./a')
// 重复引用，使用缓存，不重复去读取

// 用于缓存，防止每次 require 重复加载，如果已经加载过的，可以直接取缓存
Module._cache = {}

function myReq(filename) {
  // 1. 解析当前文件名
  filename = Module._resolveFilename(filename)

  if(Module._cache[filename]) {   // 如果缓存中有，直接使用缓存
    return Module._cache[filename].exports
  }

  // 2. 创建模块 --- 4
  let module = new Module(filename)

  Module._cache[filename] = module  // 将模块缓存起来

  // 3. 加载模块  --- 5
  module.load()   // 调用 load 方法 进行模块的加载

  return module.exports
} 
```


接下来我们来写代码
```javascript
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
  // 这句代码执行后 会对导入文件中内容  module.exports = 'jjjjjkkk' 执行
}
Module._extensions['.json'] = function(module){
  let content = fs.readFileSync(module.id, 'utf8')
  module.exports = JSON.parse(content)   // 手动将json的结果赋予给 module.exports
}

// 3.解析出绝对路径，并且添加后缀。比如 myReq('./a') 这样写可以省略 .js .json
Module._resolveFilename = function(filename) {
  let filePath = path.resolve(__dirname, filename)  // 得到该路径的绝对路径
  let isExists = fs.existsSync(filePath)   					// 判断该路径是否有文件
  if(isExists) return filePath											// 该文件存在直接返回路径

  //检索不到该文件， 例如是 /a/b，因为是没有后缀 ，  尝试添加 .js 和 .json 后缀
  let keys = Reflect.ownKeys(Module._extensions)	
  for(let i=0; i<keys.length; i++) {
    let newFile = filePath + keys[i]  // 尝试增加后缀， 添加好后再去查看是否有该文件
    if(fs.existsSync(newFile)) return newFile   // 有，直接返回文件路径
  }
  throw new Error('module not found')
}

// 内部挂载
Module.prototype.load = function() {
  // 加载时 需要获取当前文件的后缀名， 根据后缀名采用不同的策略进行加载
  // 如 json 文件是直接拿它内部的对象，而 js 文件是拿内部的 module.exports 的值
  let extension = path.extname(this.id)  // 获取文件后缀名
  Module._extensions[extension](this)   // 根据这个规则来进行模块的加载，在内部对this.exports 做了处理
}

function myReq(filename) {
  // 1. 解析当前文件名 路径
  filename = Module._resolveFilename(filename)
  
  if(Module._cache[filename]) {   // 如果缓存中有，直接使用缓存
    return Module._cache[filename].exports
  }

  // 2. 创建模块 --- 4
	// 定义 id=filename、path=文件所在的目录（即 /a/b.js   path就是/a）（当前模块所在的文件夹）
  let module = new Module(filename)

  // module.exports = 'hello'    // 读取文件 加载模块
  
  Module._cache[filename] = module  // 将模块缓存起来

  // 3. 加载模块  --- 5
  module.load()   // 调用 load 方法 进行模块的加载
	
  // 此时 module.exports 的值已经再 module.load 内部进行了处理，所以这里直接能获取了
  return module.exports
} 

let r = myReq('./a')
console.log(r)

// 模块导出不能使用 exports = xxx 错误写法
// 正确写法 exports.a  module.exports.a    module.exports global
```




