#   Change Log

Since 2016-07-05 (version 0.2.0), all notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

In this document, "*Packer*" is used as the representation of *Moles Packer*.

##  [0.3.0] - 2016-07-23

### Fixed

Prior to this release, the *Packer* will not re-generate common bundle in API mode.

### Added

Other than v0.28.0-rc0, more versions of *React Native* will be supported by the *Packer*:
*   0.28.0-rc0
*   0.28.0
*   0.29.0
*   0.30.0-rc0
*   0.30.0

### Changed

*   primal command name returns  
    At first, the binary name of *Packer* is the same to its module name *moles-packer*. In version 2.0.0, *moles-pack* is used as the replacement. As a verb, "pack" is more suitable for a command than "packer" which is a noun. However, the new name violated the custom for NPM that the binary name should be in accordance with the module's name and puzzled users. So, since this release, the primal command name returns.

*   source map used on extracting common metadata  
    In order to understand the output of ```react-native bundle``` accurately, in this version, we try a method different from "reading code". This is one of the key steps for the *Packer* to support more *React Native* projects initiated with different ```--version``` options.

*   new metadata format used  
    Prior to this version, the common metadata contains only the names of common modules. It looks like this：
    ```javascript
    {
        "react": "12",
        "react/react.js": "12",
        /* ... */
    }
    ```
    In this version, it contains more infomation about common modules including alias and version. It looks like this:
    ```javascript
    [
        {
            "version": "15.2.1",
            "names": [
                "react/react.js",
                "react/react",
                "react"
            ],
            "shortname": "react",
            "ios": "12",
            "android": "12",
            "id": "zRZlxKRg+Luuut41bdVP6A"
        },
        /* ... */
    ]
    ```
    You may find common metadata file in the sub directory named *moles.common* of output directory.

##  [0.2.1] - 2016-07-08

### Fixed

Prior to this version, no matter how many times the API ```require('moles-packer')(options)``` is invoked and no matter how ```options``` changed, the *Packer* always do the same thing as if the ```options``` passed through never changed. e.g.,
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
