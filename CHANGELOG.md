All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [UNRELEASED]
### Dev
- deps bump
- tests code cleanup
### Fixed
- assigning undefined as data shouldn't happen

## [3.0.2] - 2021-07-06
### Fixed
- typings not detecting return type for tasks
### Dev
- deps bump, tslib update
### Changed
- some tutorial updates

## [3.0.1] - 2021-02-22
### Fixed
- properly queuing non-Promise but thenable tasks (broken in 3.0.0)

## [3.0.0] - 2021-02-15
### Added
- TypeScript support
### Changed
- default export relaced with named export

## [2.0.0] - 2020-05-16
### Changed
- native esm is now used

## [1.1.4] - 2019-08-29
### Changed
- updated dependencies

## [1.1.3] - 2019-08-04
### Changed
- updated dependencies

## [1.1.2] - 2019-08-04
### Fixed
- force-starting cancelled task isn't allowed anymore
### Changed
- expanded and corrected documentation tutorials

## [1.1.1] - 2019-06-07
### Fixed
- jsdoc documentation
- audit warnings
### Added
- documentation tutorials

## [1.1.0] - 2019-03-03
### Added
- jsdoc documentation
- blocking task running if task belongs to instance of queue that is destroyed
- passing related data when adding tasks, used to filter tasks
- possibility to get all tasks from queue
- possibility to filter tasks from queue
- exported EVENTS object with list of supported events
- cancelling group of tasks by predicate
- ability to get task position in the queue
- ability to check if task is currently running
- event emitting queue order when

### Changed
- transpiling options, now transpiled code is for environments used by at least 3% of people

### Fixed
- task method was getting executed even if was cancelled before starting

## [1.0.2] 2018-11-25
### Fixed
- sync tasks support

### Added
- aliases for event (un)registering
- "once" event
- cancelling task support

### Changed
- README updated to contain basic info about what this library is, current features and expected "todo" features

## [1.0.1] 2018-10-23
### Added
- actual first working version of the library

## [1.0.0] 2018-10-19
### Added
- empty library uploaded to be sure name is free and available
