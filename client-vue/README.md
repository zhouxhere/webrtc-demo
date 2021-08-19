# client-vue

webrtc 客户端 vue 实现 client demo

问题：navigator.mediaDevices 需要在https下 （ localhost 除外）

1. 调试时可修改 vue.config.js 中 devServer https，但是后端也需要修改为 https
2. chrome 浏览器 设置 chrome://flags，Insecure origins treated as secure，启用填入ip即可

## Project setup

```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
