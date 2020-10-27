// node 是基于事件的，内部自己实现了一个发布订阅模式

// const EventEmitter = require('events')  // 内置模块 核心
const EventEmitter = require('./_events')  // 内置模块 核心
const util = require('util')

function A() {

}

// 是让一个类继承 EventEmitter 原型上的方法
/**
 * 继承可以用一下方法
 * 1. Object.create()
 * 2. A.prototype.__proto__ = EventEmitter.prototype
 * 3. Object.setPrototypeof
 * 4. extends 继承
 */

// A.prototype = Object.create(EventEmitter.prototype)
// A.prototype.__proto__ = EventEmitter.prototype
// Object.setPrototypeOf(A.prototype, EventEmitter.prototype)

// 我们暂时不用上面的方法，因为 node 中，直接有提供给我们一个继承的方法，所以我们直接使用 node 中的工具方法

// 子类原型 继承 EventEmitter.prototype 原型对象
util.inherits(A, EventEmitter)  // 内部源码就是 Object.setPrototypeOf

let a = new A()

// 用来监听用户绑定了哪些事件，每次绑定了事件就会触发，on、once
a.on('newListener', (type) => {  
  console.log('type', type)
})

// {'aaa': [fn1, fn2]}
a.on('aaa', () => {
  console.log(1)
})

a.on('aaa', () => {
  console.log(2)
})

a.once('aaa', () => {
  console.log('只触发一次')
})

a.emit('aaa')
a.emit('aaa')

const fn = () => {
  console.log('fn')
}
a.on('bbb', fn)
a.off('bbb', fn)   // 删除 bbb 中绑定的 fn 了
a.emit('bbb')

const fn1 = () => {
  console.log('fn1')
}
a.once('ccc', fn1)
a.off('ccc', fn1)   // 删除 bbb 中绑定的 fn 了
a.emit('ccc')