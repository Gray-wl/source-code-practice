function defineReactive(obj, key, value) {
  observe(value)

  const dep = new Dep()
  Object.defineProperty(obj, key, {
    get: () => {
      Dep.target && dep.addDep(Dep.target)
      return value
    },
    set: v => {
      if (v !== value) {
        observe(v)
        value = v
        dep.notify()
      }
    }
  })
}

function observe(obj) {
  if (typeof obj !== 'object' || obj === null) return
  new Observer(obj)
}

class Observer {
  constructor(obj) {
    if (Array.isArray(obj)) {
      const arrayPrototype = Array.prototype
      const objPrototype = Object.create(arrayPrototype)
        ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(key => {
        objPrototype[key] = function () {
          arrayPrototype[key].apply(this, arguments)
          // 更新
        }
      })
      obj.__proto__ = objPrototype
      for (let i = 0; i < obj.length; i++) {
        observe(obj[i])
      }
    } else {
      this.walk(obj)
    }
  }

  walk(obj) {
    Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))
  }
}

function proxy(vm) {
  Object.keys(vm.$data).forEach(key => {
    Object.defineProperty(vm, key, {
      get: () => vm.$data[key],
      set: v => {
        vm.$data[key] = v
      }
    })
  })
  Object.keys(vm.$methods).forEach(key => {
    Object.defineProperty(vm, key, {
      get: () => vm.$methods[key]
    })
  })
}

class KVue {
  constructor(options) {
    this.$data = options.data
    this.$methods = options.methods

    observe(this.$data)
    proxy(this)

    new Compile(options.el, this)
  }
}

class Compile {
  constructor(el, vm) {
    this.$el = document.querySelector(el)
    this.$vm = vm

    this.$el && this.compile()
  }

  isInter(node) {
    return node.nodeType === 3 && /(.*)\{\{(.*)\}\}(.*)/.test(node.textContent)
  }

  compile(node) {
    const childNodes = node || this.$el.childNodes
    childNodes.forEach(node => {
      if (node.nodeType === 1) {
        const attrs = node.attributes
        Array.from(attrs).forEach(attr => {
          const attrName = attr.name
          const exp = attr.value
          if (attrName.startsWith('k-')) {
            const dir = attrName.substring(2)
            this[dir] && this[dir](node, exp)
          }
        })
      } else if (this.isInter(node)) {
        this.compileText(node)
      }

      if (node.childNodes) {
        this.compile(node.childNodes)
      }
    })
  }

  update(node, exp, dir, otherText) {
    const fn = this[`${dir}Updater`]
    const otherText1 = otherText && otherText.$1 || ''
    const otherText2 = otherText && otherText.$3 || ''
    fn && fn(node, otherText1 + this.$vm[exp] + otherText2)

    new Watcher(this.$vm, exp, (newValue) => fn(node, otherText1 + newValue + otherText2))
  }

  compileText(node) {
    this.update(node, RegExp.$2, 'text')
  }

  textUpdater(node, value) {
    node.textContent = value
  }

  html(node, exp) {
    this.update(node, exp, 'html')
  }

  htmlUpdater(node, value) {
    node.innerHTML = value
  }

  model(node, exp) {
    this.update(node, exp, 'input')

    node.addEventListener('input', () => {
      this.$vm[exp] = event.target.value
    })
  }

  inputUpdater(node, value) {
    node.value = value
  }
}

class Watcher {
  constructor(vm, key, updateFn) {
    this.$vm = vm
    this.$key = key
    this.$updateFn = updateFn

    Dep.target = this
    vm[key]
    Dep.target = null
  }

  update() {
    this.$updateFn.call(this.$vm, this.$vm[this.$key])
  }
}

class Dep {
  constructor() {
    this.deps = []
  }

  addDep(dep) {
    this.deps.push(dep)
  }

  notify() {
    this.deps.forEach(dep => dep.update())
  }
}