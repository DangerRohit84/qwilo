type Job = () => Promise<void>;

const queue: Job[] = [];
let processing = false;

const JOB_TIMEOUT = 120000;

function scheduleNext() {
  if (queue.length === 0 || processing) return;
  processing = true;
  const job = queue.shift()!;
  const timedOut = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("Job timed out")), JOB_TIMEOUT)
  );
  Promise.race([Promise.resolve(job()), timedOut]).finally(() => {
    processing = false;
    scheduleNext();
  });
}

export function enqueue(job: Job) {
  queue.push(job);
  scheduleNext();
}
