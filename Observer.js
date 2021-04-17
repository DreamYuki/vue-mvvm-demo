class Watcher {
  constructor(vm, expr, callback) {
    // 把新值通过cb传出去
    this.vm = vm;
    this.expr = expr;
    this.callback = callback;
    // 先把旧值保存起来
    this.oldVal = this.getOldVal();
  }
  getOldVal() {
    // 把观察者挂载到Dep实例上，关联起来
    Dep.target = this;
    const oldVal = compileUtil.getVal(this.expr, this.vm);
    // 获取旧值后，取消关联，就不会重复添加
    Dep.target = null;
    return oldVal;
  }
  update() {
    // 更新，要取旧值和新值
    const newVal = compileUtil.getVal(this.expr, this.vm);
    if (newVal !== this.oldVal) {
        this.callback(newVal);
    }
  }
}
// 数据依赖器
class Dep {
    constructor() {
        this.subs = [];
    }
    // 收集观察者
    addSub(watcher) {
        this.subs.push(watcher);
    }
    // 通知观察者去更新
    notify() {
        console.log("通知了观察者", this.subs);
        this.subs.forEach(w =>w.update())
    }
}
class Observer {
  constructor(data) {
    this.observer(data);
  }
  observer(data) {
    /**
        {
            person:{
                name:'张三',
                fav: {
                    a: '爱好1',
                    b: '爱好2'
                }
            }
        }
         */
    if (data && typeof data === "object") {
      Object.keys(data).forEach((key) => {
        this.defineReactive(data, key, data[key]);
      });
    }
  }
  defineReactive(obj, key, value) {
    // 递归遍历
    this.observer(value);
    const dep = new Dep();
    // 劫持数据
    Object.defineProperty(obj, key, {
      // 是否可遍历
      enumerable: true,
      // 是否可以更改编写
      configurable: false,
      // 编译之前，初始化的时候
      get() {
        // 订阅数据变化时，往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      // 外界修改数据的时候
      set: (newVal) => {
        // 新值也要劫持
        this.observer(newVal); // 这里的this要指向当前的实例，所以改用箭头函数向上查找
        // 判断新值是否有变化
        if (newVal !== value) {
          value = newVal;
        }
        // 告诉Dep通知变化
        dep.notify();
      },
    });
  }
}