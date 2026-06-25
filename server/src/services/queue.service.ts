type Job = () => Promise<void>;

const queue: Job[] = [];
let processing = false;

const JOB_TIMEOUT = 120000;
const MAX_QUEUE_SIZE = 50;

function scheduleNext() {
  if (queue.length === 0 || processing) return;
  processing = true;
  const job = queue.shift()!;
  const timedOut = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("Job timed out")), JOB_TIMEOUT)
  );
  Promise.race([Promise.resolve(job()), timedOut])
    .catch((err) => {
      console.error("Queue job failed:", err.message);
    })
    .finally(() => {
      processing = false;
      scheduleNext();
    });
}

export function enqueue(job: Job) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn("Queue full, dropping job");
    return;
  }
  queue.push(job);
  scheduleNext();
}
