# moles-packer

当前版本`0.1.3`

[github地址](https://github.com/ctripcorp/moles-packer/)

[npm地址](https://www.npmjs.com/package/moles-packer)


moles-packer 是由携程框架团队研发的，与携程moles框架配套使用的React Native 打包和拆包工具，同时支持原生的 React Native 项目。

## 安装

从npm仓库中安装

```
npm install -g moles-packer
```

## 获取帮助信息

```
moles-packer --help

```

##	使用

在React Native项目根目录下执行命令

```
moles-packer 
	--input /path/to/project 
	--entry index.ios.js 
	--output /path/to/build 
	--bundle bu.bundle 
	--common true
```
参数说明：

+	input:项目目录（默认为当前目录）
+	entry:入口文件名称（默认为 index.js）
+	output:输出目录（默认为 ./build 目录）
+	bundle:默认输出文件名称与入口文件同名，也可指定文件名
+	common:是否打common包（默认为false）

## Demo运行

以iOS为例

```
1、git clone git@github.com:ctrip-moles/moles-packer.git

2、cd moles-packer/demo/AwesomeProject

3、npm install

4、moles-packer 
	--input ./ --entry index.ios.js 
	--output ./build 
	--bundle bu.jsbundle 
	--common true

执行完上述命令后，会看到在根目录下生成一个build文件夹，且里面有bu.jsbundle和common.jsbundle两个文件

5、将build目录添加到项目中

6、执行react-native run-ios

```

## 已完成功能

1、支持react、react-native打成common.jsbundle

2、支持除react、react-native意外的业务代码打成bu.jsbundle

## 带完成功能

1、common bundle的生成可配置

2、业务模块拆成多个bundle模块

3、iOS支持load和merge拆包模块提供

4、Android支持load和merge拆包模块提供


## 资讯

Hello 各位小伙伴，很高兴的告诉大家，我们的moles-packer即将推出0.2.0版本，该版本的API将会调整为更符合大家习惯的格式，如下：

```
//入口文件夹
input:"",
//出口文件夹
output:"",
//路径简写
paths:{
  "common":"./common.jsbundle",
  "foo/bar/bip":"foo/bar/bip/index.js",
  "foo/bar/bop":"foo/bar/bop/main.js",
  "foo/bar/bee":"foo/bar/bee/index.json",
  "react":"react",
  "react-natve":"react-native":
},
//通用模块
common:{
     name: "common",
     include: ["react","react-native"]
 },
//业务模块，打包时会自动将common中的所有模块过滤掉
business: [

  {
       name: "foo/bar/bip",
       exclude: [
           "foo/bar/bop"
       ]
   },
   {
        name: "foo/bar/bop",
        include: [
            "foo/bar/bee"
        ]
    }

 ],
//是否为开发环境，开发环境则不惊进行压缩，且可以输出日志
dev:
```
## 更新日志

+	0.1.1版本

+	0.1.2版本

		1、有用户放映每次会在RNProjec下产生“__moles_common.js”的，该版本修复此问题
		2、添加后续开放的功能信息
		

+	0.1.3版本

		1、修改readme.md，添加一些资讯信息





## 欢迎加入我们

![](https://github.com/ctripcorp/moles-packer/raw/master/qrcode.jpg)

## TS邮箱组

<ctrip-moles@ctrip.com>



~~`源码近期会放出，各位敬请期待哦。`~~

`源码以放出，为source目录`

