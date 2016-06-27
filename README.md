#	What is it?

__Moles Packer__ is a light-weighted builder for React Native projects. You can create bundle(s), including a common (basic) bundle and one or more business bundles, from a standard React Native proejct. If pre-built common bundle supplied, you can also create business bundle from a stripped project (without ```ios```, ```android```, ```node_modules``` etc.).

__Moles Packer__ is one of the key members in the __Moles__'s tool chain.

#	Install

```bash
# install globally
npm install -g moles-packer

# command created
moles-pack -v
moles-pack-common -v
```

#	Run In CLI

```bash
# create an
react-native init rn26

# build the project by Moles Packer
moles-pack \
	--input ./rn26 \
	--entry index.ios.js \
	--output ./build \
	--bundle
```

#	Node.js API

```javascript
var mp = require('moles-packer');
var options = {
    'input'         : './rn26',
    'entry'         : 'index.ios.js',
    'output'        : './build',
    'bundle'        : true,
    'common-bundle' : true
    };
mp.pack(options, function(err) {
    // !err means build success.
});
```

#	User Manual

*	[Moles Unprofessional Guide](https://youngoat.gitbooks.io/moles-unprofessional-guide/content/en/)
*	[Moles 非权威指南](https://youngoat.gitbooks.io/moles-unprofessional-guide/content/zh-cn/)

#	About Us

__Moles__ is developed and maintained by Framework R&D from [ctrip.com](http://www.ctrip.com/).

Any questions, please send mail to <ctrip-moles@ctrip.com>.

Welcome to follow us in WeChat:  
![CtripMoles](./qrcode.jpg)
