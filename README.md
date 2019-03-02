# queue-system

JavaScript tasks queuing system.

Currently it should be treated as undocumented library for personal use. API may change.

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

## To be done

- get queue position
- notify on queue position change
- option to cancel ongoing tasks on destroy
- documentation with a lot of examples
- add "is finished" to task (successfully resolved)
- distinguish tasks status between "is requested to cancel" and "is cancelled" (not doing anything anymore)
- better api to force start task (should not require argument)
- retries support? move to end of the queue before retry? do nothing until retry timeout passes?
- massive code cleanup? 

## License

MIT
