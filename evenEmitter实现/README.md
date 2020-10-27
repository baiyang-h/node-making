# 6.EvenEmitter实现

## 基本使用


EvenEmitter 模块nodejs的一个内置核心模块，我们先来进行简单的使用
```javascript
const EventEmitter = require('events')
const util = require('util')

function A() {

}

util.inherits(A, EventEmitter)

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

// 绑定一次
a.once('aaa', () => {
  console.log('只触发一次')
})

a.emit('aaa')
a.emit('aaa')

// type aaa
// type aaa
// type aaa

// 1
// 2
// 只触发一次

const fn = () => {
  console.log('fn')
}
a.on('bbb', fn)
a.off('bbb', fn)   // 删除 bbb 中绑定的 fn 了
a.emit('bbb')
// 无， 因为off了
```
其中涉及到一个继承的问题，在ES6中我们可以使用以下方法来进行继承：

1. `_Object.create()_`
1. `_A.prototype.__proto__ = EventEmitter.prototype_`
1. `_Object.setPrototypeof_`
1. `_extends_`_ 继承_
```javascript
// A.prototype = Object.create(EventEmitter.prototype)
// A.prototype.__proto__ = EventEmitter.prototype
// Object.setPrototypeOf(A.prototype, EventEmitter.prototype)
```
我们暂时不用上面的方法，因为 node 中，直接有提供给我们一个继承的方法，所以我们直接使用 node 中的工具方法。
```javascript
util.inherits(A, EventEmitter)  // 内部源码就是 Object.setPrototypeOf
```
这样 A 的实例就继承了 `EventEmitter.prototype`


## 源码实现


首先简单实现基础结构
```javascript
function EventEmitter() {
  this._events = {}
}

// 订阅
EventEmitter.prototype.on = function(eventName, callback) {
  if(this._events[eventName]) {  // 如果有的话放进去
    this._events[eventName].push(callback)
  } else {   // 如果没有的话则创建一个
    this._events[eventName] = [callback]
  }
}

// 发布
EventEmitter.prototype.emit = function(eventName, ...args) {

  if(!this._events) return

  if(this._events[eventName]) {
    this._events[eventName].forEach(fn => fn(...args))
  }
}

// 删除
EventEmitter.prototype.off = function(eventName, callback) {
  // 去 eventName的值 数组中 删除函数

  if(!this._events) return
  
  // this._events[eventName] = this._events[eventName].filter(fn => fn !== callback)
  this._events[eventName] = this._events[eventName].filter(fn => fn !== callback)
}

module.exports = EventEmitter

```
以上就是简单的发布订阅的实现。现在问题来了


- 问题1：如果 A 继承了 EventEmitter ，但是 A 的实例对象调用 a.on 时，a 内部没有 `_events`， 这就导致了调用方法错误，因为此时 this 表示 a 对象，此时我们就对实例做处理，如果内部没有 `_events` 的话，就创建 `_events`
```javascript
// 订阅
EventEmitter.prototype.on = function(eventName, callback) {

  // 如果实例内部没有_events 那么就给你创建一个 _events 对象。 主要是用于继承了 EventEmitter 的子类创建的实例
  // 因为这些实例如果调用 on ，内部没有 _events ，下面直接运行会报错，所以加上下面这句话
+  if(!this._events) {
+    this._events = Object.create(null)
+  }

  if(this._events[eventName]) {  // 如果有的话放进去
    this._events[eventName].push(callback)
  } else {   // 如果没有的话则创建一个
    this._events[eventName] = [callback]
  }
}
```
现在我们先来写 once 方法，然后引出他存在的问题
```javascript
// 绑定一次
EventEmitter.prototype.once = function(eventName, callback) {
  // 切片编程  批处理
  const once = (...args) => {
    callback(...args)
    // 当绑定后将自己移除掉
    this.off(eventName, once)
  }
  this.on(eventName, once)
}

a.once('ccc', fn)
a.off('ccc', fn)
a.emit('ccc')   // 还是触发了一次 fn， 没有删除
```
问题2：因为只执行一次的原因，所以我们要在绑定好，然后执行一次后，马上移除。所以我们内部就创建一个函数，在每次触发后就将该函数移除。但是这里有一个问题，比如我 `a.off('ccc', fn)` 移除的是 `fn` 函数，但是 `EventEmitter.prototype.once` 内部绑定的是内部的 once 方法，所以 `a.off('ccc', fn)` 没有移除内部的 `once`。所以我们现在在内部增加一个标识，然后在执行 `EventEmitter.prototype.off` 时，当判断到标识时，进行移除。
```javascript
// 绑定一次
EventEmitter.prototype.once = function(eventName, callback) {
  // 切片编程  批处理
  const once = (...args) => {
    callback(...args)
    // 当绑定后将自己移除掉
    this.off(eventName, once)
  }
+  once.l = callback    // 用来标识这个 once 是谁的
  this.on(eventName, once)
}
```
```javascript
// 删除
EventEmitter.prototype.off = function(eventName, callback) {
  // 去 eventName的值 数组中 删除函数

  if(!this._events) return
  
-  // this._events[eventName] = this._events[eventName].filter(fn => fn !== callback)
+  this._events[eventName] = this._events[eventName].filter(fn => fn !== callback && fn.l !== callback)
}
```
增加 `fn !== callback && fn.l !== callback` 才是不会被移除，其他的都是被移除。


现在我们在增加上监听事件 `newListener` ，当每次绑定事件时，都会触发该方法，我们在 `EventEmitter.prototype.on` 中增加判断，对 `eventName` 不是 `newListener` 的事件，当绑定了就会去触发 `newListener` 事件。
```javascript
// 订阅
EventEmitter.prototype.on = function(eventName, callback) {

  ......
  
  // 当前绑定的事件 不是 newListener 事件就触发 newListener 事件
  if(eventName !== 'newListener') {
    this.emit('newListener', eventName)
  }

  ......
}

```


## 整体代码


```javascript
function EventEmitter() {
  this._events = {}
}

// 订阅
EventEmitter.prototype.on = function(eventName, callback) {

  // 如果实例内部没有_events 那么就给你创建一个 _events 对象。 主要是用于继承了 EventEmitter 的子类创建的实例
  // 因为这些实例如果调用 on ，内部没有 _events ，下面直接运行会报错，所以加上下面这句话
  if(!this._events) {
    this._events = Object.create(null)
  }

  // 当前绑定的事件 不是 newListener 事件就触发 newListener 事件
  if(eventName !== 'newListener') {
    this.emit('newListener', eventName)
  }

  if(this._events[eventName]) {  // 如果有的话放进去
    this._events[eventName].push(callback)
  } else {   // 如果没有的话则创建一个
    this._events[eventName] = [callback]
  }
}

// 绑定一次
EventEmitter.prototype.once = function(eventName, callback) {
  // 切片编程  批处理
  const once = (...args) => {
    callback(...args)
    // 当绑定后将自己移除掉
    this.off(eventName, once)
  }
  once.l = callback    // 用来标识这个 once 是谁的
  this.on(eventName, once)
}

// 发布
EventEmitter.prototype.emit = function(eventName, ...args) {

  if(!this._events) return

  if(this._events[eventName]) {
    this._events[eventName].forEach(fn => fn(...args))
  }
}

// 删除
EventEmitter.prototype.off = function(eventName, callback) {
  // 去 eventName的值 数组中 删除函数

  if(!this._events) return
  
  // this._events[eventName] = this._events[eventName].filter(fn => fn !== callback)
  this._events[eventName] = this._events[eventName].filter(fn => fn !== callback && fn.l !== callback)
}


module.exports = EventEmitter
```
