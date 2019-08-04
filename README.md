# queue-system

JavaScript tasks queuing system.

Currently it should be treated as undocumented library for personal use. API ~~may~~ will change.

## Features

- allows running tasks one by one
- allows running multiple tasks with defined concurrency
- allows changing concurrency as needed while running
- allows force start of a task
- allows to add task at any place in the queue
- allows to cancel tasks (tasks will know about that and can stop their job to save resources)
- emits events allowing to track queue progress
- has simple api
- is fully unit tested

## To be done / roadmap

> Target version may change.

### 1.2
- option to cancel ongoing tasks on destroy
- task itself should have queue position event to listen on

### 1.3
- add "is finished" to task (successfully resolved)
- distinguish tasks status between "is requested to cancel" and "is cancelled" (not doing anything anymore)

### 2.0
- better api to force start task (should not require argument)
- massive code cleanup? 

### ?
- retries support? move to end of the queue before retry? do nothing until retry timeout passes?

## License

MIT
