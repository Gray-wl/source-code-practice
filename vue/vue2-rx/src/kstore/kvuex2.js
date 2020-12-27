let Vue

class Store {
  constructor(options) {
    this._mutations = options.mutations
    this._actions = options.actions
    this._getters = options.getters
    this.getters = {}
    const store = this
    const computed = {}
    this._getters && Object.keys(this._getters).forEach(key => {
      const fn = store._getters[key]
      computed[key] = function () {
        return fn(store.state)
      }
      Object.defineProperty(store.getters, key, {
        get: () => store._vm[key]
      })
    })

    this._vm = new Vue({
      data: {
        $$state: options.state
      },
      computed
    })

    this.commit = this.commit.bind(this)
    this.dispatch = this.dispatch.bind(this)
  }

  get state() {
    return this._vm._data.$$state
  }

  commit(type, payload) {
    const entry = this._mutations[type]
    if (!entry) {
      console.error('unkown mutation type');
      return;
    }
    entry(this.state, payload)
  }

  dispatch(type, payload) {
    const entry = this._actions[type]
    if (!entry) {
      console.error('unkown actions type');
      return;
    }
    entry(this, payload)
  }
}

function install(_Vue) {
  Vue = _Vue

  Vue.mixin({
    beforeCreate() {
      if (this.$options.store) {
        Vue.prototype.$store = this.$options.store
      }
    }
  })
}

export default { Store, install }