#   Change Log

Since 2016-07-05 (version 0.2.0), all notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

##  [0.2.0] - 2016-07-05

### Added
[CHANGELOG.md](./CHANGELOG.md) added.

### Changed
By *Moles Pakcer*, the built-in command ```bundle``` of *react-native-cli* is used to create common bundle. In this version, we turned off the switch ```--dev``` when creating common bundle. The size of basic common bundle (whitout any other modules packed except *react* and *react-native*) will be reduced by about 100KB before gzipped.
