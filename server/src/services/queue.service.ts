type Job = () => Promise<void>;

const queue: Job[] = [];
let processing = false;

function scheduleNext() {
  if (queue.length === 0 || processing) return;
  processing = true;
  const job = queue.shift()!;
  job().finally(() => {
    processing = false;
    scheduleNext();
  });
}

export function enqueue(job: Job) {
  queue.push(job);
  scheduleNext();
}
