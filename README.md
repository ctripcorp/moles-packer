# moles-packer
moles-packer 是由携程框架团队研发的，与携程moles框架配套使用的React Native 打包和拆包工具，同时支持原生的 React Native 项目。

## 安装

```
#从npm仓库中安装。

npm install -g moles-packer
```

## 获取帮助信息

```
moles-packer --help

```

##	使用

```

#在React Native项目根目录下执行命令

moles-packer --input /path/to/project --entry index.ios.js --output /path/to/build --bundle bu.bundle --common true

# 参数说明：
# input:项目目录（默认为当前目录）
# entry:入口文件名称（默认为 index.js）
# output:输出目录（默认为 ./build 目录）
# bundle:默认输出文件名称与入口文件同名，也可指定文件名
# common:是否打common包（默认为false）


```

##Demo运行

```
#以iOS为例

1、git clone git@github.com:ctrip-moles/moles-packer.git

2、cd moles-packer/demo/AwesomeProject

3、npm install

4、moles-packer --input ./ --entry index.ios.js --output ./build --bundle bu.jsbundle --common true
 
5、将build目录添加到项目中

6、react-native run-ios

```

##欢迎加入我们

![](./qrcode.jpg)

## TS邮箱组

<ctrip-moles@ctrip.com>



`源码近期会放出，各位敬请期待哦。`

