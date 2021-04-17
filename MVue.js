const compileUtil = {
  getVal(expr, vm) {
    return expr.split(".").reduce((data, currentVal) => {
      return data[currentVal];
    }, vm.$data);
  },
  setVal(expr, vm, inputVal) {
    return expr.split(".").reduce((data, currentVal) => {
      data[currentVal] = inputVal; // 把当前新值复制给旧值
    }, vm.$data);
  },
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm);
    });
  },
  text(node, expr, vm) {
    // expr:msg: "学习MVVM框架原理"
    // 对传入不同的字符串不同操作 <div v-text="person.name"></div>
    // {{}}
    let value;
    if (expr.indexOf('{{') !== -1) {
        // {{person.name}} -- {{person.age}}
        value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            new Watcher(vm, args[1], () => {
              // 额外处理expr： {{person.name}} -- {{person.age}}
              // 还要重新处理newVal
              this.updater.textUpdater(node, this.getContentVal(expr, vm));
            });
            return this.getVal(args[1], vm)
        })
    } else {
        value = this.getVal(expr, vm);
    }
    this.updater.textUpdater(node, value);
  },
  html(node, expr, vm) {
    const value = this.getVal(expr, vm);
    // 绑定观察者，将来数据发生变化 出发这里的回调 进行更新
    new Watcher(vm, expr, newVal => {
        this.updater.htmlUpdater(node, newVal);
    })
    this.updater.htmlUpdater(node, value);
  },
  model(node, expr, vm) {
    const value = this.getVal(expr, vm);
    // 绑定更新函数 数据=>驱动视图
    new Watcher(vm, expr, (newVal) => {
      this.updater.modelUpdater(node, newVal);
    });
    // 视图 => 数据 => 视图
    node.addEventListener('input', e => {
        // 设置值
        this.setVal(expr, vm, e.target.value);
    })
    this.updater.modelUpdater(node, value);
  },
  on(node, expr, vm, eventName) {
    // 获取事件名， 从method里面取函数
    let fn = vm.$options.methods && vm.$options.methods[expr];
    node.addEventListener(eventName, fn.bind(vm), false)
  },
  bind(node, expr, vm, attrName) {
      // 类似on。。。
  },
  // 更新的函数
  updater: {
    textUpdater(node, value) {
      node.textContent = value;
    },
    htmlUpdater(node, value) {
      node.innerHTML = value;
    },
    modelUpdater(node, value){
      node.value = value;
    }
  },
};
class Compile {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;
    // 获取文档碎片对象 放入内存中会减少页面的回流和重绘
    const fragment = this.node2Fragment(this.el);
    // 编译模板
    this.compile(fragment);

    // 追加子元素到根元素
    this.el.appendChild(fragment);
  }
  compile(fragment) {
    // 获取子节点
    const childNodes = fragment.childNodes;
    [...childNodes].forEach((child) => {
      if (this.isElementNode(child)) {
        // 是元素节点
        // 编译元素节点
        // console.log("元素节点",child);
        this.compileElement(child);
      } else {
        // 是文本节点
        // 编译文本节点
        // console.log("文本节点", child);
        this.compileText(child);
      }

      // 一层一层递归遍历
      if (child.childNodes && child.childNodes.length) {
        this.compile(child);
      }
    });
  }
  compileElement(node) {
    const attributes = node.attributes;
    [...attributes].forEach((attr) => {
      const { name, value } = attr;
      if (this.isDirective(name)) {
        // 是一个指令 v-text v-html v-model v-on:click
        const [, directive] = name.split("-"); // text html model on:click
        const [dirName, eventName] = directive.split(":"); // text html model on
        // 更新数据 数据驱动视图
        compileUtil[dirName](node, value, this.vm, eventName);

        // 删除有指令标签上的属性
        node.removeAttribute("v-" + directive);
      } else if (this.isEventName(name)) {
        // @click='handleClick'
        let [, eventName] = name.split('@');
        compileUtil["on"](node, value, this.vm, eventName);
      }
    });
  }
  compileText(node) {
    // {{}} v-text
    const content = node.textContent;

    if (/\{\{(.+?)\}\}/.test(content)) {
      compileUtil["text"](node, content, this.vm);
    }
  }
  isEventName(attrName) {
    return attrName.startsWith("@");
  }
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }
  node2Fragment(el) {
    // 创建文档碎片对象
    const f = document.createDocumentFragment();
    // 递归放入
    let firstChild;
    while ((firstChild = el.firstChild)) {
      f.appendChild(firstChild);
    }
    return f;
  }
  isElementNode(node) {
    return node.nodeType === 1;
  }
}
class MVue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;

    if (this.$el) {
      // 1、实现一个数据观察者
      new Observer(this.$data);
      // 2、实现一个指令观察者
      new Compile(this.$el, this);
      this.proxyData(this.$data);
    }
  }
  proxyData(data) {
      for(const key in data) {
          Object.defineProperty(this, key, {
              get() {
                  return data[key]
              },
              set(newVal) {
                data[key] = newVal;
              }
          })
      }
  }
}
