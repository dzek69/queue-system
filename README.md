# queue-system

JavaScript tasks queuing system.

## Features

- allows running tasks one by one
- allows running multiple tasks with defined concurrency
- allows changing concurrency as needed while running
- allows force start of a task
- allows adding task at any place in the queue
- allows cancelling tasks (tasks will know about that and can stop their job to save resources)
- emits events allowing tracking queue progress
- has simple api
- is fully unit tested
- TS support

## Documentation

See here: https://dzek69.github.io/queue-system

## To be done / roadmap

### Soon
- option to cancel ongoing tasks on destroy
- task itself should have queue position event to listen on

### Later
- add "is finished" method to task (successfully resolved)
- distinguish tasks status between "is requested to cancel" and "is cancelled" (not doing anything anymore)

### Even later
- (internal) code cleanup?

### Far future
- retries support? move to end of the queue before retry? do nothing until retry timeout passes?

## License

MIT
