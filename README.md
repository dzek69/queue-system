# queue-system

Powerful yet simple JavaScript/TypeScript tasks queuing system.

## Features

- 🛠️ full TypeScript support
- 1️⃣ run tasks one by one or many of them at the same time with defined concurrency
- 🏎️ change concurrency as you need, pause and unpause the queue
- ➕ insert task at any position in the queue, put important tasks first or...
- 💪 ...force start additional task
- 🛑 cancel tasks, even running ones
- 👀 events support to monitor your queue
- 👶 simple API
- ✔️ fully unit tested

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
