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
