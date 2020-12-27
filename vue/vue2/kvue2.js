function defineReactive(obj, key, val) {
    let childOb = observe(val);
    const dep = new Dep();
    Object.defineProperty(obj, key, {
        get() {
            if(Dep.target) {
                dep.addDep();
                if (childOb) {
                    childOb.dep.addDep();
                    if (Array.isArray(val)) {
                        dependArray(val);
                    }
                }
            }
            return val;
        },
        set(v) {
            if(v !== val) {
                childOb = observe(v);
                val = v;
                dep.notify();
            }
        }
    });
}

function dependArray(value) {
    for (let e, i = 0, l = value.length; i < l; i++) {
        e = value[i];
        e && e.__ob__ && e.__ob__.dep.addDep();
        if (Array.isArray(e)) {
            dependArray(e);
        }
    }
}

function proxy(vm) {
    Object.keys(vm.$data).forEach(key => {
        Object.defineProperty(vm, key, {
           get() {
               return vm.$data[key];
           },
            set(v) {
                vm.$data[key] = v;
            }
        });
    });
}

function array() {
    const arrayProto = Array.prototype;
    const arrayMethods = Object.create(arrayProto);
    const methodsToPatch = [
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'sort',
        'reverse'
    ];
    methodsToPatch.forEach(function (method) {
        const original = arrayProto[method];
        Object.defineProperty(arrayMethods, method, {
            value: function mutator (...args) {
                const result = original.apply(this, args);
                const ob = this.__ob__;
                let inserted
                switch (method) {
                    case 'push':
                    case 'unshift':
                        inserted = args;
                        break
                    case 'splice':
                        inserted = args.slice(2);
                        break
                }
                if (inserted) ob.observeArray(inserted);
                ob.dep.notify();
                return result;
            }
        });
    });
    return arrayMethods;
}

function observe(obj) {
    if(typeof obj !== 'object' || obj === null) return;
    const ob = new Observer(obj);
    return ob;
}

class Observer {
    constructor(value) {
        this.dep = new Dep();
        Object.defineProperty(value, '__ob__', {
            value: this
        });
        if(Array.isArray(value)) {
            const arrayMethods = array();
            const arrayKeys = Object.getOwnPropertyNames(arrayMethods);
            if ('__proto__' in {}) {
                value.__proto__ = arrayMethods;
            } else {
                for (let i = 0, l = arrayKeys.length; i < l; i++) {
                    const key = arrayKeys[i];
                    Object.defineProperty(value, key, {
                        value: arrayMethods[key]
                    });
                }
            }
            this.observeArray(value);
        } else {
            this.work(value);
        }
    }

    observeArray(items) {
        for (let i = 0, l = items.length; i < l; i++) {
            observe(items[i]);
        }
    }

    work(obj) {
        Object.keys(obj).forEach(key => {
            defineReactive(obj, key, obj[key]);
        });
    }
}

// 暗号：first blood
class KVue {
    constructor(options) {
        this.$options = options;
        this.$data = options.data;
        observe(this.$data);
        proxy(this);
        if(this.$options.el) {
            this.$mount(this.$options.el);
        }
    }

    $mount(el) {
        this.$el = document.querySelector(el);
        const updateComponent = () => {
            const { render } = this.$options;
            const vnode = render.call(this, this.$createElement);
            this._update(vnode);
        }
        new Watcher(this, updateComponent);
    }

    $createElement(tag, props, children) {
        return { tag, props, children };
    }

    _update(vnode) {
        const preVnode = this._vnode;
        if(!preVnode) {
            this.__patch__(this.$el, vnode);
        } else {
            this.__patch__(preVnode, vnode);
        }
    }

    __patch__(oldVnode, vnode) {
        if(oldVnode.nodeType) {
            const parent = oldVnode.parentElement;
            const refElm = oldVnode.nextSibling;
            const el = this.createElm(vnode);
            parent.insertBefore(el, refElm);
            parent.removeChild(oldVnode);
            this._vnode = vnode;
        } else {
            this.patchVnode(oldVnode, vnode);
        }
    }

    createElm(vnode) {
        const el = document.createElement(vnode.tag);
        if(vnode.props) {
            Object.keys(vnode.props).forEach(prop => {
                el.setAttribute(prop, vnode.props[prop]);
            });
        }
        if(vnode.children) {
            if(typeof vnode.children === 'string' || typeof vnode.children === 'number') {
                el.textContent = vnode.children;
            } else {
                vnode.children.forEach(n => {
                    const child = this.createElm(n);
                    el.appendChild(child);
                });
            }
        }
        vnode.el = el;
        return el;
    }

    patchVnode(oldVnode, vnode) {
        if (oldVnode === vnode) return;
        const el = vnode.el = oldVnode.el;
        const oldProps = oldVnode.props || {};
        const props = vnode.props || {};
        Object.keys(props).forEach(prop => {
            const oldValue = oldProps[prop];
            const newValue = props[prop];
            if(oldValue !== newValue) {
                el.setAttribute(prop, newValue);
            }
        });
        Object.keys(oldProps).forEach(prop => {
            if(!(prop in props)) {
                el.removeAttribute(prop);
            }
        });
        const oldCh = oldVnode.children;
        const ch = vnode.children;
        if(typeof ch === 'string' || typeof ch === 'number') {
            if(oldCh !== ch) {
                el.textContent = ch;
            }
        } else {
            if(oldCh && ch) {
                if(oldCh !== ch) {
                    this.updateChildren(el, oldCh, ch);
                }
            } else if(ch) {
                if(typeof oldCh === 'string' || typeof oldCh === 'number') {
                    el.textContent = '';
                }
                this.createElm(ch);
            } else if(oldCh) {
                const parent = el.parentNode;
                if(parent) {
                    parent.removeChild(el);
                }
            }
        }
    }

    updateChildren(parentElm, oldCh, newCh) {
        let oldStartIdx = 0;
        let newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        let idxInOld, vnodeToMove;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (!oldStartVnode) {
                oldStartVnode = oldCh[++oldStartIdx];
            } else if (!oldEndVnode) {
                oldEndVnode = oldCh[--oldEndIdx];
            } else if (sameVnode(oldStartVnode, newStartVnode)) {
                this.patchVnode(oldStartVnode, newStartVnode);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            } else if (sameVnode(oldEndVnode, newEndVnode)) {
                this.patchVnode(oldEndVnode, newEndVnode);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldStartVnode, newEndVnode)) {
                this.patchVnode(oldStartVnode, newEndVnode);
                parentElm.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldEndVnode, newStartVnode)) {
                this.patchVnode(oldEndVnode, newStartVnode);
                parentElm.insertBefore(oldEndVnode.el, oldStartVnode.el);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            } else {
                idxInOld = findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
                if (idxInOld) {
                    this.createElm(newStartVnode);
                } else {
                    vnodeToMove = oldCh[idxInOld]
                    if (sameVnode(vnodeToMove, newStartVnode)) {
                        this.patchVnode(vnodeToMove, newStartVnode);
                        oldCh[idxInOld] = undefined;
                        parentElm.insertBefore(vnodeToMove.el, oldStartVnode.el);
                    } else {
                        this.createElm(newStartVnode);
                    }
                }
                newStartVnode = newCh[++newStartIdx];
            }
        }
        if (oldStartIdx > oldEndIdx) {
            for (; newStartIdx <= newEndIdx; ++newStartIdx) {
                this.createElm(newCh[newStartIdx]);
            }
        } else if (newStartIdx > newEndIdx) {
            for (; oldStartIdx <= oldEndIdx; ++oldStartIdx) {
                const ch = oldCh[oldStartIdx];
                if (ch) {
                    const parent = ch.el.parentNode;
                    if (parent) {
                        parent.removeChild(ch.el);
                    }
                }
            }
        }
    }
}

function sameVnode (a, b) {
    return a.tag === b.tag;
}

function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
        const c = oldCh[i];
        if (c && sameVnode(node, c)) return i;
    }
}

class Watcher {
    constructor(vm, fn) {
        this.$vm = vm;
        this.getter = fn;
        this.get();
    }

    get() {
        Dep.target = this;
        this.getter.call(this.$vm);
        Dep.target = null;
    }

    update() {
        this.get();
    }
}

class Dep {
    constructor() {
        this.deps = new Set();
    }

    addDep() {
        Dep.target && this.deps.add(Dep.target);
    }

    notify() {
        this.deps.forEach(watcher => watcher.update());
    }
}