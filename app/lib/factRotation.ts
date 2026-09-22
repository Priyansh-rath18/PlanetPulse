/*
 * Shuffle + rotation logic for the Carbon Discoveries widget.
 * Pure functions - no React, no timers - so the sequencing is easy
 * to reason about independent of the component that drives it.
 */

/* Fisher-Yates - a proper shuffle, not repeated random-index picks. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/*
 * A fresh shuffled cycle. If the previous cycle's last item would
 * land first in the new one, swap it elsewhere so a reshuffle never
 * produces an immediate consecutive repeat at the boundary.
 */
export function nextCycle<T>(items: T[], avoidFirst?: T): T[] {
  const queue = shuffle(items);

  if (
    avoidFirst !== undefined &&
    queue.length > 1 &&
    queue[0] === avoidFirst
  ) {
    const swapWith = 1 + Math.floor(Math.random() * (queue.length - 1));
    [queue[0], queue[swapWith]] = [queue[swapWith], queue[0]];
  }

  return queue;
}

export const RECENT_IDS_LIMIT = 5;

export type RotationState = {
  queue: string[];
  cursor: number;
  recentFactIds: string[];
};

export function createRotation(allIds: string[]): RotationState {
  const queue = shuffle(allIds);

  return {
    queue,
    cursor: 0,
    recentFactIds: [queue[0]],
  };
}

export function advanceRotation(
  state: RotationState,
  allIds: string[]
): RotationState {
  let { queue, cursor } = state;

  cursor += 1;

  if (cursor >= queue.length) {
    /* Pool exhausted - reshuffle and start a new cycle. */
    queue = nextCycle(allIds, queue[queue.length - 1]);
    cursor = 0;
  }

  const nextId = queue[cursor];

  return {
    queue,
    cursor,
    recentFactIds: [nextId, ...state.recentFactIds].slice(
      0,
      RECENT_IDS_LIMIT
    ),
  };
}

export function currentFactId(state: RotationState): string {
  return state.queue[state.cursor];
}
