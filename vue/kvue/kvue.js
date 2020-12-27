function defineReactive(obj, key, value) {
    observe(value);
    const dep = new Dep();
    Object.defineProperty(obj, key, {
        get() {
            Dep.target && dep.addDeps(Dep.target);
            return value;
        },
        set(newValue) {
            if(newValue !== value) {
                observe(newValue);
                value = newValue;
                dep.notify();
            }
        }
    });
}

function observe(obj) {
    if(typeof obj !== 'object' || obj === null) return;
    new Observe(obj);
}

class Observe {
    constructor(value) {
        if(Array.isArray(value)) {

        } else {
            this.work(value);
        }
    }

    work(obj) {
        Object.keys(obj).forEach(key => {
            defineReactive(obj, key, obj[key]);
        });
    }
}

function proxy(vm) {
    Object.keys(vm.$data).forEach(key => {
        Object.defineProperty(vm, key, {
            get() {
                return vm.$data[key];
            },
            set(value) {
                vm.$data[key] = value;
            }
        });
    });
    Object.keys(vm.$methods).forEach(key => {
        Object.defineProperty(vm, key, {
            get() {
                return vm.$methods[key];
            }
        });
    });
}

class KVue {
    constructor(options) {
        this.$data = options.data;
        this.$methods = options.methods;

        observe(this.$data);

        proxy(this);

        new Compile(options.el, this);
    }
}

class Compile {
    constructor(el, vm) {
        this.$vm = vm;
        this.$el = document.querySelector(el);
        
        if(this.$el) {
            this.compile(this.$el);
        }
    }

    isInter(node) {
        return node.nodeType === 3 && /(.*)\{\{(.*)\}\}(.*)/.test(node.textContent);
    }

    compile(el) {
        const childNodes = el.childNodes;
        childNodes.forEach(node => {
            if(node.nodeType === 1) {
                // 元素
                const attrs = node.attributes;
                Array.from(attrs).forEach(attr => {
                    const attrName = attr.name;
                    const exp = attr.value;
                    if(attrName.startsWith('k-')) {
                        const dir = attrName.substring(2);
                        this[dir] && this[dir](node, exp);
                    } else if(attrName.startsWith('@') || attrName.startsWith('v-on:')) {
                        // 暗号：冬瓜冬瓜我是西瓜
                        const dir = attrName.substring(attrName.startsWith('@') ? 1 : 5);
                        this.eventListener(node, dir, this.methodsFunc(exp));
                    }
                });
            } else if(this.isInter(node)) {
                // 文字
                this.compileText(node);
            }
            if(node.childNodes) {
                this.compile(node);
            }
        });
    }

    //事件处理
    changeExp(obj, exp) {
        let newExp = exp;
        Object.keys(obj).forEach(key => {
            const index = exp.indexOf(key);
            if(index > -1) {
                if(index > 0) {
                    newExp = newExp.substr(0, index) + 'this.$vm.' + newExp.substr(index, newExp.length);
                } else {
                    newExp = `this.$vm.${newExp}`;
                }
            }
        });
        return newExp;
    }

    methodsFunc(exp) {
        return () => {
            if(this.$vm[exp]) {
                this.$vm[exp](event);
            } else {
                let newExp = exp;
                newExp = this.changeExp(this.$vm.$methods, this.changeExp(this.$vm.$data, newExp));
                eval(newExp);
            }
        }
    }

    eventListener(node, dir, fn) {
        fn && node.addEventListener(dir, fn.bind(this.$vm));
    }

    // model: value, @input
    eventInput(exp) {
        return () => {
            this.$vm[exp] = event.target.value;
        }
    }

    model(node, exp) {
        this.inputValue(node, exp);
        this.eventListener(node, 'input', this.eventInput(exp));
    }

    inputValue(node, exp) {
        this.update(node, exp, 'inputValue');
    }

    inputValueUpdater(node, value) {
        node.value = value;
    }

    update(node, exp, dir, otherText) {
        const fn = this[`${dir}Updater`];
        const otherText1 = otherText && otherText.$1 || '';
        const otherText2 = otherText && otherText.$3 || '';
        fn && fn(node, otherText1 + this.$vm[exp] + otherText2);

        new Watcher(this.$vm, exp, (newValue) => fn && fn(node, otherText1 + newValue + otherText2));
    }

    compileText(node) {
        this.update(node, RegExp.$2, 'text', {$1: RegExp.$1, $3: RegExp.$3});
    }

    text(node, exp) {
        this.update(node, exp, 'text');
    }

    textUpdater(node, value) {
        node.textContent = value;
    }

    html(node, exp) {
        this.update(node, exp, 'html');
    }

    htmlUpdater(node, value) {
        node.innerHTML = value;
    }
}

class Watcher {
    constructor(vm, key, updateFn) {
        this.$vm = vm;
        this.$key = key;
        this.$updateFn = updateFn;

        Dep.target = this;
        vm[key];
        Dep.target = null;
    }

    update() {
        this.$updateFn.call(this.$vm, this.$vm[this.$key])
    }
}

class Dep {
    constructor() {
        this.deps = [];
    }

    addDeps(dep) {
        this.deps.push(dep);
    }

    notify() {
        this.deps.forEach(dep => dep.update());
    }
}