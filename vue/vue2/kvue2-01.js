function defineReactive(obj, key, value) {
  Object.defineProperty(obj, key, {
    get: () => {
      return value
    },
    set: v => {
      if (v !== value) {
        value = v
      }
    }
  })
}

function array() {
  const arrayProto = Array.prototype
  const arrayMethods = Object.create(arrayProto)
  const methodsToPatch = ['push', 'pop', 'shift', 'unshift', 'sort', 'splice', 'reverse']
  methodsToPatch.forEach(method => {
    const original = arrayProto[method]
    Object.defineProperty(arrayMethods, method, {
      value: function mutator(...args) {
        const result = original.apply(this, args)
        const ob = this.__ob__
        let inserted
        switch (method) {
          case 'push':
          case 'unshift':
            inserted = args
            break
          case 'splice':
            inserted = args.slice(2)
            break
        }
        if (inserted) ob.observeArray(inserted)
        ob.dep.notify()
        return result
      }
    })
  })
  return arrayMethods
}

function observe(obj) {
  if (typeof obj !== 'object' || obj === null) return
  const ob = new Observer(obj)
  return ob
}

class Observer {
  constructor(obj) {
    this.dep = new Dep()
    Object.defineProperty(obj, '__ob__', {
      value: this
    })
    if (Array.isArray(obj)) {
      const arrayMethods = array()
      const arrayKeys = Object.getOwnPropertyNames(arrayMethods)
      if ('__proto__' in {}) {
        obj.__proto__ = arrayMethods
      } else {
        for (let i = 0, l = arrayKeys.length; i < l; i++) {
          const key = arrayKeys[i]
          Object.defineProperty(obj, key, {
            value: arrayMethods[key]
          });
        }
      }
      this.observeArray(obj)
    } else {
      this.walk(obj)
    }
  }

  observeArray(obj) {
    for (let i = 0, len = obj.length; i < len; i++) {
      observe(obj[i])
    }
  }

  walk(obj) {
    Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))
  }
}

class KVue {
  constructor(options) {
    
  }
}

class Watcher {
  constructor(vm, fn) {
    this.$vm = vm
    this.getter = fn
  }

  get() {
    Dep.target = this
    this.getter.call(this.$vm)
    Dep.target = null
  }

  update() {
    this.get()
  }
}

class Dep {
  constructor() {
    this.deps = []
  }

  addDep() {
    Dep.target && this.deps.push(Dep.target)
  }

  notify() {
    this.deps.forEach(dep => dep.update())
  }
}