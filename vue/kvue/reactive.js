function defineReactive(obj, key, value) {
    observe(value);
    Object.defineProperty(obj, key, {
        get() {
            console.log('get', key);
            return value;
        },
        set(newValue) {
            if(newValue !== value) {
                console.log('set', key);
                observe(newValue);
                value = newValue;
            }
        }
    });
}

function observe(obj) {
    if(typeof obj !== 'object' || obj === null) return;
    Object.keys(obj).forEach(key => {
        defineReactive(obj, key, obj[key]);
    });
}

function $set(obj, key, value) {
    defineReactive(obj, key, value);
}

const obj = {
    foo: 'foo',
    bar: 'bar',
    des: {
        a: 'a'
    }
};

observe(obj);
obj.foo;
obj.foo = 'foooooooo';
obj.bar;
obj.bar = 'barrrrrrr';
obj.des = {
    a: 'b'
}
obj.des.a