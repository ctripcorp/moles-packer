#   Moles Packer

![Join the chat at https://gitter.im/ctripcorp/moles-packer](https://badges.gitter.im/ctripcorp/moles-packer.svg)](https://gitter.im/ctripcorp/moles-packer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

__Moles Packer__ is a light-weighted builder for *React Native* projects. You can create bundle(s), including a common (basic) bundle and one or more business bundles, from a standard React Native proejct. If pre-built common bundle supplied, you can also create business bundle from a stripped project (without ```ios```, ```android```, ```node_modules``` etc.).

*Moles Packer* is one of the key members in the [__Moles__](https://ctrip-moles.github.io)'s tool chain.

Together with growing *React Native*, *Moles Packer* is also under continuous development and improvement, see [ChangeLog](CHANGELOG.md) for more details.

##  React Native Versions Supported

*   0.28.0-rc0
*   0.28.0
*   0.29.0
*   0.30.0-rc0
*	0.37.0 \*

\* means this version got limited support.

##	Install

[![NPM](https://nodei.co/npm/moles-packer.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/moles-packer/)

```bash
# install globally
npm install -g moles-packer

# command created
moles-packer -v
moles-packer-common -v
```

##	Run In CLI

```bash
# create an
react-native init rn28 --version 0.28.0

# build the project by Moles Packer
moles-packer \
	--input ./rn28 \
	--entry index.ios.js \
	--output ./build \
	--bundle \
    --verbose
```

##	Node.js API

```javascript
var mp = require('moles-packer');
var options = {
    'input'   : './rn28',
    'entry'   : 'index.ios.js',
    'output'  : './build',
    'bundle'  : true
    };
mp.pack(options, function(err) {
    // !err means build success.
});
```

##	User Manual

*	[Moles Unprofessional Guide](https://youngoat.gitbooks.io/moles-unprofessional-guide/content/en/)
*	[Moles 非权威指南](https://youngoat.gitbooks.io/moles-unprofessional-guide/content/zh-cn/)

##	About Us

__Moles__ is developed and maintained by Framework R&D from [ctrip.com](http://www.ctrip.com/).

Any questions, please send mail to <ctrip-moles@ctrip.com>.

Welcome to follow us in WeChat:  
![CtripMoles](./qrcode.jpg)
