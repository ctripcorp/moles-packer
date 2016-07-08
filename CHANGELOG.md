#   Change Log

Since 2016-07-05 (version 0.2.0), all notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

##  [0.2.1] - 2016-07-08

### Fixed

Before this version, no matter how many times the API ```require('moles-packer')(options)``` is invoked and no matter how ```options``` changed, the *Packer* always do the same thing as if the ```options``` passed through never changed. e.g.,
```javascript
var mp = require('moles-packer');

var options = { /* ... */ };
mp.pack(options).the(function() {
    options = { /* ... */ };

    mp.pack(options);
    // UNEXPECTED.
    // The new "options" is ineffective.
});
```
This bug has been fixed by this version.

### Changed
*   Help info (display on option ```--help``` or ```-h```) improved.
*   By default, while not ```--entry``` option provided, *Moles Packer* will take *index.js* as the entry file. In this version, *index.${platform}.js*  will be taken into consideration if *index.js* not found.

##  [0.2.0] - 2016-07-05

### Added
[CHANGELOG.md](./CHANGELOG.md) added.

### Changed
By *Moles Pakcer*, the built-in command ```bundle``` of *react-native-cli* is used to create common bundle. In this version, we turned off the switch ```--dev``` when creating common bundle. The size of basic common bundle (whitout any other modules packed except *react* and *react-native*) will be reduced by about 100KB before gzipped.

---
This CHANGELOG.md follows [*Keep a CHANGELOG*](http://keepachangelog.com/).
